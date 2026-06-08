/**
 * T8.5: Import API Route
 * Upload and restore from backup
 */

import { type NextRequest, NextResponse } from "next/server";
import { importFromJSON, getImportStats } from "@/lib/services/import";

// GET - Preview import stats
export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const preview = searchParams.get("preview");

	if (preview === "true") {
		// Return stats for preview only
		return NextResponse.json(
			{ message: "Send POST request with JSON body to import" },
			{ status: 200 },
		);
	}

	return NextResponse.json(
		{ error: "Use POST to import data" },
		{ status: 400 },
	);
}

// POST - Import data
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// Check for preview mode
		const previewOnly = request.nextUrl.searchParams.get("preview") === "true";

		if (previewOnly) {
			const stats = await getImportStats(JSON.stringify(body));
			return NextResponse.json(stats, {
				status: 200,
				headers: {
					"Cache-Control": "no-store",
				},
			});
		}

		// Perform actual import
		const result = await importFromJSON(JSON.stringify(body), {
			conflictStrategy: "overwrite",
		});

		return NextResponse.json(
			{
				success: result.success,
				imported: result.imported,
				skipped: result.skipped,
				conflicts: result.conflicts,
				errors: result.errors,
			},
			{
				status: result.success ? 200 : 400,
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	} catch (error) {
		console.error("Import error:", error);
		return NextResponse.json(
			{
				error: "Import failed",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 400 },
		);
	}
}