/**
 * /api/trends/history route
 * Returns historical TrendSnapshot data with aggregation
 */

import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/trends/history
 * Get historical trend snapshots with optional filters
 * Query params: categoryId, country, startDate, endDate, limit
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		// Parse filters
		const categoryId = searchParams.get("categoryId") || undefined;
		const country = searchParams.get("country") || undefined;
		const startDate = searchParams.get("startDate") || undefined;
		const endDate = searchParams.get("endDate") || undefined;
		const limit = searchParams.get("limit")
			? parseInt(searchParams.get("limit")!, 10)
			: 30;

		// Build where clause
		const where: Record<string, unknown> = {};

		if (categoryId) {
			where.categoryId = categoryId;
		}

		if (country) {
			where.country = country;
		}

		if (startDate || endDate) {
			where.capturedAt = {};
			if (startDate) {
				(where.capturedAt as Record<string, Date>).gte = new Date(startDate);
			}
			if (endDate) {
				(where.capturedAt as Record<string, Date>).lte = new Date(endDate);
			}
		}

		// Fetch snapshots
		const snapshots = await prisma.trendSnapshot.findMany({
			where,
			orderBy: { capturedAt: "desc" },
			take: limit,
		});

		// Parse videoIds and format response
		const formattedSnapshots = snapshots.map((snapshot) => {
			let videoIds: string[] = [];
			try {
				videoIds = JSON.parse(snapshot.videoIds || "[]");
			} catch {
				videoIds = [];
			}

			return {
				id: snapshot.id,
				categoryId: snapshot.categoryId,
				country: snapshot.country,
				capturedAt: snapshot.capturedAt.toISOString(),
				videoIds,
				videoCount: videoIds.length,
			};
		});

		// Generate aggregation data
		const aggregationMap = new Map<string, number>();

		for (const snapshot of snapshots) {
			const dateKey = snapshot.capturedAt.toISOString().split("T")[0];
			let videoIds: string[] = [];
			try {
				videoIds = JSON.parse(snapshot.videoIds || "[]");
			} catch {
				videoIds = [];
			}
			aggregationMap.set(
				dateKey,
				(aggregationMap.get(dateKey) || 0) + videoIds.length,
			);
		}

		const aggregation = Array.from(aggregationMap.entries())
			.map(([date, count]) => ({ date, count }))
			.sort((a, b) => a.date.localeCompare(b.date));

		return NextResponse.json({
			snapshots: formattedSnapshots,
			aggregation,
			total: formattedSnapshots.length,
		});
	} catch (error) {
		console.error("Trend history error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch trend history" },
			{ status: 500 },
		);
	}
}
