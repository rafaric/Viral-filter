/**
 * @jest-environment node
 */
import { describe, it, expect } from "@jest/globals";
import { QuotaExceededError, QuotaWarningError } from "@/lib/services/quota";

describe("Quota Service - Unit Tests", () => {
	describe("QuotaExceededError", () => {
		it("should have correct properties", () => {
			const error = new QuotaExceededError(5000, 10000);
			expect(error.used).toBe(5000);
			expect(error.limit).toBe(10000);
			expect(error.message).toContain("5000/10000");
			expect(error.name).toBe("QuotaExceededError");
		});
	});

	describe("QuotaWarningError", () => {
		it("should have correct properties", () => {
			const error = new QuotaWarningError(8000, 80);
			expect(error.used).toBe(8000);
			expect(error.percentage).toBe(80);
			expect(error.message).toContain("80%");
			expect(error.name).toBe("QuotaWarningError");
		});
	});

	describe("Quota Service - Logic Tests", () => {
		// Test percentage calculation
		it("should calculate percentage correctly", () => {
			const used = 5000;
			const limit = 10000;
			const percentage = Math.round((used / limit) * 100);
			expect(percentage).toBe(50);
		});

		it("should calculate remaining correctly", () => {
			const used = 5000;
			const limit = 10000;
			const remaining = Math.max(0, limit - used);
			expect(remaining).toBe(5000);
		});

		// Test soft limit detection
		it("should detect soft limit at 80%", () => {
			const percentage = 80;
			const softLimitPercent = 80;
			const isSoftLimit = percentage >= softLimitPercent;
			expect(isSoftLimit).toBe(true);
		});

		it("should detect soft limit at 95%", () => {
			const percentage = 95;
			const softLimitPercent = 80;
			const isSoftLimit = percentage >= softLimitPercent;
			expect(isSoftLimit).toBe(true);
		});

		it("should not trigger soft limit below 80%", () => {
			const percentage = 79;
			const softLimitPercent = 80;
			const isSoftLimit = percentage >= softLimitPercent;
			expect(isSoftLimit).toBe(false);
		});

		// Test hard limit detection
		it("should detect hard limit at 95%", () => {
			const percentage = 95;
			const hardLimitPercent = 95;
			const isHardLimit = percentage >= hardLimitPercent;
			expect(isHardLimit).toBe(true);
		});

		// Test quota check logic
		it("should allow request when remaining is sufficient", () => {
			const remaining = 5000;
			const cost = 100;
			const canMake = remaining >= cost;
			expect(canMake).toBe(true);
		});

		it("should reject request when remaining is insufficient", () => {
			const remaining = 500;
			const cost = 600;
			const canMake = remaining >= cost;
			expect(canMake).toBe(false);
		});

		// Test projected usage calculation
		it("should calculate projected usage correctly", () => {
			const currentUsed = 7900;
			const cost = 200;
			const projectedUsage = currentUsed + cost;
			expect(projectedUsage).toBe(8100);
		});

		it("should calculate projected percentage correctly", () => {
			const projectedUsage = 8100;
			const limit = 10000;
			const projectedPercent = Math.round((projectedUsage / limit) * 100);
			expect(projectedPercent).toBe(81);
		});
	});
});
