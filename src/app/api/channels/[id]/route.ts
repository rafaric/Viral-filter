/**
 * T6.2: GREEN → REFACTOR — Channel Detail API Route
 * Returns channel info, stats (avgViews, avgLikes, totalVideos), and recent videos
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createCacheService } from "@/lib/services/cache";
import { createYouTubeService } from "@/lib/services/youtube";
import { env } from "@/lib/env";
import type { Video } from "@/types";

const RECENT_VIDEOS_LIMIT = 10;

interface RouteContext {
	params: Promise<{ id: string }>;
}

/**
 * Calculate stats from videos
 */
function calculateStats(videos: Video[]) {
	if (videos.length === 0) {
		return { avgViews: 0, avgLikes: 0, totalVideos: 0 };
	}

	const totalViews = videos.reduce((sum, v) => sum + (v.viewCount || 0), 0);
	const totalLikes = videos.reduce((sum, v) => sum + (v.likeCount || 0), 0);

	return {
		avgViews: Math.round(totalViews / videos.length),
		avgLikes: Math.round(totalLikes / videos.length),
		totalVideos: videos.length,
	};
}

/**
 * GET /api/channels/[id]
 * Returns channel details with stats and recent videos
 */
export async function GET(_request: Request, context: RouteContext) {
	try {
		const { id } = await context.params;

		if (!id) {
			return NextResponse.json(
				{ error: "Channel ID is required" },
				{ status: 400 },
			);
		}

		// Get channel from YouTube API
		const youtube = createYouTubeService({ apiKey: env.YOUTUBE_API_KEY });
		const channel = await youtube.getChannel(id);

		if (!channel) {
			return NextResponse.json({ error: "Channel not found" }, { status: 404 });
		}

		// Check if channel is in watchlist
		const watchlistEntry = await prisma.channelWatchlist.findUnique({
			where: { id },
		});

		// Try to get cached videos for this channel
		const cache = createCacheService();
		const cachedDbVideos = await prisma.videoCache.findMany({
			where: { channelId: id },
			orderBy: { publishedAt: "desc" },
			take: RECENT_VIDEOS_LIMIT,
		});

		let recentVideos: Video[] = cachedDbVideos.map((v) => ({
			id: v.id,
			title: v.title,
			description: v.description || undefined,
			channelId: v.channelId,
			channelTitle: v.channelTitle,
			publishedAt: v.publishedAt.toISOString(),
			viewCount: v.viewCount || undefined,
			likeCount: v.likeCount || undefined,
			commentCount: v.commentCount || undefined,
			thumbnailUrl: v.thumbnailUrl || undefined,
		}));

		let cached = recentVideos.length > 0;

		// If no cached videos, fetch from YouTube
		if (recentVideos.length === 0) {
			const channelVideos = await youtube.getChannelVideos(id, {
				maxResults: RECENT_VIDEOS_LIMIT,
			});
			recentVideos = channelVideos.items;
			cached = false;

			// Cache the fetched videos
			for (const video of channelVideos.items) {
				await cache.setVideo(video);
			}
		}

		// Calculate stats
		const stats = calculateStats(recentVideos);

		return NextResponse.json({
			id: channel.id,
			title: channel.title,
			description: channel.description,
			subscriberCount: channel.subscriberCount,
			videoCount: channel.videoCount,
			thumbnail: channel.thumbnailUrl,
			stats,
			recentVideos,
			cached,
			lastAnalyzed: watchlistEntry?.lastAnalyzed?.toISOString() || null,
		});
	} catch (error) {
		console.error("Error fetching channel:", error);
		return NextResponse.json(
			{ error: "Failed to fetch channel details" },
			{ status: 500 },
		);
	}
}
