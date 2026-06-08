/**
 * T7.6: Trend History Service
 * Handles TrendSnapshot data retrieval and aggregation
 */

import prisma from "@/lib/db";
import type { Video } from "@/types";

export interface TrendSnapshotRecord {
	id: string;
	categoryId: string;
	country: string;
	capturedAt: Date;
	videoIds: string[];
}

export interface TrendHistoryItem {
	snapshot: TrendSnapshotRecord;
	videoCount: number;
	topVideos: Video[];
}

export interface TrendHistoryFilter {
	categoryId?: string;
	country?: string;
	startDate?: Date;
	endDate?: Date;
	limit?: number;
}

/**
 * Get trend snapshots with optional filters
 */
export async function getTrendSnapshots(
	filters: TrendHistoryFilter = {},
): Promise<TrendSnapshotRecord[]> {
	const where: Record<string, unknown> = {};

	if (filters.categoryId) {
		where.categoryId = filters.categoryId;
	}

	if (filters.country) {
		where.country = filters.country;
	}

	if (filters.startDate || filters.endDate) {
		where.capturedAt = {};
		if (filters.startDate) {
			(where.capturedAt as Record<string, Date>).gte = filters.startDate;
		}
		if (filters.endDate) {
			(where.capturedAt as Record<string, Date>).lte = filters.endDate;
		}
	}

	const snapshots = await prisma.trendSnapshot.findMany({
		where,
		orderBy: { capturedAt: "desc" },
		take: filters.limit || 30,
	});

	// Parse videoIds JSON
	return snapshots.map((snapshot) => ({
		...snapshot,
		videoIds: JSON.parse(snapshot.videoIds || "[]"),
	}));
}

/**
 * Get a single trend snapshot with its videos
 */
export async function getTrendSnapshotById(
	id: string,
): Promise<TrendHistoryItem | null> {
	const snapshot = await prisma.trendSnapshot.findUnique({
		where: { id },
	});

	if (!snapshot) {
		return null;
	}

	const videoIds: string[] = JSON.parse(snapshot.videoIds || "[]");

	// Get video details
	const videos = await prisma.videoCache.findMany({
		where: { id: { in: videoIds } },
	});

	// Map to Video type
	const topVideos: Video[] = videos.map((v) => ({
		id: v.id,
		title: v.title,
		description: v.description || undefined,
		channelId: v.channelId,
		channelTitle: v.channelTitle,
		publishedAt: v.publishedAt.toISOString(),
		viewCount: v.viewCount || undefined,
		likeCount: v.likeCount || undefined,
		commentCount: v.commentCount || undefined,
		categoryId: v.categoryId || undefined,
		tags: v.tags ? JSON.parse(v.tags) : undefined,
		thumbnailUrl: v.thumbnailUrl || undefined,
		fetchedAt: v.fetchedAt.toISOString(),
	}));

	return {
		snapshot: {
			id: snapshot.id,
			categoryId: snapshot.categoryId,
			country: snapshot.country,
			capturedAt: snapshot.capturedAt,
			videoIds,
		},
		videoCount: videoIds.length,
		topVideos,
	};
}

/**
 * Get aggregated trend history over time
 */
export async function getTrendHistoryAggregation(
	categoryId: string,
	country: string,
	days = 30,
): Promise<
	{
		date: string;
		count: number;
	}[]
> {
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);

	const snapshots = await prisma.trendSnapshot.findMany({
		where: {
			categoryId,
			country,
			capturedAt: { gte: startDate },
		},
		orderBy: { capturedAt: "asc" },
	});

	// Group by date
	const dateMap = new Map<string, number>();

	for (const snapshot of snapshots) {
		const dateKey = snapshot.capturedAt.toISOString().split("T")[0];
		const videoIds: string[] = JSON.parse(snapshot.videoIds || "[]");
		dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + videoIds.length);
	}

	// Convert to array
	return Array.from(dateMap.entries())
		.map(([date, count]) => ({ date, count }))
		.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Delete old trend snapshots (cleanup)
 */
export async function cleanupOldSnapshots(daysToKeep = 30): Promise<number> {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

	const result = await prisma.trendSnapshot.deleteMany({
		where: {
			capturedAt: { lt: cutoffDate },
		},
	});

	return result.count;
}

/**
 * Get available categories and countries from history
 */
export async function getAvailableFilters(): Promise<{
	categories: string[];
	countries: string[];
}> {
	const snapshots = await prisma.trendSnapshot.findMany({
		select: {
			categoryId: true,
			country: true,
		},
		distinct: ["categoryId", "country"],
	});

	const categories = [...new Set(snapshots.map((s) => s.categoryId))];
	const countries = [...new Set(snapshots.map((s) => s.country))];

	return { categories, countries };
}

// Factory function
export function createTrendHistoryService() {
	return {
		getTrendSnapshots,
		getTrendSnapshotById,
		getTrendHistoryAggregation,
		cleanupOldSnapshots,
		getAvailableFilters,
	};
}

export default {
	getTrendSnapshots,
	getTrendSnapshotById,
	getTrendHistoryAggregation,
	cleanupOldSnapshots,
	getAvailableFilters,
	createTrendHistoryService,
};
