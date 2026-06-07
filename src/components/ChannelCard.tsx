/**
 * T6.5: ChannelCard Component
 * Displays channel info with states: default, hover, analyzing
 */

"use client";

import { Users, Video, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Channel } from "@/types";

export interface ChannelCardProps {
	channel: Channel;
	isAnalyzing?: boolean;
	isHovered?: boolean;
	onClick?: () => void;
	onAnalyze?: () => void;
	onRemove?: () => void;
	className?: string;
}

/**
 * Format subscriber count for display
 */
function formatSubscribers(count?: number): string {
	if (!count) return "N/A";
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
function formatRelativeTime(dateString?: string): string {
	if (!dateString) return "Never";
	const date = new Date(dateString);
	const now = new Date();
	const diff = now.getTime() - date.getTime();

	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
	if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
	if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
	return "Just now";
}

/**
 * ChannelCard Component
 * Displays channel information with analysis status
 */
export function ChannelCard({
	channel,
	isAnalyzing = false,
	isHovered = false,
	onClick,
	onAnalyze,
	onRemove,
	className = "",
}: ChannelCardProps) {
	return (
		<Card
			className={cn(
				"group relative overflow-hidden cursor-pointer transition-all duration-200",
				isAnalyzing && "ring-2 ring-yellow-500 animate-pulse",
				isHovered && "shadow-lg scale-[1.02]",
				className,
			)}
			onClick={onClick}
		>
			<div className="flex gap-4 p-4">
				{/* Thumbnail */}
				<div className="flex-shrink-0">
					{channel.thumbnailUrl ? (
						<img
							src={channel.thumbnailUrl}
							alt={channel.title}
							className="w-20 h-20 rounded-full object-cover"
						/>
					) : (
						<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
							<Users className="h-8 w-8 text-muted-foreground" />
						</div>
					)}
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					{/* Title */}
					<h3 className="font-medium truncate">{channel.title}</h3>

					{/* Stats row */}
					<div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
						{/* Subscribers */}
						<div className="flex items-center gap-1">
							<Users className="h-4 w-4" />
							<span>{formatSubscribers(channel.subscriberCount)}</span>
						</div>

						{/* Videos */}
						<div className="flex items-center gap-1">
							<Video className="h-4 w-4" />
							<span>{channel.videoCount || "N/A"}</span>
						</div>
					</div>

					{/* Last analyzed */}
					<div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
						<Clock className="h-3 w-3" />
						<span>Last analyzed: {formatRelativeTime(channel.lastAnalyzed)}</span>
					</div>
				</div>

				{/* Status badge */}
				<div className="flex-shrink-0">
					{isAnalyzing ? (
						<Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
							Analyzing...
						</Badge>
					) : channel.lastAnalyzed ? (
						<Badge variant="outline">Analyzed</Badge>
					) : (
						<Badge variant="secondary">Pending</Badge>
					)}
				</div>
			</div>

			{/* Hover actions */}
			<div
				className={cn(
					"absolute top-2 right-2 flex gap-2 transition-opacity",
					isHovered ? "opacity-100" : "opacity-0",
				)}
			>
				{onAnalyze && !isAnalyzing && (
					<button
						className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90"
						onClick={(e) => {
							e.stopPropagation();
							onAnalyze();
						}}
					>
						Analyze
					</button>
				)}
				{onRemove && (
					<button
						className="px-2 py-1 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
						onClick={(e) => {
							e.stopPropagation();
							onRemove();
						}}
					>
						Remove
					</button>
				)}
			</div>

			{/* Analyzing overlay */}
			{isAnalyzing && (
				<div className="absolute inset-0 bg-background/50 flex items-center justify-center">
					<div className="flex flex-col items-center gap-2">
						<div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
						<span className="text-sm text-muted-foreground">Analyzing channel...</span>
					</div>
				</div>
			)}
		</Card>
	);
}

export default ChannelCard;