/**
 * T7.2: /api/trending route
 * Returns trending videos with trend classification (emerging/stable/declining)
 */

import { type NextRequest, NextResponse } from "next/server";
import type { Video, Channel, TrendData } from "@/types";
import { createYouTubeService } from "@/lib/services/youtube";
import { createQuotaService } from "@/lib/services/quota";
import { env } from "@/lib/env";
import prisma from "@/lib/db";

type TrendPeriod = "24h" | "7d" | "30d";

interface TrendingTrends {
	emerging: Video[];
	stable: Video[];
	declining: Video[];
}

/**
 * Validate period parameter
 */
function isValidPeriod(period: string | null): period is TrendPeriod {
	return period === "24h" || period === "7d" || period === "30d";
}

/**
 * Classify video into trend category based on engagement metrics
 * - Emerging: High engagement ratio, recent upload
 * - Stable: Consistent engagement over time
 * - Declining: Lower engagement ratio, older content
 */
function classifyVideo(
	video: Video,
	avgViews: number,
): "emerging" | "stable" | "declining" {
	const views = video.viewCount || 0;
	const likes = video.likeCount || 0;
	const comments = video.commentCount || 0;

	// Calculate engagement ratio
	const engagement = likes + comments * 2; // Comments weighted higher
	const engagementRatio = views > 0 ? engagement / views : 0;

	// Calculate views ratio vs average
	const viewsRatio = avgViews > 0 ? views / avgViews : 0;

	// Calculate age factor (newer = potentially emerging)
	const publishedAt = new Date(video.publishedAt);
	const daysOld = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);

	// Classification logic
	if (engagementRatio > 0.1 && viewsRatio > 0.8 && daysOld < 3) {
		return "emerging";
	}
	if (engagementRatio > 0.05 && viewsRatio > 0.5) {
		return "stable";
	}
	return "declining";
}

/**
 * Extract keywords from video titles and tags
 */
function extractKeywords(videos: Video[]): string[] {
	const keywordMap = new Map<string, number>();
	const stopWords = new Set([
		"the",
		"a",
		"an",
		"and",
		"or",
		"but",
		"in",
		"on",
		"at",
		"to",
		"for",
		"of",
		"with",
		"by",
		"from",
		"is",
		"are",
		"was",
		"were",
		"be",
		"been",
		"being",
		"have",
		"has",
		"had",
		"do",
		"does",
		"did",
		"will",
		"would",
		"could",
		"should",
		"may",
		"might",
		"must",
		"can",
		"this",
		"that",
		"these",
		"those",
		"i",
		"you",
		"he",
		"she",
		"it",
		"we",
		"they",
		"what",
		"which",
		"who",
		"when",
		"where",
		"why",
		"how",
		"all",
		"each",
		"every",
		"both",
		"few",
		"more",
		"most",
		"other",
		"some",
		"such",
		"no",
		"nor",
		"not",
		"only",
		"own",
		"same",
		"so",
		"than",
		"too",
		"very",
		"just",
	]);

	// Extract from titles
	for (const video of videos) {
		const words = video.title
			.toLowerCase()
			.replace(/[^\w\s]/g, " ")
			.split(/\s+/)
			.filter((word) => word.length > 2 && !stopWords.has(word));

		for (const word of words) {
			keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
		}

		// Extract from tags
		if (video.tags) {
			for (const tag of video.tags) {
				const tagWords = tag.toLowerCase().split(/\s+/);
				for (const word of tagWords) {
					if (word.length > 2 && !stopWords.has(word)) {
						keywordMap.set(word, (keywordMap.get(word) || 0) + 2);
					}
				}
			}
		}
	}

	// Sort by frequency and return top keywords
	const sortedKeywords = Array.from(keywordMap.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 20)
		.map(([keyword]) => keyword);

	return sortedKeywords;
}

/**
 * Extract and aggregate top channels from video list
 */
function extractChannels(videos: Video[]): Channel[] {
	const channelMap = new Map<
		string,
		{ channel: Channel; totalViews: number; videoCount: number }
	>();

	for (const video of videos) {
		const existing = channelMap.get(video.channelId);
		if (existing) {
			existing.totalViews += video.viewCount || 0;
			existing.videoCount += 1;
		} else {
			channelMap.set(video.channelId, {
				channel: {
					id: video.channelId,
					title: video.channelTitle,
					thumbnailUrl: video.thumbnailUrl,
				},
				totalViews: video.viewCount || 0,
				videoCount: 1,
			});
		}
	}

	// Sort by total views and return top channels
	return Array.from(channelMap.values())
		.sort((a, b) => b.totalViews - a.totalViews)
		.slice(0, 10)
		.map((item) => ({
			...item.channel,
			videoCount: item.videoCount,
		}));
}

/**
 * Filter videos by time period
 */
function filterByPeriod(videos: Video[], period: TrendPeriod): Video[] {
	const now = Date.now();
	const periodMs: Record<TrendPeriod, number> = {
		"24h": 24 * 60 * 60 * 1000,
		"7d": 7 * 24 * 60 * 60 * 1000,
		"30d": 30 * 24 * 60 * 60 * 1000,
	};

	const cutoff = now - periodMs[period];

	return videos.filter((video) => {
		const publishedAt = new Date(video.publishedAt).getTime();
		return publishedAt >= cutoff;
	});
}

/**
 * GET /api/trending
 * Get trending videos with trend classification
 * Query params: category (required), country (required), period (24h|7d|30d)
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		// Validate required parameters
		const category = searchParams.get("category");
		if (!category) {
			return NextResponse.json(
				{ error: "category parameter is required" },
				{ status: 400 },
			);
		}

		const country = searchParams.get("country");
		if (!country) {
			return NextResponse.json(
				{ error: "country parameter is required" },
				{ status: 400 },
			);
		}

		// Validate period (default to 7d)
		const period = searchParams.get("period");
		if (period && !isValidPeriod(period)) {
			return NextResponse.json(
				{ error: "period must be one of: 24h, 7d, 30d" },
				{ status: 400 },
			);
		}

		const validPeriod: TrendPeriod = isValidPeriod(period) ? period : "7d";

		// Fetch trending videos from YouTube
		const youtubeService = createYouTubeService({
			apiKey: env.YOUTUBE_API_KEY,
		});

		const result = await youtubeService.getTrending(category, country);
		let videos = result.items;

		// Filter by period
		if (validPeriod !== "7d") {
			videos = filterByPeriod(videos, validPeriod);
		}

		// Calculate average views for classification
		const totalViews = videos.reduce((sum, v) => sum + (v.viewCount || 0), 0);
		const avgViews = videos.length > 0 ? totalViews / videos.length : 0;

		// Classify videos into trend categories
		const trends: TrendingTrends = {
			emerging: [],
			stable: [],
			declining: [],
		};

		for (const video of videos) {
			const classification = classifyVideo(video, avgViews);
			trends[classification].push(video);
		}

		// Extract keywords and top channels
		const keywords = extractKeywords(videos);
		const channels = extractChannels(videos);

		// Save TrendSnapshot to database
		const videoIds = videos.map((v) => v.id);
		await prisma.trendSnapshot.create({
			data: {
				categoryId: category,
				country: country,
				videoIds: JSON.stringify(videoIds),
			},
		});

		// Track quota usage
		const quotaService = createQuotaService();
		await quotaService.increment(result.quotaUsed);

		const response: TrendData = {
			trends,
			keywords,
			channels,
			quotaUsed: result.quotaUsed,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Trending error:", error);

		// Handle quota exceeded
		if (error instanceof Error && error.name === "QuotaExceededError") {
			return NextResponse.json(
				{ error: "Daily quota exceeded. Please try again tomorrow." },
				{ status: 429 },
			);
		}

		return NextResponse.json(
			{ error: "Failed to fetch trending data" },
			{ status: 500 },
		);
	}
}
