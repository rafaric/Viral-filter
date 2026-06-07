/**
 * Quota Tracker Service
 * Manages YouTube API quota usage with soft/hard limits
 */

import prisma from "@/lib/db";

// Quota constants
const DEFAULT_DAILY_LIMIT = 10000;
const DEFAULT_SOFT_LIMIT_PERCENT = 80;
const DEFAULT_HARD_LIMIT_PERCENT = 95;

export class QuotaExceededError extends Error {
	constructor(
		public used: number,
		public limit: number,
	) {
		super(`Quota exceeded: ${used}/${limit} units used`);
		this.name = "QuotaExceededError";
	}
}

export class QuotaWarningError extends Error {
	constructor(
		public used: number,
		public percentage: number,
	) {
		super(`Quota warning: ${percentage}% (${used} units used)`);
		this.name = "QuotaWarningError";
	}
}

export interface QuotaStatus {
	date: string;
	used: number;
	limit: number;
	remaining: number;
	percentage: number;
	isSoftLimit: boolean;
	isHardLimit: boolean;
	resetAt: string;
}

export interface WeeklyUsage {
	total: number;
	days: number;
	average: number;
	daily: { date: string; used: number }[];
}

export interface QuotaServiceConfig {
	dailyLimit?: number;
	softLimitPercent?: number;
	hardLimitPercent?: number;
}

export class QuotaService {
	private dailyLimit: number;
	private softLimitPercent: number;
	private hardLimitPercent: number;

	constructor(config: QuotaServiceConfig = {}) {
		this.dailyLimit = config.dailyLimit || DEFAULT_DAILY_LIMIT;
		this.softLimitPercent =
			config.softLimitPercent || DEFAULT_SOFT_LIMIT_PERCENT;
		this.hardLimitPercent =
			config.hardLimitPercent || DEFAULT_HARD_LIMIT_PERCENT;
	}

	/**
	 * Get today's date string in YYYY-MM-DD format
	 */
	private getToday(): string {
		return new Date().toISOString().split("T")[0];
	}

	/**
	 * Get the reset timestamp for the next day (midnight UTC)
	 */
	private getResetTimestamp(): string {
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
		tomorrow.setUTCHours(0, 0, 0, 0);
		return tomorrow.toISOString();
	}

	/**
	 * Get current quota status
	 */
	async getStatus(): Promise<QuotaStatus> {
		const today = this.getToday();

		const record = await prisma.quotaUsage.findUnique({
			where: { date: today },
		});

		const used = record?.used || 0;
		const remaining = Math.max(0, this.dailyLimit - used);
		const percentage = Math.round((used / this.dailyLimit) * 100);

		return {
			date: today,
			used,
			limit: this.dailyLimit,
			remaining,
			percentage,
			isSoftLimit: percentage >= this.softLimitPercent,
			isHardLimit: percentage >= this.hardLimitPercent,
			resetAt: this.getResetTimestamp(),
		};
	}

	/**
	 * Increment quota usage by specified amount
	 */
	async increment(amount: number): Promise<number> {
		const today = this.getToday();

		const record = await prisma.quotaUsage.upsert({
			where: { date: today },
			create: {
				date: today,
				used: amount,
			},
			update: {
				used: {
					increment: amount,
				},
			},
		});

		return record.used;
	}

	/**
	 * Check if a request can be made with the given quota cost
	 */
	async canMakeRequest(cost: number): Promise<boolean> {
		const status = await this.getStatus();
		return status.remaining >= cost;
	}

	/**
	 * Check quota and increment if allowed, throws on limit
	 */
	async checkAndIncrement(cost: number): Promise<number> {
		const status = await this.getStatus();

		// Check hard limit
		if (status.remaining < cost) {
			throw new QuotaExceededError(status.used, status.limit);
		}

		// Check soft limit
		const projectedUsage = status.used + cost;
		const projectedPercent = Math.round(
			(projectedUsage / this.dailyLimit) * 100,
		);
		if (projectedPercent >= this.softLimitPercent) {
			throw new QuotaWarningError(projectedUsage, projectedPercent);
		}

		// Increment and return new total
		return this.increment(cost);
	}

	/**
	 * Reset today's quota to zero
	 */
	async resetDaily(): Promise<void> {
		const today = this.getToday();

		await prisma.quotaUsage.upsert({
			where: { date: today },
			create: {
				date: today,
				used: 0,
			},
			update: {
				used: 0,
			},
		});
	}

	/**
	 * Get weekly usage statistics
	 */
	async getWeeklyUsage(): Promise<WeeklyUsage> {
		const today = new Date();
		const weekAgo = new Date(today);
		weekAgo.setDate(weekAgo.getDate() - 7);

		// Get records for the past 7 days
		const records = await prisma.quotaUsage.findMany({
			where: {
				date: {
					gte: weekAgo.toISOString().split("T")[0],
					lte: today.toISOString().split("T")[0],
				},
			},
			orderBy: { date: "asc" },
		});

		const daily = records.map((r) => ({
			date: r.date,
			used: r.used,
		}));

		const total = records.reduce((sum, r) => sum + r.used, 0);
		const days = records.length;
		const average = days > 0 ? Math.round(total / days) : 0;

		return { total, days, average, daily };
	}
}

// Factory function
export function createQuotaService(config?: QuotaServiceConfig): QuotaService {
	return new QuotaService(config);
}

// Default export
export default QuotaService;
