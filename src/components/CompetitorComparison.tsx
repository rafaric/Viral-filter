/**
 * T7.5: CompetitorComparison Component
 * Side-by-side channel comparison with stats and AI analysis
 */

"use client";

import { useState } from "react";
import {
	Users,
	TrendingUp,
	TrendingDown,
	Minus,
	Eye,
	ThumbsUp,
	MessageSquare,
	Lightbulb,
	Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Channel, Video } from "@/types";

// Types
interface CompetitorStats {
	channelId: string;
	channelTitle: string;
	thumbnailUrl?: string;
	totalViews: number;
	avgViews: number;
	avgLikes: number;
	avgComments: number;
	totalVideos: number;
	growthRate: number;
}

interface CompetitorComparisonData {
	stats: CompetitorStats[];
	recommendations: string[];
}

export interface CompetitorComparisonProps {
	initialChannels?: Channel[];
	onChannelSelect?: (channelId: string) => void;
	className?: string;
}

/**
 * Format large numbers
 */
function formatNumber(num: number): string {
	if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
	if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
	return num.toLocaleString();
}

/**
 * Format percentage
 */
function formatPercentage(num: number): string {
	const sign = num >= 0 ? "+" : "";
	return `${sign}${num.toFixed(1)}%`;
}

/**
 * Growth indicator component
 */
function GrowthIndicator({ rate }: { rate: number }) {
	if (rate > 10) {
		return (
			<Badge
				variant="outline"
				className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"
			>
				<TrendingUp className="h-3 w-3" />
				{formatPercentage(rate)}
			</Badge>
		);
	}
	if (rate < -10) {
		return (
			<Badge
				variant="outline"
				className="bg-red-500/10 text-red-600 border-red-500/20 gap-1"
			>
				<TrendingDown className="h-3 w-3" />
				{formatPercentage(rate)}
			</Badge>
		);
	}
	return (
		<Badge variant="outline" className="gap-1">
			<Minus className="h-3 w-3" />
			{formatPercentage(rate)}
		</Badge>
	);
}

/**
 * Stat card component
 */
function StatCard({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: string;
	icon: React.ComponentType<{ className?: string }>;
}) {
	return (
		<div className="flex items-center gap-2">
			<Icon className="h-4 w-4 text-muted-foreground" />
			<div>
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="font-medium">{value}</p>
			</div>
		</div>
	);
}

/**
 * Channel comparison row
 */
function ChannelComparisonRow({
	stats,
	isHighlighted = false,
}: {
	stats: CompetitorStats;
	isHighlighted?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-4 p-4 rounded-lg transition-colors",
				isHighlighted && "bg-primary/5 ring-1 ring-primary/20",
			)}
		>
			{/* Thumbnail */}
			<div className="flex-shrink-0">
				{stats.thumbnailUrl ? (
					<img
						src={stats.thumbnailUrl}
						alt={stats.channelTitle}
						className="w-12 h-12 rounded-full object-cover"
					/>
				) : (
					<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
						<Users className="h-6 w-6 text-muted-foreground" />
					</div>
				)}
			</div>

			{/* Channel info */}
			<div className="flex-1 min-w-0">
				<p className="font-medium truncate">{stats.channelTitle}</p>
				<GrowthIndicator rate={stats.growthRate} />
			</div>

			{/* Stats grid */}
			<div className="hidden md:grid md:grid-cols-4 gap-4">
				<StatCard
					label="Total Views"
					value={formatNumber(stats.totalViews)}
					icon={Eye}
				/>
				<StatCard
					label="Avg Views"
					value={formatNumber(stats.avgViews)}
					icon={Eye}
				/>
				<StatCard
					label="Avg Likes"
					value={formatNumber(stats.avgLikes)}
					icon={ThumbsUp}
				/>
				<StatCard
					label="Videos"
					value={stats.totalVideos.toString()}
					icon={MessageSquare}
				/>
			</div>

			{/* Mobile stats */}
			<div className="md:hidden text-sm text-muted-foreground">
				{formatNumber(stats.avgViews)} avg views
			</div>
		</div>
	);
}

/**
 * Recommendations list
 */
function RecommendationsList({
	recommendations,
}: {
	recommendations: string[];
}) {
	if (recommendations.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				Add channels to generate recommendations
			</p>
		);
	}

	return (
		<ul className="space-y-3">
			{recommendations.map((rec, index) => (
				<li key={index} className="flex gap-3">
					<Lightbulb className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
					<span className="text-sm">{rec}</span>
				</li>
			))}
		</ul>
	);
}

/**
 * Add channel form
 */
function AddChannelForm({
	onAdd,
	isLoading,
}: {
	onAdd: (channelId: string) => void;
	isLoading: boolean;
}) {
	const [channelId, setChannelId] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (channelId.trim()) {
			onAdd(channelId.trim());
			setChannelId("");
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				placeholder="Enter Channel ID (e.g., UC_x5XG1OV2P6uZZ5FSM9Ttw)"
				value={channelId}
				onChange={(e) => setChannelId(e.target.value)}
				className="flex-1"
			/>
			<Button type="submit" disabled={isLoading || !channelId.trim()}>
				{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
			</Button>
		</form>
	);
}

/**
 * CompetitorComparison Component
 */
export function CompetitorComparison({
	initialChannels = [],
	onChannelSelect,
	className = "",
}: CompetitorComparisonProps) {
	const [channels, setChannels] = useState<CompetitorStats[]>([]);
	const [recommendations, setRecommendations] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Add channel to comparison
	const handleAddChannel = async (channelId: string) => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch(
				`/api/channels/${encodeURIComponent(channelId)}`,
			);

			if (!response.ok) {
				throw new Error(`Channel not found: ${response.status}`);
			}

			const data = await response.json();

			// Check if already added
			if (channels.some((c) => c.channelId === channelId)) {
				throw new Error("Channel already added");
			}

			// Add to list with mock stats (in real implementation, would come from API)
			const newChannel: CompetitorStats = {
				channelId: data.id,
				channelTitle: data.title,
				thumbnailUrl: data.thumbnail,
				totalViews: data.stats?.avgViews * 20 || 0,
				avgViews: data.stats?.avgViews || 0,
				avgLikes: data.stats?.avgLikes || 0,
				avgComments: 0,
				totalVideos: data.stats?.totalVideos || 0,
				growthRate: 0,
			};

			setChannels((prev) => [...prev, newChannel]);

			// Generate mock recommendations
			if (channels.length === 0) {
				setRecommendations([
					`Analyzing ${data.title}...`,
					"Comparing with other channels in your watchlist...",
				]);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add channel");
		} finally {
			setIsLoading(false);
		}
	};

	// Remove channel
	const handleRemoveChannel = (channelId: string) => {
		setChannels((prev) => prev.filter((c) => c.channelId !== channelId));
	};

	return (
		<div className={cn("space-y-6", className)}>
			{/* Add channel form */}
			<Card className="p-4">
				<h3 className="font-medium mb-3">Add Channel to Compare</h3>
				<AddChannelForm onAdd={handleAddChannel} isLoading={isLoading} />
				{error && <p className="text-sm text-destructive mt-2">{error}</p>}
			</Card>

			{/* Results */}
			{channels.length > 0 && (
				<div className="space-y-6">
					{/* Comparison table */}
					<Card className="overflow-hidden">
						<div className="p-4 border-b bg-muted/50">
							<h3 className="font-medium">Channel Comparison</h3>
						</div>
						<div className="divide-y">
							{channels.map((channel, index) => (
								<div key={channel.channelId} className="relative">
									<ChannelComparisonRow
										stats={channel}
										isHighlighted={index === 0}
									/>
									<button
										onClick={() => handleRemoveChannel(channel.channelId)}
										className="absolute top-4 right-4 text-muted-foreground hover:text-destructive"
									>
										×
									</button>
								</div>
							))}
						</div>
					</Card>

					{/* Recommendations */}
					<Tabs defaultValue="insights" className="space-y-4">
						<TabsList>
							<TabsTrigger value="insights">
								<Lightbulb className="h-4 w-4 mr-1" />
								AI Insights
							</TabsTrigger>
							<TabsTrigger value="videos">Recent Videos</TabsTrigger>
						</TabsList>

						<TabsContent value="insights">
							<Card className="p-6">
								<h3 className="font-medium mb-4">Recommendations</h3>
								<RecommendationsList recommendations={recommendations} />
							</Card>
						</TabsContent>

						<TabsContent value="videos">
							<Card className="p-6">
								<p className="text-muted-foreground text-sm">
									Select a channel to view their recent videos
								</p>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			)}

			{/* Empty state */}
			{channels.length === 0 && (
				<Card className="p-12 text-center">
					<Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<h3 className="text-lg font-medium mb-2">No Channels Added</h3>
					<p className="text-muted-foreground max-w-md mx-auto">
						Add channels from your watchlist or enter channel IDs to compare
						their performance side by side
					</p>
				</Card>
			)}
		</div>
	);
}

export default CompetitorComparison;
