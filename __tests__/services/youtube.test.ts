/**
 * @jest-environment node
 */
import { describe, it, expect, afterEach, jest } from "@jest/globals";
import {
	YouTubeService,
	YouTubeApiError,
	QuotaExceededError,
} from "@/lib/services/youtube";

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Helper to create mock response
function createMockResponse(data: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: status === 200 ? "OK" : "Error",
		headers: new Map(),
		json: async () => data,
	} as unknown as Response;
}

describe("YouTube API Service", () => {
	afterEach(() => {
		mockFetch.mockReset();
	});

	describe("search()", () => {
		it("should return formatted video results from search", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const searchResponse = {
				kind: "youtube#searchListResponse",
				items: [
					{
						id: { videoId: "video123" },
						snippet: {
							title: "Test Video 1",
							description: "Description 1",
							channelId: "channel1",
							channelTitle: "Test Channel",
							publishedAt: "2024-01-15T10:00:00Z",
							thumbnails: {
								default: { url: "https://example.com/thumb1.jpg" },
							},
						},
					},
				],
				pageInfo: { totalResults: 1, resultsPerPage: 1 },
			};

			const videoResponse = {
				kind: "youtube#videoListResponse",
				items: [
					{
						id: "video123",
						snippet: {
							title: "Test Video 1",
							description: "Description 1",
							channelId: "channel1",
							channelTitle: "Test Channel",
							publishedAt: "2024-01-15T10:00:00Z",
							thumbnails: { high: { url: "https://example.com/thumb1_h.jpg" } },
						},
						statistics: {
							viewCount: "10000",
							likeCount: "500",
							commentCount: "100",
						},
					},
				],
			};

			mockFetch
				.mockResolvedValueOnce(createMockResponse(searchResponse))
				.mockResolvedValueOnce(createMockResponse(videoResponse));

			const result = await service.search("test");

			expect(result.items).toHaveLength(1);
			expect(result.items[0]).toMatchObject({
				id: "video123",
				title: "Test Video 1",
				viewCount: 10000,
				likeCount: 500,
			});
		});

		it("should use correct API endpoint and parameters", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const searchResponse = {
				kind: "youtube#searchListResponse",
				items: [],
				pageInfo: { totalResults: 0, resultsPerPage: 0 },
			};
			const videoResponse = {
				kind: "youtube#videoListResponse",
				items: [],
			};

			mockFetch
				.mockResolvedValueOnce(createMockResponse(searchResponse))
				.mockResolvedValueOnce(createMockResponse(videoResponse));

			await service.search("react hooks", { maxResults: 5 });

			const firstCallUrl = mockFetch.mock.calls[0][0].toString();
			expect(firstCallUrl).toContain(
				"https://www.googleapis.com/youtube/v3/search",
			);
			expect(firstCallUrl).toContain("q=react+hooks");
			expect(firstCallUrl).toContain("maxResults=5");
		});

		it("should handle empty search results", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const searchResponse = {
				kind: "youtube#searchListResponse",
				items: [],
				pageInfo: { totalResults: 0, resultsPerPage: 0 },
			};

			mockFetch.mockResolvedValueOnce(createMockResponse(searchResponse));

			const result = await service.search("nonexistent");

			expect(result.items).toHaveLength(0);
		});

		it("should throw QuotaExceededError on 403", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			mockFetch.mockResolvedValueOnce(createMockResponse(null, 403));

			await expect(service.search("test")).rejects.toThrow(QuotaExceededError);
		});

		it("should track quota usage", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const searchResponse = {
				kind: "youtube#searchListResponse",
				items: [],
				pageInfo: { totalResults: 0, resultsPerPage: 0 },
			};
			const videoResponse = {
				kind: "youtube#videoListResponse",
				items: [],
			};

			mockFetch
				.mockResolvedValueOnce(createMockResponse(searchResponse))
				.mockResolvedValueOnce(createMockResponse(videoResponse));

			await service.search("test");

			expect(service.getQuotaUsed()).toBeGreaterThan(0);
		});
	});

	describe("getVideos()", () => {
		it("should return formatted video details", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const videoResponse = {
				kind: "youtube#videoListResponse",
				items: [
					{
						id: "video123",
						snippet: {
							title: "Test Video 1",
							description: "Description 1",
							channelId: "channel1",
							channelTitle: "Test Channel",
							publishedAt: "2024-01-15T10:00:00Z",
							categoryId: "22",
							tags: ["tag1", "tag2"],
							thumbnails: { high: { url: "https://example.com/thumb1_h.jpg" } },
						},
						statistics: {
							viewCount: "10000",
							likeCount: "500",
							commentCount: "100",
						},
					},
				],
			};

			mockFetch.mockResolvedValueOnce(createMockResponse(videoResponse));

			const results = await service.getVideos(["video123"]);

			expect(results).toHaveLength(1);
			expect(results[0]).toMatchObject({
				id: "video123",
				title: "Test Video 1",
				viewCount: 10000,
				likeCount: 500,
				commentCount: 100,
			});
		});

		it("should batch requests when more than 50 IDs", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const ids = Array.from({ length: 60 }, (_, i) => `video${i}`);

			const response1 = {
				kind: "youtube#videoListResponse",
				items: ids.slice(0, 50).map((id) => ({
					id,
					snippet: {
						title: `Video ${id}`,
						channelId: "ch",
						channelTitle: "Test",
						publishedAt: "2024-01-01",
						tags: [],
						thumbnails: { high: { url: "" } },
					},
					statistics: { viewCount: "100", likeCount: "10", commentCount: "5" },
				})),
			};

			const response2 = {
				kind: "youtube#videoListResponse",
				items: ids.slice(50).map((id) => ({
					id,
					snippet: {
						title: `Video ${id}`,
						channelId: "ch",
						channelTitle: "Test",
						publishedAt: "2024-01-01",
						tags: [],
						thumbnails: { high: { url: "" } },
					},
					statistics: { viewCount: "100", likeCount: "10", commentCount: "5" },
				})),
			};

			mockFetch
				.mockResolvedValueOnce(createMockResponse(response1))
				.mockResolvedValueOnce(createMockResponse(response2));

			const results = await service.getVideos(ids);

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(results).toHaveLength(60);
		});

		it("should return empty array for empty input", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const results = await service.getVideos([]);

			expect(results).toHaveLength(0);
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe("getChannel()", () => {
		it("should return channel information", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const channelResponse = {
				kind: "youtube#channelListResponse",
				items: [
					{
						id: "channel1",
						snippet: {
							title: "Test Channel",
							description: "A test channel",
							thumbnails: {
								default: { url: "https://example.com/channel.jpg" },
							},
						},
						statistics: { subscriberCount: "100000", videoCount: "500" },
					},
				],
			};

			mockFetch.mockResolvedValueOnce(createMockResponse(channelResponse));

			const result = await service.getChannel("channel1");

			expect(result).toMatchObject({
				id: "channel1",
				title: "Test Channel",
				subscriberCount: 100000,
				videoCount: 500,
			});
		});

		it("should return null for channel not found", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const emptyResponse = {
				kind: "youtube#channelListResponse",
				items: [],
			};

			mockFetch.mockResolvedValueOnce(createMockResponse(emptyResponse));

			const result = await service.getChannel("nonexistent");

			expect(result).toBeNull();
		});
	});

	describe("getTrending()", () => {
		it("should return trending videos with stats", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const trendingResponse = {
				kind: "youtube#videoListResponse",
				items: [
					{
						id: "trending1",
						snippet: {
							title: "Trending Video 1",
							description: "Very popular",
							channelId: "channel1",
							channelTitle: "Popular Channel",
							publishedAt: "2024-01-25T10:00:00Z",
							categoryId: "22",
							thumbnails: { high: { url: "https://example.com/trending.jpg" } },
						},
						statistics: {
							viewCount: "1000000",
							likeCount: "50000",
							commentCount: "10000",
						},
					},
				],
			};

			mockFetch.mockResolvedValueOnce(createMockResponse(trendingResponse));

			const result = await service.getTrending("22", "US");

			expect(result.items).toHaveLength(1);
			expect(result.items[0]).toMatchObject({
				id: "trending1",
				title: "Trending Video 1",
				viewCount: 1000000,
			});
		});

		it("should use region code parameter", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const trendingResponse = {
				kind: "youtube#videoListResponse",
				items: [],
			};

			mockFetch.mockResolvedValueOnce(createMockResponse(trendingResponse));

			await service.getTrending(undefined, "AR");

			const calledUrl = mockFetch.mock.calls[0][0].toString();
			expect(calledUrl).toContain("regionCode=AR");
		});
	});

	describe("error handling", () => {
		it("should throw YouTubeApiError for unknown errors", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			mockFetch.mockResolvedValueOnce(createMockResponse(null, 500));

			await expect(service.search("test")).rejects.toThrow(YouTubeApiError);
		});

		it("should propagate network errors", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			await expect(service.search("test")).rejects.toThrow("Network error");
		});

		it("should handle JSON parse errors", async () => {
			const service = new YouTubeService({ apiKey: "test_key" });

			const badResponse = {
				ok: true,
				status: 200,
				statusText: "OK",
				headers: new Map(),
				json: async () => {
					throw new Error("Invalid JSON");
				},
			} as unknown as Response;

			mockFetch.mockResolvedValueOnce(badResponse);

			await expect(service.search("test")).rejects.toThrow("Invalid JSON");
		});
	});

	describe("quota tracking", () => {
		it("should call quota change callback", async () => {
			let trackedQuota = 0;
			const service = new YouTubeService({
				apiKey: "test_key",
				onQuotaChange: (quota) => {
					trackedQuota = quota;
				},
			});

			const searchResponse = {
				kind: "youtube#searchListResponse",
				items: [],
				pageInfo: { totalResults: 0, resultsPerPage: 0 },
			};
			const videoResponse = {
				kind: "youtube#videoListResponse",
				items: [],
			};

			mockFetch
				.mockResolvedValueOnce(createMockResponse(searchResponse))
				.mockResolvedValueOnce(createMockResponse(videoResponse));

			await service.search("test");

			expect(trackedQuota).toBeGreaterThan(0);
		});

		it("should allow quota reset", () => {
			const service = new YouTubeService({ apiKey: "test_key" });
			service.resetQuota();
			expect(service.getQuotaUsed()).toBe(0);
		});
	});
});
