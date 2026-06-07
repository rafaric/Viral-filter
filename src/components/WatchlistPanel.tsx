/**
 * T6.6: WatchlistPanel Component (sidebar)
 * Add channel, list channels, remove, last analyzed timestamp
 */

"use client";

import { useState } from "react";
import { Plus, Trash2, Clock, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChannelCard } from "./ChannelCard";
import type { Channel } from "@/types";

export interface WatchlistPanelProps {
	channels: Channel[];
	onAddChannel: (channelId: string) => Promise<void>;
	onRemoveChannel: (channelId: string) => Promise<void>;
	onAnalyzeChannel: (channelId: string) => void;
	analyzingChannels?: Set<string>;
	className?: string;
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

	if (days > 0) return `${days}d ago`;
	if (hours > 0) return `${hours}h ago`;
	if (minutes > 0) return `${minutes}m ago`;
	return "Just now";
}

/**
 * WatchlistPanel Component
 * Sidebar panel for managing channel watchlist
 */
export function WatchlistPanel({
	channels,
	onAddChannel,
	onRemoveChannel,
	onAnalyzeChannel,
	analyzingChannels = new Set(),
	className = "",
}: WatchlistPanelProps) {
	const [newChannelId, setNewChannelId] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleAddChannel = async () => {
		if (!newChannelId.trim()) return;

		setIsAdding(true);
		setError(null);

		try {
			await onAddChannel(newChannelId.trim());
			setNewChannelId("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add channel");
		} finally {
			setIsAdding(false);
		}
	};

	const handleRemoveChannel = async (channelId: string) => {
		try {
			await onRemoveChannel(channelId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to remove channel");
		}
	};

	return (
		<div className={cn("flex flex-col h-full", className)}>
			{/* Header */}
			<div className="p-4 border-b">
				<h2 className="text-lg font-semibold">Watchlist</h2>
				<p className="text-sm text-muted-foreground mt-1">
					{channels.length} channel{channels.length !== 1 ? "s" : ""}
				</p>
			</div>

			{/* Add channel form */}
			<div className="p-4 border-b space-y-2">
				<div className="flex gap-2">
					<Input
						placeholder="Channel ID (UC...)"
						value={newChannelId}
						onChange={(e) => setNewChannelId(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleAddChannel();
							}
						}}
						className="flex-1"
					/>
					<Button
						size="icon"
						onClick={handleAddChannel}
						disabled={isAdding || !newChannelId.trim()}
					>
						{isAdding ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Plus className="h-4 w-4" />
						)}
					</Button>
				</div>
				{error && (
					<p className="text-xs text-destructive">{error}</p>
				)}
			</div>

			{/* Channel list */}
			<ScrollArea className="flex-1">
				<div className="p-2 space-y-2">
					{channels.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<p className="text-sm">No channels in watchlist</p>
							<p className="text-xs mt-1">Add a channel ID above</p>
						</div>
					) : (
						channels.map((channel) => (
							<div
								key={channel.id}
								className="group relative p-2 rounded-lg hover:bg-muted/50 transition-colors"
							>
								<div className="flex items-center gap-3">
									{/* Thumbnail */}
									<div className="flex-shrink-0">
										{channel.thumbnailUrl ? (
											<img
												src={channel.thumbnailUrl}
												alt={channel.title}
												className="w-10 h-10 rounded-full object-cover"
											/>
										) : (
											<div className="w-10 h-10 rounded-full bg-muted" />
										)}
									</div>

									{/* Info */}
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">{channel.title}</p>
										<div className="flex items-center gap-1 text-xs text-muted-foreground">
											<Clock className="h-3 w-3" />
											<span>{formatRelativeTime(channel.lastAnalyzed)}</span>
										</div>
									</div>

									{/* Actions */}
									<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8"
											onClick={() => onAnalyzeChannel(channel.id)}
											disabled={analyzingChannels.has(channel.id)}
										>
											<RefreshCw
												className={cn(
													"h-4 w-4",
													analyzingChannels.has(channel.id) && "animate-spin",
												)}
											/>
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8 text-destructive hover:text-destructive"
											onClick={() => handleRemoveChannel(channel.id)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>

								{/* Analyzing indicator */}
								{analyzingChannels.has(channel.id) && (
									<div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/50 overflow-hidden">
										<div className="h-full bg-primary animate-pulse" />
									</div>
								)}
							</div>
						))
					)}
				</div>
			</ScrollArea>

			{/* Footer with sync status */}
			<div className="p-4 border-t">
				<p className="text-xs text-muted-foreground text-center">
					Auto-sync enabled
				</p>
			</div>
		</div>
	);
}

export default WatchlistPanel;