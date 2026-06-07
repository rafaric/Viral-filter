/**
 * T6.7: Watchlist Page
 * Full watchlist management view with channel details
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChannelCard } from "@/components/ChannelCard";
import type { Channel } from "@/types";

export default function WatchlistPage() {
	const [channels, setChannels] = useState<Channel[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [newChannelId, setNewChannelId] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [analyzingChannels, setAnalyzingChannels] = useState<Set<string>>(new Set());

	// Fetch watchlist
	const fetchWatchlist = useCallback(async () => {
		try {
			const response = await fetch("/api/channels");
			if (!response.ok) {
				throw new Error("Failed to fetch watchlist");
			}
			const data = await response.json();
			setChannels(data);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchWatchlist();
	}, [fetchWatchlist]);

	// Add channel to watchlist
	const handleAddChannel = async () => {
		if (!newChannelId.trim()) return;

		setIsAdding(true);
		setError(null);

		try {
			const response = await fetch("/api/channels", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ channelId: newChannelId.trim() }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to add channel");
			}

			setNewChannelId("");
			await fetchWatchlist();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add channel");
		} finally {
			setIsAdding(false);
		}
	};

	// Remove channel from watchlist
	const handleRemoveChannel = async (channelId: string) => {
		try {
			const response = await fetch("/api/channels", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ channelId }),
			});

			if (!response.ok) {
				throw new Error("Failed to remove channel");
			}

			await fetchWatchlist();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to remove channel");
		}
	};

	// Analyze channel
	const handleAnalyzeChannel = async (channelId: string) => {
		setAnalyzingChannels((prev) => new Set(prev).add(channelId));

		try {
			// Fetch channel details to trigger analysis
			const response = await fetch(`/api/channels/${channelId}`);
			if (!response.ok) {
				throw new Error("Failed to analyze channel");
			}

			// Update the channel in our list
			const data = await response.json();
			setChannels((prev) =>
				prev.map((ch) =>
					ch.id === channelId
						? { ...ch, lastAnalyzed: new Date().toISOString() }
						: ch,
				),
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to analyze channel");
		} finally {
			setAnalyzingChannels((prev) => {
				const next = new Set(prev);
				next.delete(channelId);
				return next;
			});
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="container py-8 max-w-4xl">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold">Channel Watchlist</h1>
					<p className="text-muted-foreground mt-1">
						Manage and analyze your favorite YouTube channels
					</p>
				</div>
				<Button onClick={fetchWatchlist} variant="outline" size="icon">
					<RefreshCw className="h-4 w-4" />
				</Button>
			</div>

			{/* Error message */}
			{error && (
				<Card className="p-4 mb-6 border-destructive bg-destructive/10">
					<div className="flex items-center gap-2 text-destructive">
						<AlertCircle className="h-4 w-4" />
						<span>{error}</span>
					</div>
				</Card>
			)}

			{/* Add channel form */}
			<Card className="p-6 mb-8">
				<h2 className="text-lg font-semibold mb-4">Add Channel</h2>
				<div className="flex gap-4">
					<Input
						placeholder="Enter YouTube Channel ID (e.g., UC...)"
						value={newChannelId}
						onChange={(e) => setNewChannelId(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleAddChannel();
							}
						}}
						className="flex-1"
					/>
					<Button onClick={handleAddChannel} disabled={isAdding || !newChannelId.trim()}>
						{isAdding ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<Plus className="h-4 w-4 mr-2" />
						)}
						Add Channel
					</Button>
				</div>
				<p className="text-sm text-muted-foreground mt-2">
					Find channel ID in the URL: youtube.com/channel/<strong>UC...</strong>
				</p>
			</Card>

			{/* Channel list */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">
						Your Channels ({channels.length})
					</h2>
					{analyzingChannels.size > 0 && (
						<Badge variant="secondary" className="animate-pulse">
							Analyzing {analyzingChannels.size} channel{analyzingChannels.size > 1 ? "s" : ""}
						</Badge>
					)}
				</div>

				{channels.length === 0 ? (
					<Card className="p-12 text-center">
						<p className="text-muted-foreground">No channels in your watchlist</p>
						<p className="text-sm text-muted-foreground mt-1">
							Add your first channel above to get started
						</p>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{channels.map((channel) => (
							<ChannelCard
								key={channel.id}
								channel={channel}
								isAnalyzing={analyzingChannels.has(channel.id)}
								onAnalyze={() => handleAnalyzeChannel(channel.id)}
								onRemove={() => handleRemoveChannel(channel.id)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}