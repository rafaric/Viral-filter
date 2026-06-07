/**
 * YouTube Data API v3 Service
 * Handles all YouTube API interactions with batching, rate limiting, and quota tracking
 */

import type { Video, Channel, SearchFilters } from "@/types";

// YouTube API constants
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_BATCH_SIZE = 50;
const DEFAULT_MAX_RESULTS = 20;
const RATE_LIMIT_RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

// Error types
export class YouTubeApiError extends Error {
	constructor(
		message: string,
		public statusCode?: number,
		public quotaUsed = 0,
	) {
		super(message);
		this.name = "YouTubeApiError";
	}
}

export class QuotaExceededError extends YouTubeApiError {
	constructor(quotaUsed: number) {
		super(`Daily quota exceeded (${quotaUsed} units used)`, 403, quotaUsed);
		this.name = "QuotaExceededError";
	}
}

export class RateLimitError extends YouTubeApiError {
	constructor(retryAfter?: number) {
		super(
			`Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ""}`,
			429,
		);
		this.name = "RateLimitError";
	}
}

// API Response types
interface YouTubeSearchItem {
	id: { videoId?: string; channelId?: string };
	snippet: {
		title: string;
		description?: string;
		channelId: string;
		channelTitle: string;
		publishedAt: string;
		thumbnails?: {
			default?: { url: string };
			high?: { url: string };
			medium?: { url: string };
		};
	};
}

interface YouTubeSearchResponse {
	kind: string;
	items: YouTubeSearchItem[];
	nextPageToken?: string;
	pageInfo?: { totalResults: number; resultsPerPage: number };
}

interface YouTubeVideoItem {
	id: string;
	snippet: {
		title: string;
		description?: string;
		channelId: string;
		channelTitle: string;
		publishedAt: string;
		categoryId?: string;
		tags?: string[];
		thumbnails?: {
			default?: { url: string };
			high?: { url: string };
			medium?: { url: string };
		};
	};
	statistics?: {
		viewCount?: string;
		likeCount?: string;
		commentCount?: string;
	};
}

interface YouTubeVideoResponse {
	kind: string;
	items: YouTubeVideoItem[];
}

interface YouTubeChannelItem {
	id: string;
	snippet: {
		title: string;
		description?: string;
		thumbnails?: {
			default?: { url: string };
			high?: { url: string };
		};
	};
	statistics?: {
		subscriberCount?: string;
		videoCount?: string;
	};
}

interface YouTubeChannelResponse {
	kind: string;
	items: YouTubeChannelItem[];
}

// Reserved for future playlist implementation
// interface YouTubePlaylistItem {
// 	id: string;
// 	snippet: {
// 		title: string;
// 		description?: string;
// 		channelId: string;
// 		channelTitle: string;
// 		publishedAt: string;
// 		thumbnails?: {
// 			default?: { url: string };
// 			high?: { url: string };
// 		};
// 	};
// 	contentDetails?: { videoId?: string };
// }
// interface YouTubePlaylistResponse {
// 	kind: string;
// 	items: YouTubePlaylistItem[];
// 	nextPageToken?: string;
// }

export interface YouTubeServiceConfig {
	apiKey: string;
	onQuotaChange?: (quotaUsed: number) => void;
}

export interface SearchOptions {
	maxResults?: number;
	pageToken?: string;
	filters?: SearchFilters;
}

/**
 * YouTube API Service
 * Provides methods for searching videos, getting video details, channel info, and more
 */
export class YouTubeService {
	private apiKey: string;
	private quotaUsed = 0;
	private onQuotaChange?: (quota: number) => void;

	constructor(config: YouTubeServiceConfig) {
		this.apiKey = config.apiKey;
		this.onQuotaChange = config.onQuotaChange;
	}

	/**
	 * Get current quota usage
	 */
	getQuotaUsed(): number {
		return this.quotaUsed;
	}

	/**
	 * Reset quota counter (for testing)
	 */
	resetQuota(): void {
		this.quotaUsed = 0;
	}

	/**
	 * Build URL with API key and parameters
	 */
	private buildUrl(endpoint: string, params: Record<string, string>): string {
		const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
		url.searchParams.set("key", this.apiKey);
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				url.searchParams.set(key, value);
			}
		});
		return url.toString();
	}

	/**
	 * Make API request with rate limit handling
	 */
	private async request<T>(
		endpoint: string,
		params: Record<string, string>,
		retries = MAX_RETRIES,
	): Promise<T> {
		const url = this.buildUrl(endpoint, params);

		const response = await fetch(url);

		// Handle rate limiting
		if (response.status === 429) {
			if (retries <= 0) {
				throw new RateLimitError();
			}

			// Get retry-after header or use default
			const retryAfter = response.headers.get("Retry-After");
			const delay = retryAfter
				? parseInt(retryAfter, 10) * 1000
				: RATE_LIMIT_RETRY_DELAY;

			// Wait and retry
			await this.sleep(delay);
			return this.request(endpoint, params, retries - 1);
		}

		// Handle quota exceeded
		if (response.status === 403) {
			this.quotaUsed += 100; // Approximate quota for this request
			this.onQuotaChange?.(this.quotaUsed);
			throw new QuotaExceededError(this.quotaUsed);
		}

		// Handle other errors
		if (!response.ok) {
			throw new YouTubeApiError(
				`YouTube API error: ${response.status} ${response.statusText}`,
				response.status,
				this.quotaUsed,
			);
		}

		// Track quota (YouTube uses different amounts per request type)
		const quotaCost = this.estimateQuotaCost(endpoint);
		this.quotaUsed += quotaCost;
		this.onQuotaChange?.(this.quotaUsed);

		return response.json() as Promise<T>;
	}

	/**
	 * Estimate quota cost based on endpoint
	 */
	private estimateQuotaCost(endpoint: string): number {
		switch (endpoint) {
			case "search":
				return 100;
			case "videos":
				return 1;
			case "channels":
				return 1;
			case "playlistItems":
				return 1;
			default:
				return 1;
		}
	}

	/**
	 * Sleep utility for rate limiting
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Search for videos
	 */
	async search(
		query: string,
		options: SearchOptions = {},
	): Promise<{ items: Video[]; nextPageToken?: string; quotaUsed: number }> {
		const maxResults = options.maxResults || DEFAULT_MAX_RESULTS;

		const params: Record<string, string> = {
			part: "snippet",
			q: query,
			type: "video",
			maxResults: String(maxResults),
		};

		if (options.pageToken) {
			params.pageToken = options.pageToken;
		}

		// Apply filters
		if (options.filters) {
			const { category, language, country, publishedAfter, sortBy } =
				options.filters;
			if (category) params.videoCategoryId = category;
			if (language) params.relevanceLanguage = language;
			if (country) params.regionCode = country;
			if (publishedAfter) params.publishedAfter = publishedAfter;
			if (sortBy) params.order = sortBy;
		}

		const response = await this.request<YouTubeSearchResponse>(
			"search",
			params,
		);

		// Extract video IDs for batch fetching details
		const videoIds = response.items
			.map((item) => item.id.videoId)
			.filter((id): id is string => id !== undefined);

		// Batch fetch video details (view counts, etc.)
		let videosWithStats: Video[] = [];
		if (videoIds.length > 0) {
			videosWithStats = await this.getVideos(videoIds);
		}

		// Map search results to Video type, enriched with stats
		const items: Video[] = response.items.map((item) => {
			const enrichedVideo = videosWithStats.find(
				(v) => v.id === item.id.videoId,
			);
			return {
				id: item.id.videoId || "",
				title: item.snippet.title,
				description: item.snippet.description,
				channelId: item.snippet.channelId,
				channelTitle: item.snippet.channelTitle,
				publishedAt: item.snippet.publishedAt,
				thumbnailUrl: item.snippet.thumbnails?.default?.url,
				// Stats from batch fetch
				viewCount: enrichedVideo?.viewCount,
				likeCount: enrichedVideo?.likeCount,
				commentCount: enrichedVideo?.commentCount,
				categoryId: enrichedVideo?.categoryId,
				tags: enrichedVideo?.tags,
			};
		});

		return {
			items,
			nextPageToken: response.nextPageToken,
			quotaUsed: this.quotaUsed,
		};
	}

	/**
	 * Get video details by IDs (batched, max 50 per request)
	 */
	async getVideos(ids: string[]): Promise<Video[]> {
		if (ids.length === 0) return [];

		const results: Video[] = [];

		// Batch into groups of 50 (YouTube API limit)
		for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
			const batch = ids.slice(i, i + MAX_BATCH_SIZE);
			const response = await this.request<YouTubeVideoResponse>("videos", {
				part: "snippet,statistics,contentDetails",
				id: batch.join(","),
			});

			results.push(
				...response.items.map((item) => ({
					id: item.id,
					title: item.snippet.title,
					description: item.snippet.description,
					channelId: item.snippet.channelId,
					channelTitle: item.snippet.channelTitle,
					publishedAt: item.snippet.publishedAt,
					categoryId: item.snippet.categoryId,
					tags: item.snippet.tags,
					thumbnailUrl:
						item.snippet.thumbnails?.high?.url ||
						item.snippet.thumbnails?.default?.url,
					viewCount: item.statistics?.viewCount
						? parseInt(item.statistics.viewCount, 10)
						: undefined,
					likeCount: item.statistics?.likeCount
						? parseInt(item.statistics.likeCount, 10)
						: undefined,
					commentCount: item.statistics?.commentCount
						? parseInt(item.statistics.commentCount, 10)
						: undefined,
				})),
			);
		}

		return results;
	}

	/**
	 * Get single video by ID
	 */
	async getVideo(id: string): Promise<Video | null> {
		const results = await this.getVideos([id]);
		return results[0] || null;
	}

	/**
	 * Get channel details
	 */
	async getChannel(channelId: string): Promise<Channel | null> {
		const response = await this.request<YouTubeChannelResponse>("channels", {
			part: "snippet,statistics,contentDetails",
			id: channelId,
		});

		if (response.items.length === 0) return null;

		const item = response.items[0];
		return {
			id: item.id,
			title: item.snippet.title,
			description: item.snippet.description,
			thumbnailUrl: item.snippet.thumbnails?.default?.url,
			subscriberCount: item.statistics?.subscriberCount
				? parseInt(item.statistics.subscriberCount, 10)
				: undefined,
			videoCount: item.statistics?.videoCount
				? parseInt(item.statistics.videoCount, 10)
				: undefined,
		};
	}

	/**
	 * Get videos from a channel (uploads playlist)
	 */
	async getChannelVideos(
		channelId: string,
		options: { maxResults?: number; pageToken?: string } = {},
	): Promise<{ items: Video[]; nextPageToken?: string; quotaUsed: number }> {
		// First get channel to get uploads playlist ID
		const channel = await this.getChannel(channelId);
		if (!channel) {
			return { items: [], quotaUsed: this.quotaUsed };
		}

		// Get uploads playlist ID from channel content details
		// Note: This requires additional API call, simplified for now
		const maxResults = options.maxResults || DEFAULT_MAX_RESULTS;

		// Search for channel's videos instead (simpler approach)
		const searchResponse = await this.request<YouTubeSearchResponse>("search", {
			part: "snippet",
			channelId: channelId,
			type: "video",
			maxResults: String(maxResults),
			order: "date",
		});

		const videoIds = searchResponse.items
			.map((item) => item.id.videoId)
			.filter((id): id is string => id !== undefined);

		let videosWithStats: Video[] = [];
		if (videoIds.length > 0) {
			videosWithStats = await this.getVideos(videoIds);
		}

		const items: Video[] = searchResponse.items.map((item) => {
			const enrichedVideo = videosWithStats.find(
				(v) => v.id === item.id.videoId,
			);
			return {
				id: item.id.videoId || "",
				title: item.snippet.title,
				description: item.snippet.description,
				channelId: item.snippet.channelId,
				channelTitle: item.snippet.channelTitle,
				publishedAt: item.snippet.publishedAt,
				thumbnailUrl: item.snippet.thumbnails?.default?.url,
				viewCount: enrichedVideo?.viewCount,
				likeCount: enrichedVideo?.likeCount,
				commentCount: enrichedVideo?.commentCount,
			};
		});

		return {
			items,
			nextPageToken: searchResponse.nextPageToken,
			quotaUsed: this.quotaUsed,
		};
	}

	/**
	 * Get trending videos by category and country
	 */
	async getTrending(
		categoryId?: string,
		country = "US",
	): Promise<{ items: Video[]; quotaUsed: number }> {
		const params: Record<string, string> = {
			part: "snippet,statistics",
			chart: "mostPopular",
			regionCode: country,
			maxResults: "20",
		};

		if (categoryId) {
			params.videoCategoryId = categoryId;
		}

		const response = await this.request<YouTubeVideoResponse>("videos", params);

		const items: Video[] = response.items.map((item) => ({
			id: item.id,
			title: item.snippet.title,
			description: item.snippet.description,
			channelId: item.snippet.channelId,
			channelTitle: item.snippet.channelTitle,
			publishedAt: item.snippet.publishedAt,
			categoryId: item.snippet.categoryId,
			tags: item.snippet.tags,
			thumbnailUrl:
				item.snippet.thumbnails?.high?.url ||
				item.snippet.thumbnails?.default?.url,
			viewCount: item.statistics?.viewCount
				? parseInt(item.statistics.viewCount, 10)
				: undefined,
			likeCount: item.statistics?.likeCount
				? parseInt(item.statistics.likeCount, 10)
				: undefined,
			commentCount: item.statistics?.commentCount
				? parseInt(item.statistics.commentCount, 10)
				: undefined,
		}));

		return { items, quotaUsed: this.quotaUsed };
	}
}

// Factory function for creating service
export function createYouTubeService(
	config: YouTubeServiceConfig,
): YouTubeService {
	return new YouTubeService(config);
}

// Default export
export default YouTubeService;
