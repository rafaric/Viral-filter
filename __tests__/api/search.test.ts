/**
 * T3.1: RED — Tests for /api/search route
 * Strict TDD: Tests must FAIL before implementation
 */

/**
 * @jest-environment jsdom
 */

// Mock environment before any imports
jest.mock("@/lib/env", () => ({
	env: {
		YOUTUBE_API_KEY: "test-api-key",
	},
}));

// Mock services
const mockCacheService = {
	getSearch: jest.fn(),
	setSearch: jest.fn(),
	getVideo: jest.fn(),
	setVideo: jest.fn(),
};

const mockQuotaService = {
	increment: jest.fn(),
	getStatus: jest.fn(),
	canMakeRequest: jest.fn(),
};

const mockYouTubeService = {
	search: jest.fn(),
	getVideos: jest.fn(),
	getVideo: jest.fn(),
	getChannel: jest.fn(),
	getChannelVideos: jest.fn(),
	getTrending: jest.fn(),
};

jest.mock("@/lib/services/cache", () => ({
	createCacheService: () => mockCacheService,
}));

jest.mock("@/lib/services/quota", () => ({
	createQuotaService: () => mockQuotaService,
}));

jest.mock("@/lib/services/youtube", () => ({
	createYouTubeService: () => mockYouTubeService,
}));

// Import route module after mocks
import { GET, POST } from "@/app/api/search/route";

// Mock NextRequest for testing
class MockNextRequest {
	url: string;
	method: string;
	headers: Map<string, string>;
	body: string | null;

	constructor(url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) {
		this.url = url;
		this.method = options?.method || "GET";
		this.headers = new Map(Object.entries(options?.headers || {}));
		this.body = options?.body || null;
	}

	async json() {
		if (this.body) {
			return JSON.parse(this.body);
		}
		throw new Error("No body");
	}
}

describe("GET /api/search", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Cache behavior", () => {
		it("should return cached results on cache hit", async () => {
			const cachedVideos = [
				{
					id: "video1",
					title: "Cached Video",
					channelId: "ch1",
					channelTitle: "Test Channel",
					publishedAt: "2024-01-01T00:00:00Z",
				},
			];

			mockCacheService.getSearch.mockResolvedValueOnce(cachedVideos);

			const url = new URL("http://localhost/api/search?q=test");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.cached).toBe(true);
			expect(data.items).toHaveLength(1);
			expect(data.items[0].title).toBe("Cached Video");
			expect(mockYouTubeService.search).not.toHaveBeenCalled();
		});

		it("should call YouTube API on cache miss", async () => {
			mockCacheService.getSearch.mockResolvedValueOnce(null);
			mockYouTubeService.search.mockResolvedValueOnce({
				items: [
					{
						id: "video1",
						title: "Fresh Video",
						channelId: "ch1",
						channelTitle: "Fresh Channel",
						publishedAt: "2024-01-01T00:00:00Z",
					},
				],
				nextPageToken: "next123",
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/search?q=test");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.cached).toBe(false);
			expect(mockYouTubeService.search).toHaveBeenCalledWith(
				"test",
				expect.objectContaining({}),
			);
		});

		it("should cache results after YouTube fetch", async () => {
			mockCacheService.getSearch.mockResolvedValueOnce(null);
			const freshVideos = [
				{
					id: "video1",
					title: "Fresh Video",
					channelId: "ch1",
					channelTitle: "Fresh Channel",
					publishedAt: "2024-01-01T00:00:00Z",
				},
			];
			mockYouTubeService.search.mockResolvedValueOnce({
				items: freshVideos,
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/search?q=test");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			await GET(request as never);

			expect(mockCacheService.setSearch).toHaveBeenCalledWith(
				"test",
				expect.any(Object),
				freshVideos,
			);
		});
	});

	describe("Filter application", () => {
		it("should apply category filter", async () => {
			mockCacheService.getSearch.mockResolvedValueOnce(null);
			mockYouTubeService.search.mockResolvedValueOnce({
				items: [],
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/search?q=test");
			url.searchParams.set("category", "10");
			const request = new MockNextRequest(url.toString()) as unknown as Request;

			await GET(request as never);

			expect(mockYouTubeService.search).toHaveBeenCalledWith(
				"test",
				expect.objectContaining({
					filters: expect.objectContaining({ category: "10" }),
				}),
			);
		});

		it("should apply country filter", async () => {
			mockCacheService.getSearch.mockResolvedValueOnce(null);
			mockYouTubeService.search.mockResolvedValueOnce({
				items: [],
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/search?q=test");
			url.searchParams.set("country", "US");
			const request = new MockNextRequest(url.toString()) as unknown as Request;

			await GET(request as never);

			expect(mockYouTubeService.search).toHaveBeenCalledWith(
				"test",
				expect.objectContaining({
					filters: expect.objectContaining({ country: "US" }),
				}),
			);
		});

		it("should apply language filter", async () => {
			mockCacheService.getSearch.mockResolvedValueOnce(null);
			mockYouTubeService.search.mockResolvedValueOnce({
				items: [],
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/search?q=test");
			url.searchParams.set("language", "es");
			const request = new MockNextRequest(url.toString()) as unknown as Request;

			await GET(request as never);

			expect(mockYouTubeService.search).toHaveBeenCalledWith(
				"test",
				expect.objectContaining({
					filters: expect.objectContaining({ language: "es" }),
				}),
			);
		});

		it("should apply date range filters", async () => {
			mockCacheService.getSearch.mockResolvedValueOnce(null);
			mockYouTubeService.search.mockResolvedValueOnce({
				items: [],
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/search?q=test");
			url.searchParams.set("publishedAfter", "2024-01-01");
			url.searchParams.set("publishedBefore", "2024-12-31");
			const request = new MockNextRequest(url.toString()) as unknown as Request;

			await GET(request as never);

			expect(mockYouTubeService.search).toHaveBeenCalledWith(
				"test",
				expect.objectContaining({
					filters: expect.objectContaining({
						publishedAfter: "2024-01-01",
						publishedBefore: "2024-12-31",
					}),
				}),
			);
		});

		it("should apply sort order filter", async () => {
			mockCacheService.getSearch.mockResolvedValueOnce(null);
			mockYouTubeService.search.mockResolvedValueOnce({
				items: [],
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/search?q=test");
			url.searchParams.set("sortBy", "viewCount");
			const request = new MockNextRequest(url.toString()) as unknown as Request;

			await GET(request as never);

			expect(mockYouTubeService.search).toHaveBeenCalledWith(
				"test",
				expect.objectContaining({
					filters: expect.objectContaining({ sortBy: "viewCount" }),
				}),
			);
		});
	});

	describe("Pagination", () => {
		it("should handle pagination with pageToken", async () => {
			mockCacheService.getSearch.mockResolvedValueOnce(null);
			mockYouTubeService.search.mockResolvedValueOnce({
				items: [{ id: "video2", title: "Second Page Video" }],
				nextPageToken: "token456",
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/search?q=test");
			url.searchParams.set("pageToken", "token123");
			const request = new MockNextRequest(url.toString()) as unknown as Request;

			const response = await GET(request as never);
			const data = await response.json();

			expect(mockYouTubeService.search).toHaveBeenCalledWith(
				"test",
				expect.objectContaining({ pageToken: "token123" }),
			);
			expect(data.nextPageToken).toBe("token456");
		});
	});

	describe("Quota tracking", () => {
		it("should track quota usage after API call", async () => {
			mockCacheService.getSearch.mockResolvedValueOnce(null);
			mockYouTubeService.search.mockResolvedValueOnce({
				items: [],
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/search?q=test");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);
			const data = await response.json();

			expect(data.quotaUsed).toBeDefined();
			expect(typeof data.quotaUsed).toBe("number");
		});
	});

	describe("Error handling", () => {
		it("should return 400 for missing query", async () => {
			const url = new URL("http://localhost/api/search");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);

			expect(response.status).toBe(400);
		});

		it("should return 500 on YouTube API error", async () => {
			mockCacheService.getSearch.mockResolvedValueOnce(null);
			mockYouTubeService.search.mockRejectedValueOnce(
				new Error("YouTube API error"),
			);

			const url = new URL("http://localhost/api/search?q=test");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);

			expect(response.status).toBe(500);
		});
	});
});

describe("POST /api/search", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should accept search body with filters", async () => {
		mockCacheService.getSearch.mockResolvedValueOnce(null);
		mockYouTubeService.search.mockResolvedValueOnce({
			items: [
				{
					id: "video1",
					title: "Posted Video",
					channelId: "ch1",
					channelTitle: "Test Channel",
					publishedAt: "2024-01-01T00:00:00Z",
				},
			],
			quotaUsed: 100,
		});
		mockQuotaService.increment.mockResolvedValueOnce(100);

		const body = JSON.stringify({
			query: "test query",
			filters: { category: "10", country: "US" },
		});
		const request = new MockNextRequest("http://localhost/api/search", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body,
		}) as unknown as Request;

		const response = await POST(request as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.items).toHaveLength(1);
	});

	it("should return 400 for invalid request body", async () => {
		const request = new MockNextRequest("http://localhost/api/search", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "invalid json",
		}) as unknown as Request;

		const response = await POST(request as never);
		expect(response.status).toBe(400);
	});

	it("should return 400 for missing query in body", async () => {
		const request = new MockNextRequest("http://localhost/api/search", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ filters: {} }),
		}) as unknown as Request;

		const response = await POST(request as never);
		expect(response.status).toBe(400);
	});
});