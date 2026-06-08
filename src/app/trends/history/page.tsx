/**
 * T7.6: Trend History Page
 * Displays historical TrendSnapshot data with date range picker
 */

"use client";

import { useState, useEffect } from "react";
import { Calendar, TrendingUp, BarChart3, Clock, Trash2 } from "lucide-react";
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
import { TrendChart } from "@/components/TrendChart";
import { cn } from "@/lib/utils";

// Types
interface TrendSnapshotRecord {
	id: string;
	categoryId: string;
	country: string;
	capturedAt: string;
	videoIds: string[];
}

interface TrendHistoryItem {
	snapshot: TrendSnapshotRecord;
	videoCount: number;
}

interface AggregationData {
	date: string;
	count: number;
}

// YouTube categories
const CATEGORIES = [
	{ id: "1", name: "Film & Animation" },
	{ id: "10", name: "Music" },
	{ id: "17", name: "Sports" },
	{ id: "20", name: "Gaming" },
	{ id: "22", name: "People & Blogs" },
	{ id: "23", name: "Comedy" },
	{ id: "24", name: "Entertainment" },
	{ id: "25", name: "News & Politics" },
	{ id: "26", name: "Howto & Style" },
	{ id: "27", name: "Education" },
	{ id: "28", name: "Science & Technology" },
];

// Countries
const COUNTRIES = [
	{ code: "US", name: "United States" },
	{ code: "GB", name: "United Kingdom" },
	{ code: "DE", name: "Germany" },
	{ code: "FR", name: "France" },
	{ code: "BR", name: "Brazil" },
	{ code: "MX", name: "Mexico" },
	{ code: "JP", name: "Japan" },
	{ code: "KR", name: "South Korea" },
	{ code: "IN", name: "India" },
];

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Get category name by ID
 */
function getCategoryName(id: string): string {
	const cat = CATEGORIES.find((c) => c.id === id);
	return cat?.name || id;
}

/**
 * History list item component
 */
function HistoryListItem({
	item,
	onClick,
	isSelected,
}: {
	item: TrendHistoryItem;
	onClick: () => void;
	isSelected: boolean;
}) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"w-full text-left p-4 rounded-lg transition-colors",
				"hover:bg-muted/50 border",
				isSelected ? "bg-primary/5 border-primary/20" : "border-transparent",
			)}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<Clock className="h-4 w-4 text-muted-foreground" />
					<span className="font-medium">
						{formatDate(item.snapshot.capturedAt)}
					</span>
				</div>
				<Badge variant="secondary">{item.videoCount} videos</Badge>
			</div>
			<div className="flex gap-2 text-xs text-muted-foreground">
				<span>{getCategoryName(item.snapshot.categoryId)}</span>
				<span>•</span>
				<span>{item.snapshot.country}</span>
			</div>
		</button>
	);
}

/**
 * Aggregation chart component (simple bar chart using divs)
 */
function SimpleAggregationChart({ data }: { data: AggregationData[] }) {
	if (data.length === 0) {
		return <p className="text-muted-foreground text-sm">No data available</p>;
	}

	const maxCount = Math.max(...data.map((d) => d.count), 1);

	return (
		<div className="flex items-end gap-1 h-32">
			{data.map((item, index) => {
				const height = (item.count / maxCount) * 100;
				return (
					<div
						key={index}
						className="flex-1 flex flex-col items-center gap-1"
						title={`${item.date}: ${item.count} videos`}
					>
						<div
							className="w-full bg-primary/60 rounded-t transition-all hover:bg-primary"
							style={{ height: `${Math.max(height, 4)}%` }}
						/>
						<span className="text-xs text-muted-foreground rotate-45 origin-top-left">
							{item.date.slice(5)}
						</span>
					</div>
				);
			})}
		</div>
	);
}

/**
 * Trend History Page
 */
export default function TrendHistoryPage() {
	const [category, setCategory] = useState<string>("10");
	const [country, setCountry] = useState<string>("US");
	const [history, setHistory] = useState<TrendHistoryItem[]>([]);
	const [aggregation, setAggregation] = useState<AggregationData[]>([]);
	const [selectedSnapshot, setSelectedSnapshot] =
		useState<TrendHistoryItem | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch history data
	useEffect(() => {
		const fetchHistory = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const params = new URLSearchParams({
					categoryId: category,
					country: country,
				});

				const response = await fetch(`/api/trends/history?${params}`);

				if (!response.ok) {
					throw new Error("Failed to fetch history");
				}

				const data = await response.json();
				setHistory(data.snapshots || []);
				setAggregation(data.aggregation || []);

				// Select first item if available
				if (data.snapshots?.length > 0 && !selectedSnapshot) {
					setSelectedSnapshot(data.snapshots[0]);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
			} finally {
				setIsLoading(false);
			}
		};

		fetchHistory();
	}, [category, country]);

	// Refresh data when filters change
	const handleRefresh = () => {
		setSelectedSnapshot(null);
		// Trigger useEffect by updating state
		const newCat = category;
		setCategory("");
		setTimeout(() => setCategory(newCat), 0);
	};

	return (
		<div className="container mx-auto py-6 space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold flex items-center gap-2">
					<BarChart3 className="h-8 w-8" />
					Trend History
				</h1>
				<p className="text-muted-foreground mt-1">
					View historical trend snapshots and analyze patterns over time
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

					{/* Refresh button */}
					<div className="space-y-2">
						<label className="text-sm font-medium">&nbsp;</label>
						<Button
							variant="outline"
							onClick={handleRefresh}
							disabled={isLoading}
							className="w-full"
						>
							<Calendar className="h-4 w-4 mr-2" />
							{isLoading ? "Loading..." : "Refresh"}
						</Button>
					</div>
				</div>
			</Card>

			{/* Error state */}
			{error && (
				<Card className="p-6 border-destructive">
					<p className="text-destructive">{error}</p>
				</Card>
			)}

			{/* Content */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* History list */}
				<div className="lg:col-span-1">
					<Card className="p-4">
						<h3 className="font-medium mb-4">Recent Snapshots</h3>
						{isLoading ? (
							<div className="space-y-2">
								{Array.from({ length: 5 }).map((_, i) => (
									<div
										key={i}
										className="h-16 bg-muted animate-pulse rounded"
									/>
								))}
							</div>
						) : history.length > 0 ? (
							<div className="space-y-2 max-h-[600px] overflow-y-auto">
								{history.map((item) => (
									<HistoryListItem
										key={item.snapshot.id}
										item={item}
										onClick={() => setSelectedSnapshot(item)}
										isSelected={
											selectedSnapshot?.snapshot.id === item.snapshot.id
										}
									/>
								))}
							</div>
						) : (
							<p className="text-muted-foreground text-sm">
								No history available for this category/country
							</p>
						)}
					</Card>
				</div>

				{/* Main content area */}
				<div className="lg:col-span-2 space-y-6">
					{/* Aggregation chart */}
					<Card className="p-4">
						<h3 className="font-medium mb-4">
							<TrendingUp className="h-5 w-5 inline mr-2" />
							Trend Activity Over Time
						</h3>
						<SimpleAggregationChart data={aggregation} />
					</Card>

					{/* Selected snapshot detail */}
					{selectedSnapshot ? (
						<Card className="p-4">
							<div className="flex items-center justify-between mb-4">
								<h3 className="font-medium">Snapshot Details</h3>
								<Badge variant="outline">
									{formatDate(selectedSnapshot.snapshot.capturedAt)}
								</Badge>
							</div>

							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
								<div>
									<p className="text-xs text-muted-foreground">Category</p>
									<p className="font-medium">
										{getCategoryName(selectedSnapshot.snapshot.categoryId)}
									</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Country</p>
									<p className="font-medium">
										{selectedSnapshot.snapshot.country}
									</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Videos</p>
									<p className="font-medium">{selectedSnapshot.videoCount}</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Snapshot ID</p>
									<p className="font-medium text-xs truncate">
										{selectedSnapshot.snapshot.id}
									</p>
								</div>
							</div>

							{/* Mock chart for selected snapshot */}
							<div className="border-t pt-4">
								<p className="text-sm text-muted-foreground mb-4">
									This snapshot captured {selectedSnapshot.videoCount} trending
									videos
								</p>
							</div>
						</Card>
					) : (
						<Card className="p-12 text-center">
							<BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<h3 className="text-lg font-medium mb-2">Select a Snapshot</h3>
							<p className="text-muted-foreground">
								Choose a snapshot from the list to view its details
							</p>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
