/**
 * /api/search route
 * Handles search requests with caching and quota tracking
 */

import { type NextRequest, NextResponse } from "next/server";
import type { SearchFilters, Video } from "@/types";
import { createYouTubeService } from "@/lib/services/youtube";
import { createCacheService } from "@/lib/services/cache";
import { createQuotaService } from "@/lib/services/quota";
import { env } from "@/lib/env";

export interface SearchRequestBody {
	query: string;
	filters?: SearchFilters;
	pageToken?: string;
	maxResults?: number;
}

/**
 * Parse search filters from URL search params
 */
function parseFilters(searchParams: URLSearchParams): SearchFilters {
	const filters: SearchFilters = {};

	const category = searchParams.get("category");
	if (category) filters.category = category;

	const country = searchParams.get("country");
	if (country) filters.country = country;

	const language = searchParams.get("language");
	if (language) filters.language = language;

	const publishedAfter = searchParams.get("publishedAfter");
	if (publishedAfter) filters.publishedAfter = publishedAfter;

	const publishedBefore = searchParams.get("publishedBefore");
	if (publishedBefore) filters.publishedBefore = publishedBefore;

	const minViews = searchParams.get("minViews");
	if (minViews) filters.minViews = parseInt(minViews, 10);

	const minLikes = searchParams.get("minLikes");
	if (minLikes) filters.minLikes = parseInt(minLikes, 10);

	const sortBy = searchParams.get("sortBy") as SearchFilters["sortBy"];
	if (sortBy && ["relevance", "date", "viewCount", "rating"].includes(sortBy)) {
		filters.sortBy = sortBy;
	}

	return filters;
}

/**
 * Apply client-side filters to video results
 */
function applyFilters(videos: Video[], filters: SearchFilters): Video[] {
	let filtered = [...videos];

	// Filter by minimum views
	if (filters.minViews !== undefined) {
		filtered = filtered.filter(
			(v) => v.viewCount !== undefined && v.viewCount >= filters.minViews!,
		);
	}

	// Filter by minimum likes
	if (filters.minLikes !== undefined) {
		filtered = filtered.filter(
			(v) => v.likeCount !== undefined && v.likeCount >= filters.minLikes!,
		);
	}

	// Filter by date range
	if (filters.publishedAfter) {
		const after = new Date(filters.publishedAfter);
		filtered = filtered.filter(
			(v) => new Date(v.publishedAt) >= after,
		);
	}

	if (filters.publishedBefore) {
		const before = new Date(filters.publishedBefore);
		filtered = filtered.filter(
			(v) => new Date(v.publishedAt) <= before,
		);
	}

	return filtered;
}

/**
 * GET /api/search
 * Search for videos with caching and quota tracking
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const query = searchParams.get("q");

		// Validate query parameter
		if (!query || query.trim() === "") {
			return NextResponse.json(
				{ error: "Query parameter 'q' is required" },
				{ status: 400 },
			);
		}

		// Parse filters from query params
		const filters = parseFilters(searchParams);
		const pageToken = searchParams.get("pageToken") || undefined;
		const maxResults = searchParams.get("maxResults")
			? parseInt(searchParams.get("maxResults")!, 10)
			: undefined;

		// Initialize services
		const cacheService = createCacheService();
		const quotaService = createQuotaService();

		// Try to get cached results first
		const cachedResults = await cacheService.getSearch(query.trim(), filters);
		if (cachedResults && cachedResults.length > 0) {
			// Apply additional filters to cached results
			let filteredResults = cachedResults;
			if (filters.minViews || filters.minLikes) {
				filteredResults = applyFilters(cachedResults, filters);
			}

			return NextResponse.json({
				items: filteredResults,
				nextPageToken: undefined,
				quotaUsed: 0,
				cached: true,
			});
		}

		// Cache miss - call YouTube API
		const youtubeService = createYouTubeService({
			apiKey: env.YOUTUBE_API_KEY,
		});

		const searchResult = await youtubeService.search(query.trim(), {
			filters,
			pageToken,
			maxResults,
		});

		// Apply additional client-side filters
		let filteredVideos = searchResult.items;
		if (filters.minViews || filters.minLikes) {
			filteredVideos = applyFilters(searchResult.items, filters);
		}

		// Cache the results
		await cacheService.setSearch(query.trim(), filters, searchResult.items);

		// Track quota usage (approximate: 1 unit per video + 100 for search)
		const quotaCost = searchResult.items.length + 100;
		await quotaService.increment(quotaCost);

		return NextResponse.json({
			items: filteredVideos,
			nextPageToken: searchResult.nextPageToken,
			quotaUsed: quotaCost,
			cached: false,
		});
	} catch (error) {
		console.error("Search error:", error);

		// Handle quota exceeded
		if (error instanceof Error && error.name === "QuotaExceededError") {
			return NextResponse.json(
				{ error: "Daily quota exceeded. Please try again tomorrow." },
				{ status: 429 },
			);
		}

		return NextResponse.json(
			{ error: "Failed to perform search" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/search
 * Search for videos with JSON body (for complex filter payloads)
 */
export async function POST(request: NextRequest) {
	try {
		let body: SearchRequestBody;

		// Parse request body
		try {
			body = await request.json();
		} catch {
			return NextResponse.json(
				{ error: "Invalid JSON body" },
				{ status: 400 },
			);
		}

		// Validate query
		if (!body.query || body.query.trim() === "") {
			return NextResponse.json(
				{ error: "Query is required in request body" },
				{ status: 400 },
			);
		}

		const filters = body.filters || {};
		const pageToken = body.pageToken;
		const maxResults = body.maxResults;

		// Initialize services
		const cacheService = createCacheService();
		const quotaService = createQuotaService();

		// Try to get cached results first
		const cachedResults = await cacheService.getSearch(body.query.trim(), filters);
		if (cachedResults && cachedResults.length > 0) {
			// Apply additional filters to cached results
			let filteredResults = cachedResults;
			if (filters.minViews || filters.minLikes) {
				filteredResults = applyFilters(cachedResults, filters);
			}

			return NextResponse.json({
				items: filteredResults,
				nextPageToken: undefined,
				quotaUsed: 0,
				cached: true,
			});
		}

		// Cache miss - call YouTube API
		const youtubeService = createYouTubeService({
			apiKey: env.YOUTUBE_API_KEY,
		});

		const searchResult = await youtubeService.search(body.query.trim(), {
			filters,
			pageToken,
			maxResults,
		});

		// Apply additional client-side filters
		let filteredVideos = searchResult.items;
		if (filters.minViews || filters.minLikes) {
			filteredVideos = applyFilters(searchResult.items, filters);
		}

		// Cache the results
		await cacheService.setSearch(body.query.trim(), filters, searchResult.items);

		// Track quota usage
		const quotaCost = searchResult.items.length + 100;
		await quotaService.increment(quotaCost);

		return NextResponse.json({
			items: filteredVideos,
			nextPageToken: searchResult.nextPageToken,
			quotaUsed: quotaCost,
			cached: false,
		});
	} catch (error) {
		console.error("Search error:", error);

		// Handle quota exceeded
		if (error instanceof Error && error.name === "QuotaExceededError") {
			return NextResponse.json(
				{ error: "Daily quota exceeded. Please try again tomorrow." },
				{ status: 429 },
			);
		}

		return NextResponse.json(
			{ error: "Failed to perform search" },
			{ status: 500 },
		);
	}
}