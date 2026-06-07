/**
 * T6.8: Watchlist Background Sync Service
 * Smart polling: only fetch new videos since lastAnalyzed
 * Updates lastAnalyzed on ChannelWatchlist
 */

import prisma from "@/lib/db";
import { createYouTubeService } from "./youtube";
import { createCacheService } from "./cache";
import { env } from "@/lib/env";

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const BATCH_SIZE = 10; // Channels to sync per batch

export interface SyncResult {
	channelId: string;
	success: boolean;
	newVideos: number;
	error?: string;
}

export interface WatchlistSyncOptions {
	channelId?: string; // Sync specific channel, or all if not provided
	maxChannels?: number; // Limit channels per sync
}

/**
 * Sync a single channel's videos
 * Only fetches videos published after lastAnalyzed
 */
async function syncChannel(channelId: string, lastAnalyzed?: Date): Promise<{
	newVideos: number;
	error?: string;
}> {
	const youtube = createYouTubeService({ apiKey: env.YOUTUBE_API_KEY });
	const cache = createCacheService();

	try {
		// Get channel info
		const channel = await youtube.getChannel(channelId);
		if (!channel) {
			return { newVideos: 0, error: "Channel not found" };
		}

		// Calculate date filter
		let publishedAfter: string | undefined;
		if (lastAnalyzed) {
			publishedAfter = lastAnalyzed.toISOString();
		} else {
			// Default to last 30 days if never analyzed
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			publishedAfter = thirtyDaysAgo.toISOString();
		}

		// Fetch recent videos from channel
		const result = await youtube.getChannelVideos(channelId, {
			maxResults: BATCH_SIZE,
		});

		// Filter to only new videos (published after lastAnalyzed)
		const newVideos = result.items.filter((video) => {
			const publishedDate = new Date(video.publishedAt);
			return !lastAnalyzed || publishedDate > lastAnalyzed;
		});

		// Cache new videos
		for (const video of newVideos) {
			await cache.setVideo(video);
		}

		// Update lastAnalyzed timestamp
		await prisma.channelWatchlist.update({
			where: { id: channelId },
			data: { lastAnalyzed: new Date() },
		});

		return { newVideos: newVideos.length };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return { newVideos: 0, error: message };
	}
}

/**
 * Sync all watchlist channels
 */
export async function syncWatchlist(options: WatchlistSyncOptions = {}): Promise<SyncResult[]> {
	const { channelId, maxChannels = BATCH_SIZE } = options;

	const results: SyncResult[] = [];

	// Get channels to sync
	const channels = await prisma.channelWatchlist.findMany({
		where: channelId ? { id: channelId } : undefined,
		orderBy: { lastAnalyzed: "asc" }, // Prioritize least recently analyzed
		take: maxChannels,
	});

	for (const channel of channels) {
		const result = await syncChannel(channel.id, channel.lastAnalyzed || undefined);
		results.push({
			channelId: channel.id,
			success: !result.error,
			newVideos: result.newVideos,
			error: result.error,
		});
	}

	return results;
}

/**
 * Get sync statistics
 */
export async function getSyncStats(): Promise<{
	totalChannels: number;
	channelsNeedingSync: number;
	lastSyncInfo: Record<string, Date | null>;
}> {
	const channels = await prisma.channelWatchlist.findMany({
		select: {
			id: true,
			lastAnalyzed: true,
		},
	});

	const thirtyMinutesAgo = new Date(Date.now() - SYNC_INTERVAL_MS);

	return {
		totalChannels: channels.length,
		channelsNeedingSync: channels.filter(
			(ch) => !ch.lastAnalyzed || ch.lastAnalyzed < thirtyMinutesAgo,
		).length,
		lastSyncInfo: channels.reduce(
			(acc, ch) => {
				acc[ch.id] = ch.lastAnalyzed;
				return acc;
			},
			{} as Record<string, Date | null>,
		),
	};
}

/**
 * WatchlistSyncService class for background polling
 */
export class WatchlistSyncService {
	private intervalId: NodeJS.Timeout | null = null;
	private isRunning = false;

	/**
	 * Start background sync polling
	 */
	start(intervalMs = SYNC_INTERVAL_MS): void {
		if (this.isRunning) {
			console.log("WatchlistSyncService already running");
			return;
		}

		this.isRunning = true;
		console.log(`WatchlistSyncService started (interval: ${intervalMs}ms)`);

		// Run immediately on start
		this.runSync();

		// Set up interval
		this.intervalId = setInterval(() => {
			this.runSync();
		}, intervalMs);
	}

	/**
	 * Stop background sync polling
	 */
	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.isRunning = false;
		console.log("WatchlistSyncService stopped");
	}

	/**
	 * Run a single sync cycle
	 */
	private async runSync(): Promise<void> {
		if (!this.isRunning) return;

		console.log("WatchlistSyncService: Running sync cycle...");
		const startTime = Date.now();

		try {
			const results = await syncWatchlist();
			const duration = Date.now() - startTime;

			const successful = results.filter((r) => r.success).length;
			const failed = results.filter((r) => !r.success).length;
			const totalNewVideos = results.reduce((sum, r) => sum + r.newVideos, 0);

			console.log(
				`WatchlistSyncService: Sync complete in ${duration}ms`,
				`- Synced: ${successful}/${results.length} channels`,
				`- Failed: ${failed}`,
				`- New videos: ${totalNewVideos}`,
			);
		} catch (error) {
			console.error("WatchlistSyncService: Sync failed", error);
		}
	}

	/**
	 * Force sync a specific channel
	 */
	async syncChannel(channelId: string): Promise<SyncResult> {
		const channel = await prisma.channelWatchlist.findUnique({
			where: { id: channelId },
		});

		if (!channel) {
			return {
				channelId,
				success: false,
				newVideos: 0,
				error: "Channel not in watchlist",
			};
		}

		const result = await syncChannel(channelId, channel.lastAnalyzed || undefined);
		return {
			channelId,
			success: !result.error,
			newVideos: result.newVideos,
			error: result.error,
		};
	}

	/**
	 * Check if service is running
	 */
	getStatus(): boolean {
		return this.isRunning;
	}
}

// Default export for singleton instance
let syncServiceInstance: WatchlistSyncService | null = null;

export function getWatchlistSyncService(): WatchlistSyncService {
	if (!syncServiceInstance) {
		syncServiceInstance = new WatchlistSyncService();
	}
	return syncServiceInstance;
}

export default WatchlistSyncService;