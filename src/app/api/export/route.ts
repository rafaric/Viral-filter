/**
 * T8.5: Export API Route
 * Download export files
 */

import { type NextRequest, NextResponse } from "next/server";
import { exportFullBackup, exportVideosToCSV } from "@/lib/services/export";

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const format = searchParams.get("format") || "json";

	try {
		let data: string;
		let filename: string;
		let mimeType: string;

		if (format === "csv") {
			data = await exportVideosToCSV();
			filename = `videos-export-${new Date().toISOString().split("T")[0]}.csv`;
			mimeType = "text/csv";
		} else {
			data = await exportFullBackup();
			filename = `viral-filter-backup-${new Date().toISOString().split("T")[0]}.json`;
			mimeType = "application/json";
		}

		return new NextResponse(data, {
			status: 200,
			headers: {
				"Content-Type": mimeType,
				"Content-Disposition": `attachment; filename="${filename}"`,
				"Cache-Control": "no-store, no-cache, must-revalidate",
			},
		});
	} catch (error) {
		console.error("Export error:", error);
		return NextResponse.json(
			{ error: "Export failed" },
			{ status: 500 },
		);
	}
}