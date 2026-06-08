/**
 * T5.5: /api/quota - GET Route
 * Returns current quota usage status with daily and weekly stats
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createQuotaService } from "@/lib/services/quota";
import type { QuotaData } from "@/types";

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getToday(): string {
	return new Date().toISOString().split("T")[0];
}

/**
 * Get the reset timestamp for the next day (midnight UTC)
 */
function getResetTimestamp(): string {
	const now = new Date();
	const tomorrow = new Date(now);
	tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
	tomorrow.setUTCHours(0, 0, 0, 0);
	return tomorrow.toISOString();
}

/**
 * Calculate weekly usage trend
 */
function calculateTrend(
	daily: { date: string; used: number }[],
): "increasing" | "stable" | "decreasing" {
	if (daily.length < 2) return "stable";

	// Compare first half average to second half average
	const mid = Math.floor(daily.length / 2);
	const firstHalf = daily.slice(0, mid);
	const secondHalf = daily.slice(mid);

	const firstAvg =
		firstHalf.reduce((sum, d) => sum + d.used, 0) / (firstHalf.length || 1);
	const secondAvg =
		secondHalf.reduce((sum, d) => sum + d.used, 0) / (secondHalf.length || 1);

	// Threshold for trend detection (10% change)
	const threshold = 0.1;
	const changeRatio = (secondAvg - firstAvg) / (firstAvg || 1);

	if (changeRatio > threshold) return "increasing";
	if (changeRatio < -threshold) return "decreasing";
	return "stable";
}

/**
 * GET /api/quota
 * Returns current quota status with daily and weekly data
 */
export async function GET(): Promise<NextResponse> {
	try {
		const quotaService = createQuotaService();
		const status = await quotaService.getStatus();
		const weeklyUsage = await quotaService.getWeeklyUsage();

		const response: QuotaData = {
			daily: {
				used: status.used,
				limit: status.limit,
				remaining: status.remaining,
				resetAt: getResetTimestamp(),
			},
			weekly: {
				used: weeklyUsage.total,
				trend: calculateTrend(weeklyUsage.daily),
			},
		};

		return NextResponse.json(response, {
			status: 200,
			headers: {
				"Cache-Control": "private, max-age=60", // Cache for 1 minute
			},
		});
	} catch (error) {
		console.error("Error fetching quota:", error);

		return NextResponse.json(
			{
				error: "Failed to fetch quota data",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
