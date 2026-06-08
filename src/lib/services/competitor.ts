/**
 * T7.5: Competitor Service
 * Provides competitor analysis functionality
 */

import type { Video, Channel } from "@/types";
import { createYouTubeService } from "@/lib/services/youtube";
import { createCacheService } from "@/lib/services/cache";
import { buildCompetitorPrompt } from "@/lib/services/prompts";
import { env } from "@/lib/env";

export interface CompetitorStats {
	channelId: string;
	channelTitle: string;
	totalViews: number;
	avgViews: number;
	avgLikes: number;
	avgComments: number;
	totalVideos: number;
	growthRate: number; // percentage change in views over last 30 days
}

export interface CompetitorComparison {
	stats: CompetitorStats[];
	recommendations: string[];
	quotaUsed: number;
}

/**
 * Calculate competitor stats from videos
 */
function calculateStats(
	channelId: string,
	channelTitle: string,
	videos: Video[],
): CompetitorStats {
	const totalViews = videos.reduce((sum, v) => sum + (v.viewCount || 0), 0);
	const totalLikes = videos.reduce((sum, v) => sum + (v.likeCount || 0), 0);
	const totalComments = videos.reduce(
		(sum, v) => sum + (v.commentCount || 0),
		0,
	);
	const count = videos.length || 1;

	// Calculate growth rate (compare first half to second half of videos)
	const sortedVideos = [...videos].sort(
		(a, b) =>
			new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
	);
	const halfIndex = Math.floor(sortedVideos.length / 2);
	const recentVideos = sortedVideos.slice(0, halfIndex);
	const olderVideos = sortedVideos.slice(halfIndex);

	const recentAvgViews =
		recentVideos.length > 0
			? recentVideos.reduce((sum, v) => sum + (v.viewCount || 0), 0) /
				recentVideos.length
			: 0;
	const olderAvgViews =
		olderVideos.length > 0
			? olderVideos.reduce((sum, v) => sum + (v.viewCount || 0), 0) /
				olderVideos.length
			: 0;

	const growthRate =
		olderAvgViews > 0
			? ((recentAvgViews - olderAvgViews) / olderAvgViews) * 100
			: 0;

	return {
		channelId,
		channelTitle,
		totalViews,
		avgViews: Math.round(totalViews / count),
		avgLikes: Math.round(totalLikes / count),
		avgComments: Math.round(totalComments / count),
		totalVideos: count,
		growthRate: Math.round(growthRate * 10) / 10,
	};
}

/**
 * Generate AI recommendations based on competitor analysis
 */
async function generateRecommendations(
	competitors: CompetitorStats[],
): Promise<string[]> {
	// Simple heuristic-based recommendations (in production, would use AI)
	const recommendations: string[] = [];

	if (competitors.length === 0) {
		return recommendations;
	}

	// Find top performer
	const topPerformer = competitors.reduce(
		(best, current) => (current.avgViews > best.avgViews ? current : best),
		competitors[0],
	);

	// Find fastest growing
	const fastestGrowing = competitors.reduce(
		(best, current) => (current.growthRate > best.growthRate ? current : best),
		competitors[0],
	);

	// Generate recommendations
	if (topPerformer.avgViews > 100000) {
		recommendations.push(
			`Top performer ${topPerformer.channelTitle} averages ${(topPerformer.avgViews / 1000).toFixed(0)}K views. Consider adopting similar content strategies.`,
		);
	}

	if (fastestGrowing.growthRate > 20) {
		recommendations.push(
			`${fastestGrowing.channelTitle} shows ${fastestGrowing.growthRate.toFixed(1)}% growth rate. Analyze their recent content for emerging trends.`,
		);
	}

	// Average engagement recommendation
	const avgEngagementRate =
		competitors.reduce((sum, c) => {
			const rate =
				c.avgViews > 0 ? (c.avgLikes + c.avgComments * 2) / c.avgViews : 0;
			return sum + rate;
		}, 0) / competitors.length;

	if (avgEngagementRate > 0.05) {
		recommendations.push(
			"High engagement niche: Focus on content that drives likes and comments, not just views.",
		);
	} else if (avgEngagementRate < 0.02) {
		recommendations.push(
			"Low engagement niche: Consider differentiation strategies to stand out from competitors.",
		);
	}

	// Posting frequency recommendation
	const avgVideosPerCompetitor =
		competitors.reduce((sum, c) => sum + c.totalVideos, 0) / competitors.length;
	if (avgVideosPerCompetitor > 50) {
		recommendations.push(
			"Active niche: Consistent posting (multiple times per week) seems important for visibility.",
		);
	}

	return recommendations;
}

/**
 * Analyze competitors for a given channel or niche
 */
export async function analyzeCompetitors(
	channelIds: string[],
): Promise<CompetitorComparison> {
	const youtubeService = createYouTubeService({
		apiKey: env.YOUTUBE_API_KEY,
	});
	const cacheService = createCacheService();

	const stats: CompetitorStats[] = [];
	let totalQuotaUsed = 0;

	// Analyze each channel
	for (const channelId of channelIds) {
		try {
			// Get channel info
			const channel = await youtubeService.getChannel(channelId);
			if (!channel) continue;

			// Get recent videos
			const result = await youtubeService.getChannelVideos(channelId, {
				maxResults: 20,
			});

			totalQuotaUsed += result.quotaUsed;

			// Calculate stats
			const channelStats = calculateStats(
				channelId,
				channel.title,
				result.items,
			);
			stats.push(channelStats);

			// Cache videos
			for (const video of result.items) {
				await cacheService.setVideo(video);
			}
		} catch (error) {
			console.error(`Error analyzing channel ${channelId}:`, error);
		}
	}

	// Sort by total views
	stats.sort((a, b) => b.totalViews - a.totalViews);

	// Generate recommendations
	const recommendations = await generateRecommendations(stats);

	return {
		stats,
		recommendations,
		quotaUsed: totalQuotaUsed,
	};
}

/**
 * Compare specific channels side by side
 */
export async function compareChannels(channelIds: string[]): Promise<{
	channels: Channel[];
	comparison: CompetitorStats[];
}> {
	const youtubeService = createYouTubeService({
		apiKey: env.YOUTUBE_API_KEY,
	});

	const channels: Channel[] = [];
	const comparison: CompetitorStats[] = [];

	for (const channelId of channelIds) {
		const channel = await youtubeService.getChannel(channelId);
		if (channel) {
			channels.push(channel);

			const result = await youtubeService.getChannelVideos(channelId, {
				maxResults: 10,
			});

			comparison.push(calculateStats(channelId, channel.title, result.items));
		}
	}

	return { channels, comparison };
}

// Factory function
export function createCompetitorService() {
	return {
		analyzeCompetitors,
		compareChannels,
	};
}

export default {
	analyzeCompetitors,
	compareChannels,
	createCompetitorService,
};
