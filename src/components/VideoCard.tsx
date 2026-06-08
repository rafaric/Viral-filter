/**
 * T3.8: VideoCard Component
 * Video preview card with stats and states
 */

"use client";

import { Play, Eye, ThumbsUp, MessageSquare, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Video } from "@/types";

export interface VideoCardProps {
	video: Video;
	isSelected?: boolean;
	isAnalyzed?: boolean;
	isHovered?: boolean;
	onClick?: () => void;
	onSelect?: () => void;
	onAnalyze?: () => void;
	className?: string;
}

/**
 * Format view count for display
 */
function formatCount(count?: number): string {
	if (!count) return "0";
	if (count >= 1000000) {
		return `${(count / 1000000).toFixed(1)}M`;
	}
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1)}K`;
	}
	return count.toString();
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diff = now.getTime() - date.getTime();

	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const months = Math.floor(days / 30);
	const years = Math.floor(months / 12);

	if (years > 0) return `${years} year${years > 1 ? "s" : ""} ago`;
	if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
	if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
	if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
	if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
	return "Just now";
}

/**
 * VideoCard Component
 * Displays video information with stats and interaction states
 */
export function VideoCard({
	video,
	isSelected = false,
	isAnalyzed = false,
	isHovered = false,
	onClick,
	onSelect,
	onAnalyze,
	className = "",
}: VideoCardProps) {
	return (
		<Card
			className={cn(
				"group relative overflow-hidden cursor-pointer transition-all duration-200",
				isSelected && "ring-2 ring-primary",
				isHovered && "shadow-lg scale-[1.02]",
				className,
			)}
			onClick={onClick}
		>
			{/* Thumbnail */}
			<div className="relative aspect-video bg-muted overflow-hidden">
				{video.thumbnailUrl ? (
					<img
						src={video.thumbnailUrl}
						alt={video.title}
						className="w-full h-full object-cover transition-transform group-hover:scale-105"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-muted">
						<Play className="h-12 w-12 text-muted-foreground" />
					</div>
				)}

				{/* Play overlay on hover */}
				<div
					className={cn(
						"absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity",
						isHovered ? "opacity-100" : "opacity-0",
					)}
				>
					<Play className="h-16 w-16 text-white fill-white" />
				</div>

				{/* Analyzed badge */}
				{isAnalyzed && (
					<div className="absolute top-2 right-2">
						<Badge variant="secondary" className="gap-1">
							<Sparkles className="h-3 w-3" />
							Analyzed
						</Badge>
					</div>
				)}
			</div>

			{/* Content */}
			<div className="p-3 space-y-2">
				{/* Title */}
				<h3 className="font-medium line-clamp-2 text-sm leading-tight">
					{video.title}
				</h3>

				{/* Channel name */}
				<p className="text-xs text-muted-foreground truncate">
					{video.channelTitle}
				</p>

				{/* Stats row */}
				<div className="flex items-center gap-3 text-xs text-muted-foreground">
					{/* Views */}
					<div className="flex items-center gap-1">
						<Eye className="h-3 w-3" />
						<span>{formatCount(video.viewCount)}</span>
					</div>

					{/* Likes */}
					<div className="flex items-center gap-1">
						<ThumbsUp className="h-3 w-3" />
						<span>{formatCount(video.likeCount)}</span>
					</div>

					{/* Comments */}
					<div className="flex items-center gap-1">
						<MessageSquare className="h-3 w-3" />
						<span>{formatCount(video.commentCount)}</span>
					</div>
				</div>

				{/* Time */}
				<p className="text-xs text-muted-foreground">
					{formatRelativeTime(video.publishedAt)}
				</p>
			</div>

			{/* Selection checkbox */}
			<button
				className={cn(
					"absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
					isSelected
						? "bg-primary border-primary text-primary-foreground"
						: "bg-white/80 border-muted-foreground/30 hover:bg-white",
				)}
				onClick={(e) => {
					e.stopPropagation();
					onSelect?.();
				}}
				aria-label={isSelected ? "Deselect video" : "Select video"}
			>
				{isSelected && <span className="text-xs">✓</span>}
			</button>

			{/* Analyze button */}
			{onAnalyze && (
				<button
					className={cn(
						"absolute bottom-2 right-2 px-2 py-1 text-xs rounded bg-primary text-primary-foreground opacity-0 transition-opacity",
						isHovered && "opacity-100",
					)}
					onClick={(e) => {
						e.stopPropagation();
						onAnalyze();
					}}
				>
					Analyze
				</button>
			)}
		</Card>
	);
}

export default VideoCard;
