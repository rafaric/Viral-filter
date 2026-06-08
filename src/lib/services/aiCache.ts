/**
 * T4.7: AI Cache Helper
 * Manages AI analysis result caching with 7-day TTL and hash-based deduplication
 */

import prisma from "@/lib/db";

// TTL for AI analysis cache: 7 days in milliseconds
const AI_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate content hash for cache key
 */
export function generateAnalysisHash(
	type: string,
	data: Record<string, unknown>,
): string {
	const content = JSON.stringify({ type, data });
	let hash = 0;
	for (let i = 0; i < content.length; i++) {
		const char = content.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(16);
}

/**
 * Check if a cached analysis has expired
 */
function isExpired(fetchedAt: Date): boolean {
	return Date.now() - fetchedAt.getTime() > AI_CACHE_TTL;
}

export interface AICacheEntry {
	id: string;
	type: string;
	dataHash: string;
	result: string;
	createdAt: Date;
	expiresAt: Date;
}

export class AICacheService {
	/**
	 * Get cached analysis result by hash
	 */
	async getAnalysis(hash: string): Promise<string | null> {
		const entry = await prisma.aIAnalysisCache.findUnique({
			where: { id: hash },
		});

		if (!entry) {
			return null;
		}

		// Check expiration
		if (isExpired(entry.createdAt)) {
			// Clean up expired entry
			await prisma.aIAnalysisCache
				.delete({
					where: { id: hash },
				})
				.catch(() => {});
			return null;
		}

		return entry.result;
	}

	/**
	 * Set cached analysis result
	 */
	async setAnalysis(
		hash: string,
		result: string,
		type?: string,
	): Promise<void> {
		const expiresAt = new Date(Date.now() + AI_CACHE_TTL);

		await prisma.aIAnalysisCache.upsert({
			where: { id: hash },
			create: {
				id: hash,
				type: type || "general",
				dataHash: hash,
				result,
				createdAt: new Date(),
				expiresAt,
			},
			update: {
				result,
				createdAt: new Date(),
				expiresAt,
			},
		});
	}

	/**
	 * Delete a specific cached entry
	 */
	async deleteAnalysis(hash: string): Promise<void> {
		await prisma.aIAnalysisCache
			.delete({
				where: { id: hash },
			})
			.catch(() => {});
	}

	/**
	 * Clear all expired entries
	 */
	async cleanup(): Promise<number> {
		const result = await prisma.aIAnalysisCache.deleteMany({
			where: {
				createdAt: {
					lt: new Date(Date.now() - AI_CACHE_TTL),
				},
			},
		});

		return result.count;
	}

	/**
	 * Clear all cache entries
	 */
	async clearAll(): Promise<void> {
		await prisma.aIAnalysisCache.deleteMany({});
	}

	/**
	 * Get cache statistics
	 */
	async getStats(): Promise<{
		total: number;
		expired: number;
		oldest: Date | null;
		newest: Date | null;
	}> {
		const entries = await prisma.aIAnalysisCache.findMany({
			orderBy: { createdAt: "asc" },
		});

		const now = Date.now();
		let expired = 0;

		for (const entry of entries) {
			if (isExpired(entry.createdAt)) {
				expired++;
			}
		}

		return {
			total: entries.length,
			expired,
			oldest: entries.length > 0 ? entries[0].createdAt : null,
			newest: entries.length > 0 ? entries[entries.length - 1].createdAt : null,
		};
	}

	/**
	 * Check if a result exists (without getting it)
	 */
	async exists(hash: string): Promise<boolean> {
		const entry = await prisma.aIAnalysisCache.findUnique({
			where: { id: hash },
			select: { id: true },
		});

		return entry !== null;
	}
}

// Factory function
export function createAICacheService(): AICacheService {
	return new AICacheService();
}

export default AICacheService;
