/**
 * T5.4: QuotaIndicator Component
 * Shows real-time quota status with color-coded states
 * States: green (<50%), yellow (50-80%), red (>80%)
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { QuotaData } from "@/types";

export interface QuotaIndicatorProps {
	/** API endpoint to fetch quota data */
	endpoint?: string;
	/** Manual quota data (overrides endpoint fetch) */
	data?: QuotaData;
	/** Refresh interval in milliseconds (default: 5 min) */
	refreshInterval?: number;
	/** Show detailed breakdown */
	showDetails?: boolean;
	/** Compact mode (just the bar) */
	compact?: boolean;
	/** Additional CSS classes */
	className?: string;
}

type QuotaLevel = "low" | "medium" | "high";

/**
 * Get quota level based on percentage
 */
function getQuotaLevel(percentage: number): QuotaLevel {
	if (percentage < 50) return "low";
	if (percentage < 80) return "medium";
	return "high";
}

/**
 * Get color class based on quota level
 */
function getColorClass(level: QuotaLevel): string {
	switch (level) {
		case "low":
			return "bg-green-500";
		case "medium":
			return "bg-yellow-500";
		case "high":
			return "bg-red-500";
	}
}

/**
 * Get icon for quota level
 */
function getStatusIcon(level: QuotaLevel) {
	switch (level) {
		case "low":
			return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
		case "medium":
			return <AlertIcon className="h-4 w-4 text-yellow-500" />;
		case "high":
			return <AlertTriangleIcon className="h-4 w-4 text-red-500" />;
	}
}

/**
 * QuotaIndicator - Displays real-time quota usage status
 */
export function QuotaIndicator({
	endpoint = "/api/quota",
	data,
	refreshInterval = 5 * 60 * 1000, // 5 minutes
	showDetails = false,
	compact = false,
	className,
}: QuotaIndicatorProps) {
	// State
	const [quotaData, setQuotaData] = useState<QuotaData | null>(data || null);
	const [isLoading, setIsLoading] = useState(!data);
	const [error, setError] = useState<string | null>(null);

	// Fetch quota data
	const fetchQuota = async () => {
		if (!endpoint) return;

		try {
			const response = await fetch(endpoint);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			const result = await response.json();
			setQuotaData(result);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch quota");
		} finally {
			setIsLoading(false);
		}
	};

	// Initial fetch and polling
	useEffect(() => {
		if (data) {
			setQuotaData(data);
			return;
		}

		fetchQuota();

		if (refreshInterval > 0) {
			const intervalId = setInterval(fetchQuota, refreshInterval);
			return () => clearInterval(intervalId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [endpoint, data]);

	// Calculate derived values
	const used = quotaData?.daily.used ?? 0;
	const limit = quotaData?.daily.limit ?? 10000;
	const remaining = quotaData?.daily.remaining ?? limit;
	const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
	const level = getQuotaLevel(percentage);

	// Format numbers for display
	const formatNumber = (n: number) => n.toLocaleString();

	// Reset time formatting
	const resetAt = quotaData?.daily.resetAt
		? new Date(quotaData.daily.resetAt).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			})
		: "24:00";

	// Loading state
	if (isLoading && !quotaData) {
		return (
			<div className={cn("flex items-center gap-2", className)}>
				<div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
				<span className="text-sm text-muted-foreground">Loading...</span>
			</div>
		);
	}

	// Error state
	if (error && !quotaData) {
		return (
			<div className={cn("flex items-center gap-2", className)}>
				<AlertTriangleIcon className="h-4 w-4 text-destructive" />
				<span className="text-sm text-destructive">Quota error</span>
			</div>
		);
	}

	// Compact mode
	if (compact) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className={cn("flex items-center gap-2", className)}>
							<Progress value={percentage} className="w-20 h-2" />
							<span className="text-xs text-muted-foreground">
								{formatNumber(remaining)}
							</span>
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>
							{formatNumber(used)} / {formatNumber(limit)} used ({percentage}%)
						</p>
						<p className="text-xs text-muted-foreground">Resets at {resetAt}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	// Full mode
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div
						className={cn(
							"flex flex-col gap-1 p-3 rounded-lg border bg-card",
							level === "high" && "border-destructive/50 bg-destructive/5",
							className,
						)}
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								{getStatusIcon(level)}
								<span className="text-sm font-medium">Quota</span>
							</div>
							<span className="text-sm text-muted-foreground">
								{formatNumber(remaining)} remaining
							</span>
						</div>

						<Progress value={percentage} className="h-2" />

						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<span>
								{formatNumber(used)} / {formatNumber(limit)}
							</span>
							<span>Resets at {resetAt}</span>
						</div>

						{showDetails && quotaData?.weekly && (
							<div className="mt-2 pt-2 border-t">
								<div className="flex items-center justify-between text-xs">
									<span className="text-muted-foreground">Weekly usage:</span>
									<span className="font-medium">
										{formatNumber(quotaData.weekly.used)}
									</span>
								</div>
								<div className="flex items-center justify-between text-xs">
									<span className="text-muted-foreground">Trend:</span>
									<span
										className={cn(
											quotaData.weekly.trend === "increasing" && "text-red-500",
											quotaData.weekly.trend === "decreasing" &&
												"text-green-500",
										)}
									>
										{quotaData.weekly.trend}
									</span>
								</div>
							</div>
						)}

						{level === "high" && (
							<div className="mt-2 text-xs text-destructive">
								⚠️ Quota is running low. Consider caching results.
							</div>
						)}
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>Daily API quota usage and reset time</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

/**
 * Check circle icon
 */
function CheckCircleIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
			<polyline points="22 4 12 14.01 9 11.01" />
		</svg>
	);
}

/**
 * Alert icon
 */
function AlertIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<circle cx="12" cy="12" r="10" />
			<line x1="12" x2="12" y1="8" y2="12" />
			<line x1="12" x2="12.01" y1="16" y2="16" />
		</svg>
	);
}

/**
 * Alert triangle icon
 */
function AlertTriangleIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
			<line x1="12" x2="12" y1="9" y2="13" />
			<line x1="12" x2="12.01" y1="17" y2="17" />
		</svg>
	);
}

export default QuotaIndicator;
