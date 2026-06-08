/**
 * T8.2: Import Service
 * Import JSON backup, handle conflicts, restore data
 */

import prisma from "@/lib/db";
import type { Video, Channel } from "@/types";

export type ConflictStrategy = "overwrite" | "skip" | "merge";

export interface ImportOptions {
	conflictStrategy?: ConflictStrategy;
	validateOnly?: boolean;
}

export interface ImportResult {
	success: boolean;
	imported: number;
	skipped: number;
	errors: string[];
	conflicts: number;
}

/**
 * Validate backup structure
 */
export function validateBackup(backup: unknown): { valid: boolean; error?: string } {
	if (!backup || typeof backup !== "object") {
		return { valid: false, error: "Backup must be an object" };
	}

	const b = backup as Record<string, unknown>;

	if (!b.videos || !Array.isArray(b.videos)) {
		return { valid: false, error: "Backup must contain 'videos' array" };
	}

	if (!b.version) {
		// Version is optional but warn
		console.warn("Backup version not specified, assuming 1.0");
	}

	return { valid: true };
}

/**
 * Validate video data
 */
function validateVideo(video: unknown): { valid: boolean; error?: string } {
	if (!video || typeof video !== "object") {
		return { valid: false, error: "Video must be an object" };
	}

	const v = video as Record<string, unknown>;

	if (!v.id || typeof v.id !== "string") {
		return { valid: false, error: "Video must have a valid id" };
	}

	if (!v.title || typeof v.title !== "string") {
		return { valid: false, error: `Video ${v.id} must have a valid title` };
	}

	if (!v.channelId || typeof v.channelId !== "string") {
		return { valid: false, error: `Video ${v.id} must have a valid channelId` };
	}

	if (!v.publishedAt) {
		return { valid: false, error: `Video ${v.id} must have a publishedAt date` };
	}

	// Validate date format
	try {
		new Date(v.publishedAt as string);
	} catch {
		return { valid: false, error: `Video ${v.id} has invalid publishedAt date` };
	}

	return { valid: true };
}

/**
 * Validate channel data
 */
function validateChannel(channel: unknown): { valid: boolean; error?: string } {
	if (!channel || typeof channel !== "object") {
		return { valid: false, error: "Channel must be an object" };
	}

	const c = channel as Record<string, unknown>;

	if (!c.id || typeof c.id !== "string") {
		return { valid: false, error: "Channel must have a valid id" };
	}

	if (!c.title || typeof c.title !== "string") {
		return { valid: false, error: `Channel ${c.id} must have a valid title` };
	}

	return { valid: true };
}

/**
 * Check for existing video
 */
async function videoExists(videoId: string): Promise<boolean> {
	const existing = await prisma.videoCache.findUnique({
		where: { id: videoId },
	});
	return existing !== null;
}

/**
 * Check for existing channel
 */
async function channelExists(channelId: string): Promise<boolean> {
	const existing = await prisma.channelWatchlist.findUnique({
		where: { id: channelId },
	});
	return existing !== null;
}

/**
 * Import a single video
 */
async function importVideo(
	video: Video,
	strategy: ConflictStrategy,
): Promise<{ imported: boolean; skipped: boolean; error?: string }> {
	const exists = await videoExists(video.id);

	if (exists && strategy === "skip") {
		return { imported: false, skipped: true };
	}

	try {
		const publishedAt = new Date(video.publishedAt);

		await prisma.videoCache.upsert({
			where: { id: video.id },
			create: {
				id: video.id,
				title: video.title,
				description: video.description,
				channelId: video.channelId,
				channelTitle: video.channelTitle,
				publishedAt,
				viewCount: video.viewCount,
				likeCount: video.likeCount,
				commentCount: video.commentCount,
				categoryId: video.categoryId,
				tags: video.tags ? JSON.stringify(video.tags) : null,
				thumbnailUrl: video.thumbnailUrl,
				analyzedAt: video.analyzedAt ? new Date(video.analyzedAt) : null,
				aiAnalysis: video.aiAnalysis,
			},
			update:
				strategy === "overwrite"
					? {
							title: video.title,
							description: video.description,
							channelId: video.channelId,
							channelTitle: video.channelTitle,
							publishedAt,
							viewCount: video.viewCount,
							likeCount: video.likeCount,
							commentCount: video.commentCount,
							categoryId: video.categoryId,
							tags: video.tags ? JSON.stringify(video.tags) : null,
							thumbnailUrl: video.thumbnailUrl,
							analyzedAt: video.analyzedAt ? new Date(video.analyzedAt) : null,
							aiAnalysis: video.aiAnalysis,
						}
					: strategy === "merge"
						? {
								// Merge: keep existing values for conflicts, add new ones
								viewCount: video.viewCount,
								likeCount: video.likeCount,
								analyzedAt: video.analyzedAt ? new Date(video.analyzedAt) : undefined,
								aiAnalysis: video.aiAnalysis,
							}
						: {},
		});

		return { imported: true, skipped: false };
	} catch (err) {
		return {
			imported: false,
			skipped: false,
			error: err instanceof Error ? err.message : "Unknown error",
		};
	}
}

/**
 * Import a single channel
 */
async function importChannel(
	channel: Channel,
	strategy: ConflictStrategy,
): Promise<{ imported: boolean; skipped: boolean; error?: string }> {
	const exists = await channelExists(channel.id);

	if (exists && strategy === "skip") {
		return { imported: false, skipped: true };
	}

	try {
		await prisma.channelWatchlist.upsert({
			where: { id: channel.id },
			create: {
				id: channel.id,
				title: channel.title,
				description: channel.description,
				subscriberCount: channel.subscriberCount,
				videoCount: channel.videoCount,
				thumbnailUrl: channel.thumbnailUrl,
				lastAnalyzed: channel.lastAnalyzed ? new Date(channel.lastAnalyzed) : null,
			},
			update:
				strategy === "overwrite"
					? {
							title: channel.title,
							description: channel.description,
							subscriberCount: channel.subscriberCount,
							videoCount: channel.videoCount,
							thumbnailUrl: channel.thumbnailUrl,
							lastAnalyzed: channel.lastAnalyzed ? new Date(channel.lastAnalyzed) : null,
						}
					: strategy === "merge"
						? {
								subscriberCount: channel.subscriberCount,
								videoCount: channel.videoCount,
								lastAnalyzed: channel.lastAnalyzed ? new Date(channel.lastAnalyzed) : undefined,
							}
						: {},
		});

		return { imported: true, skipped: false };
	} catch (err) {
		return {
			imported: false,
			skipped: false,
			error: err instanceof Error ? err.message : "Unknown error",
		};
	}
}

/**
 * Parse JSON backup
 */
export function parseBackup(jsonString: string): unknown {
	try {
		return JSON.parse(jsonString);
	} catch {
		throw new Error("Invalid JSON format");
	}
}

/**
 * Import from JSON backup string
 */
export async function importFromJSON(
	jsonString: string,
	options: ImportOptions = {},
): Promise<ImportResult> {
	const strategy = options.conflictStrategy || "overwrite";
	const result: ImportResult = {
		success: false,
		imported: 0,
		skipped: 0,
		errors: [],
		conflicts: 0,
	};

	// Parse JSON
	const backup = parseBackup(jsonString);

	// Validate structure
	const validation = validateBackup(backup);
	if (!validation.valid) {
		result.errors.push(validation.error || "Invalid backup structure");
		return result;
	}

	const data = backup as {
		videos?: Video[];
		channels?: Channel[];
		trends?: Array<{
			id: string;
			categoryId: string;
			country: string;
			capturedAt: string;
			videoIds: string[];
		}>;
		quota?: Array<{ date: string; used: number }>;
	};

	// Import videos
	if (data.videos && data.videos.length > 0) {
		for (const video of data.videos) {
			const videoValidation = validateVideo(video);
			if (!videoValidation.valid) {
				result.errors.push(videoValidation.error || "Invalid video");
				continue;
			}

			const exists = await videoExists(video.id);
			if (exists) {
				result.conflicts++;
			}

			if (options.validateOnly) {
				result.imported++;
				continue;
			}

			const importResult = await importVideo(video, strategy);
			if (importResult.imported) {
				result.imported++;
			} else if (importResult.skipped) {
				result.skipped++;
			} else if (importResult.error) {
				result.errors.push(`Video ${video.id}: ${importResult.error}`);
			}
		}
	}

	// Import channels
	if (data.channels && data.channels.length > 0) {
		for (const channel of data.channels) {
			const channelValidation = validateChannel(channel);
			if (!channelValidation.valid) {
				result.errors.push(channelValidation.error || "Invalid channel");
				continue;
			}

			const exists = await channelExists(channel.id);
			if (exists) {
				result.conflicts++;
			}

			if (options.validateOnly) {
				result.imported++;
				continue;
			}

			const importResult = await importChannel(channel, strategy);
			if (importResult.imported) {
				result.imported++;
			} else if (importResult.skipped) {
				result.skipped++;
			} else if (importResult.error) {
				result.errors.push(`Channel ${channel.id}: ${importResult.error}`);
			}
		}
	}

	// Import trends
	if (data.trends && data.trends.length > 0 && !options.validateOnly) {
		for (const trend of data.trends) {
			try {
				await prisma.trendSnapshot.create({
					data: {
						categoryId: trend.categoryId,
						country: trend.country,
						videoIds: JSON.stringify(trend.videoIds),
						capturedAt: new Date(trend.capturedAt),
					},
				});
				result.imported++;
			} catch {
				// Trends are less critical, just log
				result.skipped++;
			}
		}
	}

	result.success = result.errors.length === 0;
	return result;
}

/**
 * Get import statistics without importing
 */
export async function getImportStats(jsonString: string): Promise<{
	totalVideos: number;
	totalChannels: number;
	totalTrends: number;
	valid: boolean;
	errors: string[];
}> {
	const stats = {
		totalVideos: 0,
		totalChannels: 0,
		totalTrends: 0,
		valid: false,
		errors: [] as string[],
	};

	try {
		const backup = parseBackup(jsonString);
		const validation = validateBackup(backup);

		if (!validation.valid) {
			stats.errors.push(validation.error || "Invalid backup");
			return stats;
		}

		const data = backup as {
			videos?: Video[];
			channels?: Channel[];
			trends?: unknown[];
		};

		if (data.videos) {
			stats.totalVideos = data.videos.length;
			for (const video of data.videos) {
				const validation = validateVideo(video);
				if (!validation.valid) {
					stats.errors.push(validation.error || "Invalid video");
				}
			}
		}

		if (data.channels) {
			stats.totalChannels = data.channels.length;
			for (const channel of data.channels) {
				const validation = validateChannel(channel);
				if (!validation.valid) {
					stats.errors.push(validation.error || "Invalid channel");
				}
			}
		}

		if (data.trends) {
			stats.totalTrends = data.trends.length;
		}

		stats.valid = true;
	} catch (err) {
		stats.errors.push(err instanceof Error ? err.message : "Unknown error");
	}

	return stats;
}

// Factory function
export function createImportService(): typeof importFromJSON {
	return importFromJSON;
}

export default {
	importFromJSON,
	parseBackup,
	validateBackup,
	getImportStats,
};