/**
 * T3.9: ResultsGrid Component
 * Container for video results grid
 */

"use client";

import { Loader2 } from "lucide-react";
import { VideoCard } from "@/components/VideoCard";
import type { Video } from "@/types";

export interface ResultsGridProps {
	videos: Video[];
	isLoading?: boolean;
	selectedVideos?: string[];
	analyzedVideos?: string[];
	onVideoClick?: (video: Video) => void;
	onVideoSelect?: (videoId: string) => void;
	onVideoAnalyze?: (videoId: string) => void;
	className?: string;
}

/**
 * ResultsGrid Component
 * Displays videos in a responsive grid
 */
export function ResultsGrid({
	videos,
	isLoading = false,
	selectedVideos = [],
	analyzedVideos = [],
	onVideoClick,
	onVideoSelect,
	onVideoAnalyze,
	className = "",
}: ResultsGridProps) {
	// Loading state
	if (isLoading) {
		return (
			<div className={`flex items-center justify-center py-12 ${className}`}>
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					<p className="text-sm text-muted-foreground">Loading results...</p>
				</div>
			</div>
		);
	}

	// Empty state
	if (videos.length === 0) {
		return (
			<div className={`flex items-center justify-center py-12 ${className}`}>
				<div className="flex flex-col items-center gap-3 text-center">
					<p className="text-lg font-medium">No results found</p>
					<p className="text-sm text-muted-foreground">
						Try adjusting your search or filters
					</p>
				</div>
			</div>
		);
	}

	// Results grid
	return (
		<div
			className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}
		>
			{videos.map((video) => (
				<VideoCard
					key={video.id}
					video={video}
					isSelected={selectedVideos.includes(video.id)}
					isAnalyzed={analyzedVideos.includes(video.id)}
					onClick={() => onVideoClick?.(video)}
					onSelect={() => onVideoSelect?.(video.id)}
					onAnalyze={
						onVideoAnalyze ? () => onVideoAnalyze(video.id) : undefined
					}
				/>
			))}
		</div>
	);
}

export default ResultsGrid;
