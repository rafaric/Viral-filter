/**
 * T7.4: /trends page
 * Niche analysis view with trend charts, keyword cloud, and top channels
 */

"use client";

import { useState, useEffect } from "react";
import {
	TrendingUp,
	TrendingDown,
	Minus,
	Search,
	Tag,
	Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendChart } from "@/components/TrendChart";
import { VideoCard } from "@/components/VideoCard";
import { cn } from "@/lib/utils";
import type { Video, Channel, TrendData, TrendClassification } from "@/types";

// YouTube video categories
const CATEGORIES = [
	{ id: "1", name: "Film & Animation" },
	{ id: "2", name: "Autos & Vehicles" },
	{ id: "10", name: "Music" },
	{ id: "15", name: "Pets & Animals" },
	{ id: "17", name: "Sports" },
	{ id: "18", name: "Short Movies" },
	{ id: "19", name: "Travel & Events" },
	{ id: "20", name: "Gaming" },
	{ id: "21", name: "Videoblogging" },
	{ id: "22", name: "People & Blogs" },
	{ id: "23", name: "Comedy" },
	{ id: "24", name: "Entertainment" },
	{ id: "25", name: "News & Politics" },
	{ id: "26", name: "Howto & Style" },
	{ id: "27", name: "Education" },
	{ id: "28", name: "Science & Technology" },
	{ id: "29", name: "Nonprofits & Activism" },
	{ id: "43", name: "Shows" },
	{ id: "44", name: "Trailers" },
];

// Popular countries
const COUNTRIES = [
	{ code: "US", name: "United States" },
	{ code: "GB", name: "United Kingdom" },
	{ code: "DE", name: "Germany" },
	{ code: "FR", name: "France" },
	{ code: "ES", name: "Spain" },
	{ code: "IT", name: "Italy" },
	{ code: "BR", name: "Brazil" },
	{ code: "MX", name: "Mexico" },
	{ code: "JP", name: "Japan" },
	{ code: "KR", name: "South Korea" },
	{ code: "IN", name: "India" },
	{ code: "AU", name: "Australia" },
	{ code: "CA", name: "Canada" },
	{ code: "RU", name: "Russia" },
	{ code: "AR", name: "Argentina" },
];

type Period = "24h" | "7d" | "30d";

interface TrendsState {
	data: TrendData | null;
	isLoading: boolean;
	error: string | null;
}

/**
 * Trend status badge component
 */
function TrendStatusBadge({ type }: { type: keyof TrendClassification }) {
	const config = {
		emerging: {
			label: "Emerging",
			icon: TrendingUp,
			className: "bg-green-500/10 text-green-600 border-green-500/20",
		},
		stable: {
			label: "Stable",
			icon: Minus,
			className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
		},
		declining: {
			label: "Declining",
			icon: TrendingDown,
			className: "bg-red-500/10 text-red-600 border-red-500/20",
		},
	};

	const { label, icon: Icon, className } = config[type];

	return (
		<Badge variant="outline" className={cn("gap-1", className)}>
			<Icon className="h-3 w-3" />
			{label}
		</Badge>
	);
}

/**
 * Keyword cloud component
 */
function KeywordCloud({ keywords }: { keywords: string[] }) {
	if (!keywords || keywords.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">No keywords extracted</p>
		);
	}

	// Calculate font sizes based on position (top keywords are larger)
	const maxIndex = Math.min(keywords.length, 10);

	return (
		<div className="flex flex-wrap gap-2">
			{keywords.slice(0, 20).map((keyword, index) => {
				const size =
					index < 5 ? "text-lg" : index < 10 ? "text-base" : "text-sm";
				const opacity = 1 - (index / maxIndex) * 0.3;
				return (
					<Badge
						key={keyword}
						variant="secondary"
						className={cn(size, "font-normal")}
						style={{ opacity }}
					>
						{keyword}
					</Badge>
				);
			})}
		</div>
	);
}

/**
 * Channel list component
 */
function ChannelList({ channels }: { channels: Channel[] }) {
	if (!channels || channels.length === 0) {
		return <p className="text-muted-foreground text-sm">No channels found</p>;
	}

	return (
		<div className="space-y-2">
			{channels.slice(0, 10).map((channel, index) => (
				<div
					key={channel.id}
					className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
				>
					<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
						{index + 1}
					</div>
					{channel.thumbnailUrl ? (
						<img
							src={channel.thumbnailUrl}
							alt={channel.title}
							className="w-10 h-10 rounded-full"
						/>
					) : (
						<div className="w-10 h-10 rounded-full bg-muted" />
					)}
					<div className="flex-1 min-w-0">
						<p className="font-medium truncate">{channel.title}</p>
						<p className="text-xs text-muted-foreground">
							{channel.videoCount ? `${channel.videoCount} videos` : "Channel"}
						</p>
					</div>
				</div>
			))}
		</div>
	);
}

/**
 * Trends page component
 */
export default function TrendsPage() {
	const [category, setCategory] = useState<string>("10"); // Music
	const [country, setCountry] = useState<string>("US");
	const [period, setPeriod] = useState<Period>("7d");
	const [state, setState] = useState<TrendsState>({
		data: null,
		isLoading: false,
		error: null,
	});

	// Fetch trends when parameters change
	useEffect(() => {
		const fetchTrends = async () => {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));

			try {
				const params = new URLSearchParams({
					category,
					country,
					period,
				});

				const response = await fetch(`/api/trending?${params}`);

				if (!response.ok) {
					throw new Error(`Failed to fetch trends: ${response.status}`);
				}

				const data = await response.json();
				setState({ data, isLoading: false, error: null });
			} catch (error) {
				setState({
					data: null,
					isLoading: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		};

		fetchTrends();
	}, [category, country, period]);

	return (
		<div className="container mx-auto py-6 space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold flex items-center gap-2">
					<TrendingUp className="h-8 w-8" />
					Trending & Niche Analysis
				</h1>
				<p className="text-muted-foreground mt-1">
					Discover emerging trends and top-performing content in any niche
				</p>
			</div>

			{/* Filters */}
			<Card className="p-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					{/* Category selector */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Category</label>
						<Select value={category} onValueChange={setCategory}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CATEGORIES.map((cat) => (
									<SelectItem key={cat.id} value={cat.id}>
										{cat.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Country selector */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Country</label>
						<Select value={country} onValueChange={setCountry}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{COUNTRIES.map((c) => (
									<SelectItem key={c.code} value={c.code}>
										{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Period toggle */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Period</label>
						<div className="flex gap-1">
							{(["24h", "7d", "30d"] as Period[]).map((p) => (
								<Button
									key={p}
									variant={period === p ? "default" : "outline"}
									size="sm"
									onClick={() => setPeriod(p)}
								>
									{p}
								</Button>
							))}
						</div>
					</div>

					{/* Search button */}
					<div className="space-y-2">
						<label className="text-sm font-medium">&nbsp;</label>
						<Button
							className="w-full"
							disabled={state.isLoading}
							onClick={() => {
								// Re-trigger fetch by updating a state
								setState((prev) => ({ ...prev }));
							}}
						>
							<Search className="h-4 w-4 mr-2" />
							{state.isLoading ? "Loading..." : "Refresh"}
						</Button>
					</div>
				</div>
			</Card>

			{/* Error state */}
			{state.error && (
				<Card className="p-6 border-destructive">
					<p className="text-destructive">{state.error}</p>
				</Card>
			)}

			{/* Results */}
			{state.data && (
				<div className="space-y-6">
					{/* Summary stats */}
					<div className="grid grid-cols-3 gap-4">
						<Card className="p-4 text-center">
							<p className="text-2xl font-bold text-green-600">
								{state.data.trends.emerging.length}
							</p>
							<p className="text-sm text-muted-foreground">Emerging</p>
						</Card>
						<Card className="p-4 text-center">
							<p className="text-2xl font-bold text-blue-600">
								{state.data.trends.stable.length}
							</p>
							<p className="text-sm text-muted-foreground">Stable</p>
						</Card>
						<Card className="p-4 text-center">
							<p className="text-2xl font-bold text-red-600">
								{state.data.trends.declining.length}
							</p>
							<p className="text-sm text-muted-foreground">Declining</p>
						</Card>
					</div>

					{/* Tabs for different views */}
					<Tabs defaultValue="overview" className="space-y-4">
						<TabsList>
							<TabsTrigger value="overview">Overview</TabsTrigger>
							<TabsTrigger value="keywords">
								<Tag className="h-4 w-4 mr-1" />
								Keywords
							</TabsTrigger>
							<TabsTrigger value="channels">
								<Users className="h-4 w-4 mr-1" />
								Channels
							</TabsTrigger>
						</TabsList>

						{/* Overview tab */}
						<TabsContent value="overview" className="space-y-6">
							{/* Chart */}
							<Card className="p-4">
								<h3 className="font-medium mb-4">View Trend</h3>
								<TrendChart
									videos={[
										...state.data.trends.emerging,
										...state.data.trends.stable,
										...state.data.trends.declining,
									]}
									trendType="views"
									height={250}
									showLegend
									isLoading={state.isLoading}
								/>
							</Card>

							{/* Emerging videos */}
							{state.data.trends.emerging.length > 0 && (
								<div>
									<h3 className="font-medium mb-3 flex items-center gap-2">
										<TrendingUp className="h-5 w-5 text-green-600" />
										Emerging Videos
									</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
										{state.data.trends.emerging.slice(0, 8).map((video) => (
											<VideoCard key={video.id} video={video} />
										))}
									</div>
								</div>
							)}

							{/* Stable videos */}
							{state.data.trends.stable.length > 0 && (
								<div>
									<h3 className="font-medium mb-3 flex items-center gap-2">
										<Minus className="h-5 w-5 text-blue-600" />
										Stable Videos
									</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
										{state.data.trends.stable.slice(0, 8).map((video) => (
											<VideoCard key={video.id} video={video} />
										))}
									</div>
								</div>
							)}

							{/* Declining videos */}
							{state.data.trends.declining.length > 0 && (
								<div>
									<h3 className="font-medium mb-3 flex items-center gap-2">
										<TrendingDown className="h-5 w-5 text-red-600" />
										Declining Videos
									</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
										{state.data.trends.declining.slice(0, 8).map((video) => (
											<VideoCard key={video.id} video={video} />
										))}
									</div>
								</div>
							)}
						</TabsContent>

						{/* Keywords tab */}
						<TabsContent value="keywords">
							<Card className="p-6">
								<h3 className="font-medium mb-4">Trending Keywords</h3>
								<KeywordCloud keywords={state.data.keywords} />
							</Card>
						</TabsContent>

						{/* Channels tab */}
						<TabsContent value="channels">
							<Card className="p-6">
								<h3 className="font-medium mb-4">Top Performing Channels</h3>
								<ChannelList channels={state.data.channels} />
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			)}

			{/* Initial empty state */}
			{!state.data && !state.isLoading && !state.error && (
				<Card className="p-12 text-center">
					<TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<h3 className="text-lg font-medium mb-2">No Trends Yet</h3>
					<p className="text-muted-foreground">
						Select a category and country to discover trending content
					</p>
				</Card>
			)}
		</div>
	);
}
