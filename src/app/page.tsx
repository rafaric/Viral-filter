/**
 * T3.9: Dashboard Page
 * Main page with search, filters, and results
 */

"use client";

import { useState, useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { FilterPanel } from "@/components/FilterPanel";
import { ResultsGrid } from "@/components/ResultsGrid";
import { useAppStore } from "@/lib/store";
import type { Video } from "@/types";

export default function DashboardPage() {
	const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

	// Get store state and actions
	const {
		search,
		ui,
		setResults,
		setLoading,
		setError,
		appendResults,
		toggleVideoSelection,
		clearSelection,
	} = useAppStore();

	const { query, filters, results, isLoading, error, nextPageToken } = search;
	const { selectedVideos } = ui;

	// Handle search
	const handleSearch = useCallback(async () => {
		if (!query.trim()) return;

		setLoading(true);
		setError(null);

		try {
			// Build query params
			const params = new URLSearchParams();
			params.set("q", query);

			if (filters.category) params.set("category", filters.category);
			if (filters.country) params.set("country", filters.country);
			if (filters.language) params.set("language", filters.language);
			if (filters.publishedAfter) params.set("publishedAfter", filters.publishedAfter);
			if (filters.publishedBefore) params.set("publishedBefore", filters.publishedBefore);
			if (filters.minViews) params.set("minViews", String(filters.minViews));
			if (filters.minLikes) params.set("minLikes", String(filters.minLikes));
			if (filters.sortBy) params.set("sortBy", filters.sortBy);

			const response = await fetch(`/api/search?${params.toString()}`);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Search failed");
			}

			const data = await response.json();
			setResults(data.items, data.nextPageToken, data.cached);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	}, [query, filters, setLoading, setError, setResults]);

	// Handle load more (pagination)
	const handleLoadMore = useCallback(async () => {
		if (!nextPageToken || isLoading) return;

		setLoading(true);

		try {
			const params = new URLSearchParams();
			params.set("q", query);
			params.set("pageToken", nextPageToken);

			const response = await fetch(`/api/search?${params.toString()}`);

			if (!response.ok) {
				throw new Error("Failed to load more results");
			}

			const data = await response.json();
			appendResults(data.items, data.nextPageToken);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load more");
		} finally {
			setLoading(false);
		}
	}, [nextPageToken, query, isLoading, setLoading, setError, appendResults]);

	// Handle video select
	const handleVideoSelect = useCallback(
		(videoId: string) => {
			toggleVideoSelection(videoId);
		},
		[toggleVideoSelection],
	);

	// Handle video click
	const handleVideoClick = useCallback((_video: Video) => {
		// Could open video detail modal or navigate to video page
	}, []);

	// Handle analyze video
	const handleVideoAnalyze = useCallback((videoId: string) => {
		// Would trigger AI analysis for this video
		console.log("Analyze video:", videoId);
	}, []);

	// Handle filter apply
	const handleFilterApply = useCallback(() => {
		if (query.trim()) {
			handleSearch();
		}
	}, [query, handleSearch]);

	return (
		<div className="flex h-screen overflow-hidden">
			{/* Filter Panel Sidebar */}
			<aside className="w-64 flex-shrink-0 overflow-y-auto border-r">
				<FilterPanel onApply={handleFilterApply} />
			</aside>

			{/* Main Content */}
			<main className="flex-1 flex flex-col overflow-hidden">
				{/* Header with Search Bar */}
				<header className="flex-shrink-0 border-b p-4">
					<div className="max-w-3xl mx-auto">
						<SearchBar onSearch={handleSearch} />
					</div>
				</header>

				{/* Results Area */}
				<div className="flex-1 overflow-y-auto p-4">
					{/* Error state */}
					{error && (
						<div className="mb-4 p-4 rounded-md bg-destructive/10 text-destructive text-sm">
							{error}
						</div>
					)}

					{/* Results grid */}
					<ResultsGrid
						videos={results}
						isLoading={isLoading}
						selectedVideos={selectedVideos}
						onVideoClick={handleVideoClick}
						onVideoSelect={handleVideoSelect}
						onVideoAnalyze={handleVideoAnalyze}
					/>

					{/* Load more button */}
					{nextPageToken && results.length > 0 && !isLoading && (
						<div className="mt-4 text-center">
							<button
								onClick={handleLoadMore}
								className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
							>
								Load more results
							</button>
						</div>
					)}

					{/* Selection actions */}
					{selectedVideos.length > 0 && (
						<div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-3">
							<span className="text-sm">
								{selectedVideos.length} video{selectedVideos.length > 1 ? "s" : ""} selected
							</span>
							<button
								onClick={clearSelection}
								className="text-sm text-muted-foreground hover:text-foreground"
							>
								Clear selection
							</button>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}