/**
 * T4.6: /api/analyze - AI Analysis SSE Route
 * Streaming endpoint for AI-powered video analysis
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import {
	createOpenCodeClient,
	AVAILABLE_MODELS,
	type ModelName,
} from "@/lib/services/aiclient";
import {
	buildIdeaPrompt,
	buildKeywordPrompt,
	buildCompetitorPrompt,
	buildOptimizePrompt,
	getSystemPrompt,
} from "@/lib/services/prompts";
import { createAICacheService } from "@/lib/services/aiCache";
import { createQuotaService } from "@/lib/services/quota";
import type { Video } from "@/types";

// Request validation schema
const analyzeRequestSchema = z.object({
	type: z.enum(["idea", "keyword", "competitor", "optimize"]),
	data: z.object({
		videos: z.array(z.any()).optional(),
		channelId: z.string().optional(),
		channelName: z.string().optional(),
		content: z
			.object({
				title: z.string().optional(),
				description: z.string().optional(),
				type: z.enum(["title", "description", "hook"]).optional(),
			})
			.optional(),
	}),
	model: z.string().optional(),
	outputFormat: z.enum(["text", "json"]).optional(),
});

// SSE encoder helper
function sseEncode(data: unknown): string {
	return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Generate content hash for cache key
 */
function generateContentHash(
	type: string,
	data: Record<string, unknown>,
): string {
	const content = JSON.stringify({ type, data });
	let hash = 0;
	for (let i = 0; i < content.length; i++) {
		const char = content.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(16);
}

/**
 * POST /api/analyze
 * Streaming SSE endpoint for AI analysis
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	// Parse and validate request body
	let body: z.infer<typeof analyzeRequestSchema>;
	try {
		const json = await request.json();
		body = analyzeRequestSchema.parse(json);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request", details: error.errors },
				{ status: 400 },
			);
		}
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	// Create services
	const cacheService = createAICacheService();
	const quotaService = createQuotaService();

	// Check quota
	const canProcess = await quotaService.canMakeRequest(10); // Cost: 10 units
	if (!canProcess) {
		return NextResponse.json(
			{ error: "Quota exceeded. Please try again later." },
			{ status: 429 },
		);
	}

	// Generate cache key
	const cacheKey = generateContentHash(body.type, body.data);

	// Check cache first
	const cachedResult = await cacheService.getAnalysis(cacheKey);
	if (cachedResult) {
		// Return cached result immediately
		const response = new NextResponse(
			sseEncode({ type: "chunk", content: cachedResult }) +
				sseEncode({ type: "done", result: cachedResult, cached: true }),
			{
				status: 200,
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				},
			},
		);
		return response;
	}

	// Create AI client
	const aiClient = createOpenCodeClient(env.OPENCODE_API_KEY);

	// Set model if specified
	if (body.model) {
		if (!AVAILABLE_MODELS.includes(body.model as ModelName)) {
			return NextResponse.json(
				{ error: `Invalid model. Available: ${AVAILABLE_MODELS.join(", ")}` },
				{ status: 400 },
			);
		}
		aiClient.setModel(body.model as ModelName);
	}

	// Build prompt based on type
	const systemPrompt = getSystemPrompt();
	let userPrompt: string;

	switch (body.type) {
		case "idea":
			userPrompt = buildIdeaPrompt((body.data.videos || []) as Video[]);
			break;
		case "keyword":
			userPrompt = buildKeywordPrompt((body.data.videos || []) as Video[]);
			break;
		case "competitor":
			userPrompt = buildCompetitorPrompt(
				body.data.channelId || "",
				body.data.channelName || "Unknown Channel",
				(body.data.videos || []) as Video[],
			);
			break;
		case "optimize":
			userPrompt = buildOptimizePrompt(
				body.data.content ?? { type: "title" as const },
				{ channelName: body.data.channelName },
			);
			break;
		default:
			return NextResponse.json(
				{ error: "Invalid analysis type" },
				{ status: 400 },
			);
	}

	// Build messages for AI
	const messages = [
		{ role: "system" as const, content: systemPrompt },
		{ role: "user" as const, content: userPrompt },
	];

	// Create SSE stream response
	const encoder = new TextEncoder();
	let fullContent = "";

	const stream = new ReadableStream({
		async start(controller) {
			try {
				// Stream chunks to client
				for await (const chunk of aiClient.streamChat(messages)) {
					fullContent += chunk;
					controller.enqueue(
						encoder.encode(sseEncode({ type: "chunk", content: chunk })),
					);
				}

				// Send done event
				controller.enqueue(
					encoder.encode(
						sseEncode({
							type: "done",
							result: fullContent,
							cached: false,
						}),
					),
				);

				// Increment quota
				await quotaService.increment(10);

				// Cache the result asynchronously
				cacheService.setAnalysis(cacheKey, fullContent).catch(() => {
					// Silently fail cache write
				});
			} catch (error) {
				// Send error event
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				controller.enqueue(
					encoder.encode(sseEncode({ type: "error", message: errorMessage })),
				);
			} finally {
				controller.close();
			}
		},
	});

	return new NextResponse(stream, {
		status: 200,
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
