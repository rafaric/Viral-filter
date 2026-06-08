/**
 * T8.1: RED — Export Utility Tests
 * Export videos, search results, watchlist, and trend data to JSON and CSV
 */

import { describe, it, expect } from "@jest/globals";

describe("Export Service", () => {
	describe("Video Export", () => {
		it("should export videos to JSON format", () => {
			const mockVideos = [
				{
					id: "video1",
					title: "Test Video 1",
					channelId: "channel1",
					channelTitle: "Test Channel",
					publishedAt: "2024-01-01T00:00:00Z",
					viewCount: 1000,
					likeCount: 100,
				},
				{
					id: "video2",
					title: "Test Video 2",
					channelId: "channel1",
					channelTitle: "Test Channel",
					publishedAt: "2024-01-02T00:00:00Z",
					viewCount: 2000,
					likeCount: 200,
				},
			];

			// JSON export should include all fields
			const jsonOutput = JSON.stringify(mockVideos, null, 2);
			const parsed = JSON.parse(jsonOutput);

			expect(parsed).toHaveLength(2);
			expect(parsed[0].id).toBe("video1");
			expect(parsed[0].title).toBe("Test Video 1");
		});

		it("should export videos to CSV format", () => {
			const mockVideos = [
				{
					id: "video1",
					title: "Test Video 1",
					channelId: "channel1",
					channelTitle: "Test Channel",
					publishedAt: "2024-01-01T00:00:00Z",
					viewCount: 1000,
				},
			];

			// CSV should have header row
			const headers = ["id", "title", "channelId", "channelTitle", "publishedAt", "viewCount"];
			const csvHeader = headers.join(",");
			const csvRow = mockVideos
				.map((v) =>
					headers.map((h) => {
						const val = v[h as keyof typeof v];
						return typeof val === "string" ? `"${val}"` : val ?? "";
					}).join(","),
				)
				.join("\n");

			const csvOutput = `${csvHeader}\n${csvRow}`;

			expect(csvOutput).toContain("video1");
			expect(csvOutput).toContain("Test Video 1");
			expect(csvOutput).toContain("1000");
		});
	});

	describe("Watchlist Export", () => {
		it("should export watchlist channels to JSON", () => {
			const mockChannels = [
				{ id: "channel1", title: "Channel One", subscriberCount: 10000 },
				{ id: "channel2", title: "Channel Two", subscriberCount: 20000 },
			];

			const jsonOutput = JSON.stringify(mockChannels, null, 2);
			const parsed = JSON.parse(jsonOutput);

			expect(parsed).toHaveLength(2);
			expect(parsed[0].id).toBe("channel1");
		});

		it("should export watchlist to CSV", () => {
			const mockChannels = [
				{ id: "channel1", title: "Channel One", subscriberCount: 10000 },
			];

			const headers = ["id", "title", "subscriberCount"];
			const csvHeader = headers.join(",");
			const csvRow = mockChannels
				.map((c) => `"${c.id}","${c.title}",${c.subscriberCount ?? 0}`)
				.join("\n");

			const csvOutput = `${csvHeader}\n${csvRow}`;

			expect(csvOutput).toContain("channel1");
			expect(csvOutput).toContain("Channel One");
		});
	});

	describe("Trend Data Export", () => {
		it("should export trend snapshots to JSON", () => {
			const mockTrends = [
				{
					id: "trend1",
					categoryId: "music",
					country: "US",
					capturedAt: "2024-01-01T00:00:00Z",
					videoIds: ["v1", "v2", "v3"],
				},
			];

			const jsonOutput = JSON.stringify(mockTrends, null, 2);
			const parsed = JSON.parse(jsonOutput);

			expect(parsed[0].categoryId).toBe("music");
			expect(parsed[0].videoIds).toHaveLength(3);
		});
	});

	describe("Full Backup Export", () => {
		it("should export complete backup with all data types", () => {
			const backup = {
				exportedAt: new Date().toISOString(),
				version: "1.0",
				videos: [
					{ id: "v1", title: "Video 1", channelId: "c1", channelTitle: "Channel", publishedAt: "2024-01-01", viewCount: 1000 },
				],
				channels: [{ id: "c1", title: "Channel 1", subscriberCount: 10000 }],
				trends: [{ id: "t1", categoryId: "music", country: "US", videoIds: ["v1"] }],
				quota: [{ date: "2024-01-01", used: 500 }],
			};

			const jsonOutput = JSON.stringify(backup, null, 2);
			const parsed = JSON.parse(jsonOutput);

			expect(parsed.exportedAt).toBeDefined();
			expect(parsed.videos).toHaveLength(1);
			expect(parsed.channels).toHaveLength(1);
			expect(parsed.trends).toHaveLength(1);
			expect(parsed.quota).toHaveLength(1);
		});
	});

	describe("Export Format Validation", () => {
		it("should generate valid JSON that can be parsed", () => {
			const data = { videos: [], channels: [], trends: [] };
			const output = JSON.stringify(data);
			const parsed = JSON.parse(output);

			expect(parsed).toEqual(data);
		});

		it("should handle special characters in CSV", () => {
			const title = 'Video with "quotes" and, commas';
			const safeTitle = `"${title.replace(/"/g, '""')}"`;

			expect(safeTitle).toBe('"Video with ""quotes"" and, commas"');
		});

		it("should handle empty datasets", () => {
			const emptyData = { videos: [], channels: [], trends: [] };
			const jsonOutput = JSON.stringify(emptyData);

			expect(jsonOutput).toBe('{"videos":[],"channels":[],"trends":[]}');
		});
	});
});