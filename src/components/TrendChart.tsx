/**
 * T7.3: TrendChart Component
 * Lightweight SVG-based trend visualization
 */

"use client";

import { cn } from "@/lib/utils";
import type { Video } from "@/types";

export interface TrendChartProps {
	/** Videos to display in the chart */
	videos: Video[];
	/** Type of trend to display */
	trendType?: "views" | "likes" | "engagement";
	/** Height of the chart */
	height?: number;
	/** Show legend */
	showLegend?: boolean;
	/** Loading state */
	isLoading?: boolean;
	/** Empty state message */
	emptyMessage?: string;
	className?: string;
}

interface DataPoint {
	id: string;
	title: string;
	value: number;
	color: string;
}

const COLORS = {
	views: "#3b82f6", // blue
	likes: "#22c55e", // green
	engagement: "#f59e0b", // amber
};

/**
 * Format number for display
 */
function formatNumber(num: number): string {
	if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
	if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
	return num.toString();
}

/**
 * Calculate trend data from videos
 */
function calculateData(
	videos: Video[],
	trendType: "views" | "likes" | "engagement",
): DataPoint[] {
	return videos.slice(0, 10).map((video, index) => {
		let value: number;
		let color: string;

		switch (trendType) {
			case "views":
				value = video.viewCount || 0;
				color = COLORS.views;
				break;
			case "likes":
				value = video.likeCount || 0;
				color = COLORS.likes;
				break;
			case "engagement":
				value = (video.likeCount || 0) + (video.commentCount || 0) * 2;
				color = COLORS.engagement;
				break;
			default:
				value = video.viewCount || 0;
				color = COLORS.views;
		}

		return {
			id: video.id,
			title:
				video.title.length > 25
					? video.title.slice(0, 25) + "..."
					: video.title,
			value,
			color,
		};
	});
}

/**
 * Loading Skeleton Component
 */
function ChartSkeleton({ height }: { height: number }) {
	return (
		<div
			className="animate-pulse bg-muted rounded"
			style={{ height: `${height}px` }}
		>
			<div className="flex items-end justify-around h-full p-4 gap-2">
				{Array.from({ length: 5 }).map((_, i) => (
					<div
						key={i}
						className="bg-muted-foreground/20 rounded-t"
						style={{
							height: `${30 + Math.random() * 60}%`,
							width: "20px",
						}}
					/>
				))}
			</div>
		</div>
	);
}

/**
 * Empty State Component
 */
function ChartEmpty({ message }: { message?: string }) {
	return (
		<div className="flex items-center justify-center bg-muted/50 rounded">
			<p className="text-muted-foreground text-sm">
				{message || "No data available"}
			</p>
		</div>
	);
}

/**
 * Bar Chart SVG Component
 */
function BarChart({
	data,
	height,
	showLegend,
}: {
	data: DataPoint[];
	height: number;
	showLegend?: boolean;
}) {
	if (data.length === 0) {
		return <ChartEmpty />;
	}

	const maxValue = Math.max(...data.map((d) => d.value), 1);
	const padding = {
		top: 20,
		right: 20,
		bottom: showLegend ? 60 : 30,
		left: 50,
	};
	const chartWidth = 100; // percentage
	const chartHeight = height - padding.top - padding.bottom;
	const barWidth =
		(chartWidth - padding.left - padding.right) / data.length - 4;
	const yAxisSteps = 4;

	return (
		<div className="relative">
			<svg
				viewBox={`0 0 100 ${height}`}
				className="w-full"
				preserveAspectRatio="xMidYMid meet"
			>
				{/* Y-axis labels and grid lines */}
				{Array.from({ length: yAxisSteps + 1 }).map((_, i) => {
					const value = (maxValue / yAxisSteps) * (yAxisSteps - i);
					const y = padding.top + (chartHeight / yAxisSteps) * i;
					return (
						<g key={i}>
							<line
								x1={padding.left}
								y1={y}
								x2={chartWidth - padding.right}
								y2={y}
								stroke="currentColor"
								strokeOpacity="0.1"
								strokeWidth="0.5"
							/>
							<text
								x={padding.left - 2}
								y={y + 3}
								textAnchor="end"
								fontSize="3"
								fill="currentColor"
								className="text-[8px] fill-muted-foreground"
							>
								{formatNumber(value)}
							</text>
						</g>
					);
				})}

				{/* Bars */}
				{data.map((point, index) => {
					const barHeight = (point.value / maxValue) * chartHeight;
					const x =
						padding.left +
						(index * (chartWidth - padding.left - padding.right)) /
							data.length +
						2;
					const y = padding.top + chartHeight - barHeight;

					return (
						<g key={point.id}>
							{/* Bar */}
							<rect
								x={x}
								y={y}
								width={barWidth}
								height={barHeight}
								fill={point.color}
								rx="1"
								className="transition-all duration-300 hover:opacity-80"
							/>

							{/* Value label on hover would go here */}
							<text
								x={x + barWidth / 2}
								y={y - 2}
								textAnchor="middle"
								fontSize="2.5"
								fill="currentColor"
								className="text-[7px] fill-muted-foreground"
							>
								{formatNumber(point.value)}
							</text>
						</g>
					);
				})}
			</svg>

			{/* Legend */}
			{showLegend && (
				<div className="flex flex-wrap justify-center gap-4 mt-2 text-xs text-muted-foreground">
					{data.map((point) => (
						<div key={point.id} className="flex items-center gap-1">
							<div
								className="w-2 h-2 rounded-full"
								style={{ backgroundColor: point.color }}
							/>
							<span className="truncate max-w-[100px]" title={point.title}>
								{point.title}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

/**
 * TrendChart Component
 * Displays trend data as a simple bar chart using SVG
 */
export function TrendChart({
	videos,
	trendType = "views",
	height = 200,
	showLegend = false,
	isLoading = false,
	emptyMessage,
	className = "",
}: TrendChartProps) {
	// Loading state
	if (isLoading) {
		return (
			<div className={cn("w-full", className)}>
				<ChartSkeleton height={height} />
			</div>
		);
	}

	// Empty state
	if (!videos || videos.length === 0) {
		return (
			<div
				className={cn("w-full flex items-center justify-center", className)}
				style={{ height: `${height}px` }}
			>
				<ChartEmpty message={emptyMessage} />
			</div>
		);
	}

	// Calculate chart data
	const data = calculateData(videos, trendType);

	return (
		<div className={cn("w-full", className)}>
			<BarChart data={data} height={height} showLegend={showLegend} />
		</div>
	);
}

export default TrendChart;
