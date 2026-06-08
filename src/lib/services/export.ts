/**
 * T8.1: Export Service
 * Export videos, search results, watchlist, and trend data to JSON and CSV
 */

import prisma from "@/lib/db";
import type { Video, Channel } from "@/types";

export interface ExportOptions {
	format: "json" | "csv";
	includeVideos?: boolean;
	includeChannels?: boolean;
	includeTrends?: boolean;
	includeQuota?: boolean;
}

export interface ExportResult {
	success: boolean;
	data: string;
	filename: string;
	itemCount: number;
}

/**
 * Convert video to CSV row
 */
function videoToCSVRow(video: Video, headers: string[]): string {
	return headers
		.map((h) => {
			const value = video[h as keyof Video];
			if (value === undefined || value === null) return "";
			if (typeof value === "object") return `"${JSON.stringify(value)}"`;
			if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
			return String(value);
		})
		.join(",");
}

/**
 * Convert channel to CSV row
 */
function channelToCSVRow(channel: Channel, headers: string[]): string {
	return headers
		.map((h) => {
			const value = channel[h as keyof Channel];
			if (value === undefined || value === null) return "";
			if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
			return String(value);
		})
		.join(",");
}

/**
 * Export videos to JSON
 */
export async function exportVideosToJSON(): Promise<string> {
	const videos = await prisma.videoCache.findMany({
		orderBy: { fetchedAt: "desc" },
	});

	const formattedVideos: Video[] = videos.map((v) => ({
		id: v.id,
		title: v.title,
		description: v.description || undefined,
		channelId: v.channelId,
		channelTitle: v.channelTitle,
		publishedAt: v.publishedAt.toISOString(),
		viewCount: v.viewCount || undefined,
		likeCount: v.likeCount || undefined,
		commentCount: v.commentCount || undefined,
		categoryId: v.categoryId || undefined,
		tags: v.tags ? JSON.parse(v.tags) : undefined,
		thumbnailUrl: v.thumbnailUrl || undefined,
		fetchedAt: v.fetchedAt.toISOString(),
		analyzedAt: v.analyzedAt?.toISOString(),
		aiAnalysis: v.aiAnalysis || undefined,
	}));

	return JSON.stringify(formattedVideos, null, 2);
}

/**
 * Export videos to CSV
 */
export async function exportVideosToCSV(): Promise<string> {
	const videos = await prisma.videoCache.findMany({
		orderBy: { fetchedAt: "desc" },
	});

	const headers = ["id", "title", "description", "channelId", "channelTitle", "publishedAt", "viewCount", "likeCount", "commentCount", "categoryId", "tags", "thumbnailUrl", "fetchedAt", "analyzedAt"];

	const rows = videos.map((v) => {
		const video: Video = {
			id: v.id,
			title: v.title,
			description: v.description || undefined,
			channelId: v.channelId,
			channelTitle: v.channelTitle,
			publishedAt: v.publishedAt.toISOString(),
			viewCount: v.viewCount || undefined,
			likeCount: v.likeCount || undefined,
			commentCount: v.commentCount || undefined,
			categoryId: v.categoryId || undefined,
			tags: v.tags ? JSON.parse(v.tags) : undefined,
			thumbnailUrl: v.thumbnailUrl || undefined,
			fetchedAt: v.fetchedAt.toISOString(),
			analyzedAt: v.analyzedAt?.toISOString(),
		};
		return videoToCSVRow(video, headers);
	});

	return [headers.join(","), ...rows].join("\n");
}

/**
 * Export channels (watchlist) to JSON
 */
export async function exportChannelsToJSON(): Promise<string> {
	const channels = await prisma.channelWatchlist.findMany({
		orderBy: { addedAt: "desc" },
	});

	const formattedChannels: Channel[] = channels.map((c) => ({
		id: c.id,
		title: c.title,
		description: c.description || undefined,
		subscriberCount: c.subscriberCount || undefined,
		videoCount: c.videoCount || undefined,
		thumbnailUrl: c.thumbnailUrl || undefined,
		addedAt: c.addedAt.toISOString(),
		lastAnalyzed: c.lastAnalyzed?.toISOString(),
	}));

	return JSON.stringify(formattedChannels, null, 2);
}

/**
 * Export channels to CSV
 */
export async function exportChannelsToCSV(): Promise<string> {
	const channels = await prisma.channelWatchlist.findMany({
		orderBy: { addedAt: "desc" },
	});

	const headers = ["id", "title", "description", "subscriberCount", "videoCount", "thumbnailUrl", "addedAt", "lastAnalyzed"];

	const rows = channels.map((c) => {
		const channel: Channel = {
			id: c.id,
			title: c.title,
			description: c.description || undefined,
			subscriberCount: c.subscriberCount || undefined,
			videoCount: c.videoCount || undefined,
			thumbnailUrl: c.thumbnailUrl || undefined,
			addedAt: c.addedAt.toISOString(),
			lastAnalyzed: c.lastAnalyzed?.toISOString(),
		};
		return channelToCSVRow(channel, headers);
	});

	return [headers.join(","), ...rows].join("\n");
}

/**
 * Export trends to JSON
 */
export async function exportTrendsToJSON(): Promise<string> {
	const trends = await prisma.trendSnapshot.findMany({
		orderBy: { capturedAt: "desc" },
		take: 100, // Limit to last 100 snapshots
	});

	const formattedTrends = trends.map((t) => ({
		id: t.id,
		categoryId: t.categoryId,
		country: t.country,
		capturedAt: t.capturedAt.toISOString(),
		videoIds: JSON.parse(t.videoIds),
	}));

	return JSON.stringify(formattedTrends, null, 2);
}

/**
 * Export quota usage to JSON
 */
export async function exportQuotaToJSON(): Promise<string> {
	const quotaRecords = await prisma.quotaUsage.findMany({
		orderBy: { date: "desc" },
		take: 30, // Last 30 days
	});

	return JSON.stringify(
		quotaRecords.map((q) => ({
			date: q.date,
			used: q.used,
			updatedAt: q.updatedAt.toISOString(),
		})),
		null,
		2,
	);
}

/**
 * Export all data (full backup)
 */
export async function exportFullBackup(): Promise<string> {
	const [videos, channels, trends, quota] = await Promise.all([
		prisma.videoCache.findMany({ orderBy: { fetchedAt: "desc" } }),
		prisma.channelWatchlist.findMany({ orderBy: { addedAt: "desc" } }),
		prisma.trendSnapshot.findMany({ orderBy: { capturedAt: "desc" }, take: 100 }),
		prisma.quotaUsage.findMany({ orderBy: { date: "desc" }, take: 30 }),
	]);

	const backup = {
		exportedAt: new Date().toISOString(),
		version: "1.0",
		generatedBy: "viral-filter",
		videos: videos.map((v) => ({
			id: v.id,
			title: v.title,
			description: v.description || undefined,
			channelId: v.channelId,
			channelTitle: v.channelTitle,
			publishedAt: v.publishedAt.toISOString(),
			viewCount: v.viewCount || undefined,
			likeCount: v.likeCount || undefined,
			commentCount: v.commentCount || undefined,
			categoryId: v.categoryId || undefined,
			tags: v.tags ? JSON.parse(v.tags) : undefined,
			thumbnailUrl: v.thumbnailUrl || undefined,
			fetchedAt: v.fetchedAt.toISOString(),
			analyzedAt: v.analyzedAt?.toISOString(),
			aiAnalysis: v.aiAnalysis || undefined,
		})),
		channels: channels.map((c) => ({
			id: c.id,
			title: c.title,
			description: c.description || undefined,
			subscriberCount: c.subscriberCount || undefined,
			videoCount: c.videoCount || undefined,
			thumbnailUrl: c.thumbnailUrl || undefined,
			addedAt: c.addedAt.toISOString(),
			lastAnalyzed: c.lastAnalyzed?.toISOString(),
		})),
		trends: trends.map((t) => ({
			id: t.id,
			categoryId: t.categoryId,
			country: t.country,
			capturedAt: t.capturedAt.toISOString(),
			videoIds: JSON.parse(t.videoIds),
		})),
		quota: quota.map((q) => ({
			date: q.date,
			used: q.used,
			updatedAt: q.updatedAt.toISOString(),
		})),
	};

	return JSON.stringify(backup, null, 2);
}

/**
 * Generic export function with options
 */
export async function exportData(options: ExportOptions): Promise<ExportResult> {
	let data = "";
	let filename = "";
	let itemCount = 0;

	if (options.includeVideos !== false) {
		// Default to include videos
		if (options.format === "csv") {
			data = await exportVideosToCSV();
			filename = `videos-export-${new Date().toISOString().split("T")[0]}.csv`;
			const videos = await prisma.videoCache.count();
			itemCount += videos;
		} else {
			data = await exportVideosToJSON();
			filename = `videos-export-${new Date().toISOString().split("T")[0]}.json`;
			const videos = await prisma.videoCache.count();
			itemCount += videos;
		}
	}

	// If multiple types requested, create full backup
	if (
		(options.includeChannels && options.includeTrends) ||
		(options.includeQuota && (options.includeChannels || options.includeVideos))
	) {
		data = await exportFullBackup();
		filename = `viral-filter-backup-${new Date().toISOString().split("T")[0]}.json`;
		itemCount =
			(await prisma.videoCache.count()) +
			(await prisma.channelWatchlist.count()) +
			(await prisma.trendSnapshot.count()) +
			(await prisma.quotaUsage.count());
	}

	return {
		success: true,
		data,
		filename,
		itemCount,
	};
}

// Factory function
export function createExportService(): typeof exportData {
	return exportData;
}

export default {
	exportVideosToJSON,
	exportVideosToCSV,
	exportChannelsToJSON,
	exportChannelsToCSV,
	exportTrendsToJSON,
	exportQuotaToJSON,
	exportFullBackup,
	exportData,
};