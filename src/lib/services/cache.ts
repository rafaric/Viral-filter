/**
 * Cache Service
 * Manages YouTube data caching with TTL-based expiration
 */

import prisma from "@/lib/db";
import type { Video, SearchFilters } from "@/types";

// TTL constants (in milliseconds)
const VIDEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CHANNEL_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const SEARCH_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export interface CacheStats {
	totalCached: number;
	oldestEntry: Date | null;
	newestEntry: Date | null;
}

export interface CacheOptions {
	forceRefresh?: boolean;
}

/**
 * Generate a hash for search query + filters
 */
function generateSearchHash(query: string, filters: SearchFilters): string {
	const data = JSON.stringify({ query, filters });
	let hash = 0;
	for (let i = 0; i < data.length; i++) {
		const char = data.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash).toString(16);
}

/**
 * Check if a cached entry has expired
 */
function isExpired(fetchedAt: Date, ttl: number): boolean {
	return Date.now() - fetchedAt.getTime() > ttl;
}

export class CacheService {
	/**
	 * Get cached video by ID
	 */
	async getVideo(
		videoId: string,
		options: CacheOptions = {},
	): Promise<Video | null> {
		const cached = await prisma.videoCache.findUnique({
			where: { id: videoId },
		});

		if (!cached) {
			return null;
		}

		// Check expiration
		if (!options.forceRefresh && isExpired(cached.fetchedAt, VIDEO_CACHE_TTL)) {
			return null;
		}

		return {
			id: cached.id,
			title: cached.title,
			description: cached.description || undefined,
			channelId: cached.channelId,
			channelTitle: cached.channelTitle,
			publishedAt: cached.publishedAt.toISOString(),
			viewCount: cached.viewCount || undefined,
			likeCount: cached.likeCount || undefined,
			commentCount: cached.commentCount || undefined,
			categoryId: cached.categoryId || undefined,
			tags: cached.tags ? JSON.parse(cached.tags) : undefined,
			thumbnailUrl: cached.thumbnailUrl || undefined,
			fetchedAt: cached.fetchedAt.toISOString(),
			analyzedAt: cached.analyzedAt?.toISOString(),
			aiAnalysis: cached.aiAnalysis || undefined,
		};
	}

	/**
	 * Cache a video
	 */
	async setVideo(video: Video): Promise<Video> {
		const cached = await prisma.videoCache.upsert({
			where: { id: video.id },
			create: {
				id: video.id,
				title: video.title,
				description: video.description,
				channelId: video.channelId,
				channelTitle: video.channelTitle,
				publishedAt: new Date(video.publishedAt),
				viewCount: video.viewCount,
				likeCount: video.likeCount,
				commentCount: video.commentCount,
				categoryId: video.categoryId,
				tags: video.tags ? JSON.stringify(video.tags) : null,
				thumbnailUrl: video.thumbnailUrl,
			},
			update: {
				title: video.title,
				description: video.description,
				channelId: video.channelId,
				channelTitle: video.channelTitle,
				publishedAt: new Date(video.publishedAt),
				viewCount: video.viewCount,
				likeCount: video.likeCount,
				commentCount: video.commentCount,
				categoryId: video.categoryId,
				tags: video.tags ? JSON.stringify(video.tags) : null,
				thumbnailUrl: video.thumbnailUrl,
				fetchedAt: new Date(),
			},
		});

		return {
			id: cached.id,
			title: cached.title,
			description: cached.description || undefined,
			channelId: cached.channelId,
			channelTitle: cached.channelTitle,
			publishedAt: cached.publishedAt.toISOString(),
			viewCount: cached.viewCount || undefined,
			likeCount: cached.likeCount || undefined,
			commentCount: cached.commentCount || undefined,
			categoryId: cached.categoryId || undefined,
			tags: cached.tags ? JSON.parse(cached.tags) : undefined,
			thumbnailUrl: cached.thumbnailUrl || undefined,
			fetchedAt: cached.fetchedAt.toISOString(),
		};
	}

	/**
	 * Get cached search results
	 */
	async getSearch(
		query: string,
		filters: SearchFilters,
	): Promise<Video[] | null> {
		const searchHash = generateSearchHash(query, filters);

		// Find recent search history entry
		const recentSearch = await prisma.searchHistory.findFirst({
			where: {
				query: searchHash,
				createdAt: {
					gte: new Date(Date.now() - SEARCH_CACHE_TTL),
				},
			},
			orderBy: { createdAt: "desc" },
		});

		if (!recentSearch) {
			return null;
		}

		// Get videos from cache
		const videoIds = recentSearch.filters.split(",").filter(Boolean);
		if (videoIds.length === 0) {
			return null;
		}

		const cachedVideos = await prisma.videoCache.findMany({
			where: {
				id: { in: videoIds },
			},
		});

		if (cachedVideos.length === 0) {
			return null;
		}

		return cachedVideos.map((cached) => ({
			id: cached.id,
			title: cached.title,
			description: cached.description || undefined,
			channelId: cached.channelId,
			channelTitle: cached.channelTitle,
			publishedAt: cached.publishedAt.toISOString(),
			viewCount: cached.viewCount || undefined,
			likeCount: cached.likeCount || undefined,
			commentCount: cached.commentCount || undefined,
			categoryId: cached.categoryId || undefined,
			tags: cached.tags ? JSON.parse(cached.tags) : undefined,
			thumbnailUrl: cached.thumbnailUrl || undefined,
			fetchedAt: cached.fetchedAt.toISOString(),
		}));
	}

	/**
	 * Cache search results
	 */
	async setSearch(
		query: string,
		filters: SearchFilters,
		videos: Video[],
	): Promise<void> {
		const searchHash = generateSearchHash(query, filters);
		const videoIds = videos.map((v) => v.id).join(",");

		await prisma.searchHistory.create({
			data: {
				query: searchHash,
				filters: videoIds,
				resultsCount: videos.length,
			},
		});

		// Also cache individual videos
		await Promise.all(videos.map((video) => this.setVideo(video)));
	}

	/**
	 * Invalidate a cached video
	 */
	async invalidateVideo(videoId: string): Promise<void> {
		await prisma.videoCache.delete({
			where: { id: videoId },
		});
	}

	/**
	 * Get cache statistics
	 */
	async getStats(): Promise<CacheStats> {
		const videos = await prisma.videoCache.findMany({
			orderBy: { fetchedAt: "asc" },
		});

		if (videos.length === 0) {
			return {
				totalCached: 0,
				oldestEntry: null,
				newestEntry: null,
			};
		}

		return {
			totalCached: videos.length,
			oldestEntry: videos[0].fetchedAt,
			newestEntry: videos[videos.length - 1].fetchedAt,
		};
	}

	/**
	 * Clean up expired cache entries
	 */
	async cleanup(): Promise<number> {
		const cutoffDate = new Date(Date.now() - VIDEO_CACHE_TTL);

		const result = await prisma.videoCache.deleteMany({
			where: {
				fetchedAt: { lt: cutoffDate },
			},
		});

		return result.count;
	}

	/**
	 * Clear all cache
	 */
	async clearAll(): Promise<void> {
		await prisma.videoCache.deleteMany({});
		await prisma.searchHistory.deleteMany({});
	}
}

// Factory function
export function createCacheService(): CacheService {
	return new CacheService();
}

// Default export
export default CacheService;
