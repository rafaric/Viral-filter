/**
 * T6.4: GREEN — Watchlist CRUD API Route
 * Handles GET (list), POST (add), DELETE (remove) for channel watchlist
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createYouTubeService } from "@/lib/services/youtube";
import { env } from "@/lib/env";

/**
 * GET /api/channels
 * Returns list of channels in watchlist
 */
export async function GET() {
	try {
		const channels = await prisma.channelWatchlist.findMany({
			orderBy: { addedAt: "desc" },
		});

		return NextResponse.json(
			channels.map((ch) => ({
				id: ch.id,
				title: ch.title,
				description: ch.description,
				subscriberCount: ch.subscriberCount,
				videoCount: ch.videoCount,
				thumbnailUrl: ch.thumbnailUrl,
				addedAt: ch.addedAt.toISOString(),
				lastAnalyzed: ch.lastAnalyzed?.toISOString() || null,
			})),
		);
	} catch (error) {
		console.error("Error fetching watchlist:", error);
		return NextResponse.json(
			{ error: "Failed to fetch watchlist" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/channels
 * Add a channel to the watchlist
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { channelId } = body;

		if (!channelId) {
			return NextResponse.json(
				{ error: "Channel ID is required" },
				{ status: 400 },
			);
		}

		// Fetch channel info from YouTube
		const youtube = createYouTubeService({ apiKey: env.YOUTUBE_API_KEY });
		const channel = await youtube.getChannel(channelId);

		if (!channel) {
			return NextResponse.json(
				{ error: "Channel not found on YouTube" },
				{ status: 400 },
			);
		}

		// Add to watchlist
		const watchlistEntry = await prisma.channelWatchlist.upsert({
			where: { id: channelId },
			update: {
				title: channel.title,
				description: channel.description,
				subscriberCount: channel.subscriberCount,
				videoCount: channel.videoCount,
				thumbnailUrl: channel.thumbnailUrl,
			},
			create: {
				id: channel.id,
				title: channel.title,
				description: channel.description,
				subscriberCount: channel.subscriberCount,
				videoCount: channel.videoCount,
				thumbnailUrl: channel.thumbnailUrl,
			},
		});

		return NextResponse.json(
			{
				id: watchlistEntry.id,
				title: watchlistEntry.title,
				description: watchlistEntry.description,
				subscriberCount: watchlistEntry.subscriberCount,
				videoCount: watchlistEntry.videoCount,
				thumbnailUrl: watchlistEntry.thumbnailUrl,
				addedAt: watchlistEntry.addedAt.toISOString(),
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error adding channel to watchlist:", error);
		return NextResponse.json(
			{ error: "Failed to add channel to watchlist" },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/channels
 * Remove a channel from the watchlist
 */
export async function DELETE(request: Request) {
	try {
		const body = await request.json();
		const { channelId } = body;

		if (!channelId) {
			return NextResponse.json(
				{ error: "Channel ID is required" },
				{ status: 400 },
			);
		}

		// Remove from watchlist
		await prisma.channelWatchlist.delete({
			where: { id: channelId },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error removing channel from watchlist:", error);
		return NextResponse.json(
			{ error: "Failed to remove channel from watchlist" },
			{ status: 500 },
		);
	}
}