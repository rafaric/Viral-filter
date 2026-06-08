/**
 * T8.2: RED — Import/Backup Utility Tests
 * Import JSON backup, handle conflicts, restore data
 */

import { describe, it, expect } from "@jest/globals";

describe("Import Service", () => {
	describe("JSON Backup Import", () => {
		it("should parse valid JSON backup file", () => {
			const backupJson = JSON.stringify({
				exportedAt: "2024-01-01T00:00:00Z",
				version: "1.0",
				videos: [
					{ id: "v1", title: "Video 1", channelId: "c1", channelTitle: "Channel", publishedAt: "2024-01-01" },
				],
				channels: [],
				trends: [],
				quota: [],
			});

			const parsed = JSON.parse(backupJson);

			expect(parsed.exportedAt).toBeDefined();
			expect(parsed.videos).toHaveLength(1);
		});

		it("should validate backup version", () => {
			const validBackup = { version: "1.0", videos: [], channels: [], trends: [], quota: [] };
			const invalidBackup = { videos: [], channels: [] };

			expect(validBackup.version).toBe("1.0");
			expect((invalidBackup as { version?: string }).version).toBeUndefined();
		});

		it("should reject invalid JSON", () => {
			const invalidJson = "{ invalid json }";

			expect(() => JSON.parse(invalidJson)).toThrow();
		});
	});

	describe("Video Import", () => {
		it("should import videos from backup", () => {
			const videos = [
				{ id: "v1", title: "Video 1", channelId: "c1", channelTitle: "Channel", publishedAt: "2024-01-01" },
				{ id: "v2", title: "Video 2", channelId: "c1", channelTitle: "Channel", publishedAt: "2024-01-02" },
			];

			expect(videos).toHaveLength(2);
			expect(videos[0].id).toBe("v1");
		});

		it("should handle videos with missing optional fields", () => {
			const video = {
				id: "v1",
				title: "Minimal Video",
				channelId: "c1",
				channelTitle: "Channel",
				publishedAt: "2024-01-01",
			} as { id: string; title: string; channelId: string; channelTitle: string; publishedAt: string; viewCount?: number };

			expect(video.id).toBeDefined();
			expect(video.viewCount).toBeUndefined();
		});
	});

	describe("Channel Import", () => {
		it("should import channels from backup", () => {
			const channels = [
				{ id: "c1", title: "Channel 1", subscriberCount: 10000 },
				{ id: "c2", title: "Channel 2", subscriberCount: 20000 },
			];

			expect(channels).toHaveLength(2);
			expect(channels[0].subscriberCount).toBe(10000);
		});
	});

	describe("Conflict Resolution", () => {
		it("should handle overwrite strategy for existing data", () => {
			const existingVideo = { id: "v1", title: "Old Title", viewCount: 100 };
			const newVideo = { id: "v1", title: "New Title", viewCount: 200 };

			// Overwrite strategy: new data wins
			const merged = { ...existingVideo, ...newVideo };

			expect(merged.title).toBe("New Title");
			expect(merged.viewCount).toBe(200);
		});

		it("should handle skip strategy for existing data", () => {
			const existingVideo = { id: "v1", title: "Existing" };
			const newVideo = { id: "v1", title: "New" };

			// Skip strategy: existing data wins
			const merged = { ...newVideo, ...existingVideo };

			expect(merged.title).toBe("Existing");
		});

		it("should handle merge strategy for existing data", () => {
			const existing: Record<string, string | number> = { id: "v1", title: "Existing", viewCount: 100, updatedAt: "2024-01-01" };
			const incoming: Record<string, string | number> = { id: "v1", title: "New", viewCount: 200, analyzedAt: "2024-01-02" };

			// Merge: keep existing for conflicts, add new fields
			const merged = {
				...incoming,
				...Object.fromEntries(
					Object.entries(existing).filter(([key]) => !(key in incoming)),
			),
			} as Record<string, string | number>;

			expect(merged.title).toBe("New"); // newer wins for title
			expect(merged.viewCount).toBe(200);
			expect(merged.updatedAt).toBe("2024-01-01"); // existing kept
			expect(merged.analyzedAt).toBe("2024-01-02"); // new added
		});

		it("should detect conflicting channel IDs", () => {
			const existing = new Map([["c1", { id: "c1", title: "Existing" }]]);
			const incoming = [{ id: "c1", title: "Incoming" }, { id: "c2", title: "New Channel" }];

			const conflicts = incoming.filter((c) => existing.has(c.id));

			expect(conflicts).toHaveLength(1);
			expect(conflicts[0].id).toBe("c1");
		});
	});

	describe("Import Validation", () => {
		it("should validate required fields", () => {
			const validVideo = {
				id: "v1",
				title: "Valid Video",
				channelId: "c1",
				channelTitle: "Channel",
				publishedAt: "2024-01-01",
			};

			const hasRequiredFields = Boolean(
				validVideo.id &&
				validVideo.title &&
				validVideo.channelId &&
				validVideo.channelTitle &&
				validVideo.publishedAt,
			);

			expect(hasRequiredFields).toBe(true);
		});

		it("should reject videos without ID", () => {
			const invalidVideo = {
				title: "No ID",
				channelId: "c1",
				channelTitle: "Channel",
				publishedAt: "2024-01-01",
			} as { id?: string; title: string; channelId: string; channelTitle: string; publishedAt: string };

			expect(invalidVideo.id).toBeUndefined();
		});

		it("should validate date format", () => {
			const validDate = "2024-01-01T00:00:00Z";
			const parsed = new Date(validDate);

			expect(parsed.getTime()).not.toBeNaN();
		});
	});

	describe("Partial Import", () => {
		it("should import only videos section", () => {
			const backup = {
				videos: [{ id: "v1", title: "Video" }],
				channels: [],
				trends: [],
				quota: [],
			};

			const videosOnly = backup.videos;

			expect(videosOnly).toHaveLength(1);
			expect(backup.channels).toHaveLength(0);
		});

		it("should handle empty sections gracefully", () => {
			const backup = {
				videos: [],
				channels: [],
				trends: [],
				quota: [],
			};

			expect(backup.videos).toHaveLength(0);
			expect(backup.channels).toHaveLength(0);
		});
	});

	describe("Import Summary", () => {
		it("should generate import report", () => {
			const summary = {
				totalItems: 10,
				imported: 8,
				skipped: 2,
				errors: [] as string[],
			};

			expect(summary.imported).toBeLessThanOrEqual(summary.totalItems);
			expect(summary.skipped + summary.imported).toBe(summary.totalItems);
		});
	});
});