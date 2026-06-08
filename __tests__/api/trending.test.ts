/**
 * T7.1: RED — Tests for /api/trending route
 * Strict TDD: Tests must FAIL before implementation
 */

/**
 * @jest-environment jsdom
 */

// Mock Prisma BEFORE any other imports that might use it
// This must be at the top level before any import statements
jest.mock("@/lib/db", () => ({
	__esModule: true,
	default: {
		trendSnapshot: {
			create: jest.fn().mockResolvedValue({
				id: "snapshot-1",
				categoryId: "10",
				country: "US",
				videoIds: "[]",
				capturedAt: new Date(),
			}),
			findMany: jest.fn().mockResolvedValue([]),
		},
	},
}));

// Mock NextResponse before any imports
const createMockResponse = (data: unknown, status = 200) => ({
	status,
	ok: status >= 200 && status < 300,
	json: async () => data,
});

jest.mock("next/server", () => {
	const actual = jest.requireActual("next/server");
	return {
		...actual,
		NextResponse: {
			...actual.NextResponse,
			json: (data: unknown, init?: { status?: number }) => {
				return createMockResponse(data, init?.status || 200);
			},
		},
	};
});

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

// Mock env before imports
jest.mock("@/lib/env", () => ({
	env: {
		YOUTUBE_API_KEY: "test-api-key",
	},
}));

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
import { GET } from "@/app/api/trending/route";

// Mock NextRequest for testing
class MockNextRequest {
	url: string;
	method: string;
	headers: Map<string, string>;

	constructor(url: string) {
		this.url = url;
		this.method = "GET";
		this.headers = new Map();
	}
}

describe("GET /api/trending", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Parameter validation", () => {
		it("should require category parameter", async () => {
			const url = new URL("http://localhost/api/trending");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("category");
		});

		it("should require country parameter", async () => {
			const url = new URL("http://localhost/api/trending");
			url.searchParams.set("category", "10");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("country");
		});

		it("should accept valid period values (24h, 7d, 30d)", async () => {
			const validPeriods = ["24h", "7d", "30d"];

			for (const period of validPeriods) {
				jest.clearAllMocks();
				mockYouTubeService.getTrending.mockResolvedValueOnce({
					items: [],
					quotaUsed: 0,
				});
				mockQuotaService.increment.mockResolvedValueOnce(100);

				const url = new URL("http://localhost/api/trending");
				url.searchParams.set("category", "10");
				url.searchParams.set("country", "US");
				url.searchParams.set("period", period);
				const request = new MockNextRequest(
					url.toString(),
				) as unknown as Request;
				const response = await GET(request as never);

				expect(response.status).toBe(200);
			}
		});

		it("should reject invalid period values", async () => {
			const url = new URL("http://localhost/api/trending");
			url.searchParams.set("category", "10");
			url.searchParams.set("country", "US");
			url.searchParams.set("period", "invalid");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);

			expect(response.status).toBe(400);
		});
	});

	describe("Trending data fetching", () => {
		it("should fetch trending videos from YouTube API", async () => {
			const mockVideos = [
				{
					id: "video1",
					title: "Trending Video 1",
					channelId: "ch1",
					channelTitle: "Channel 1",
					publishedAt: "2024-01-01T00:00:00Z",
					viewCount: 1000000,
					likeCount: 50000,
				},
				{
					id: "video2",
					title: "Trending Video 2",
					channelId: "ch2",
					channelTitle: "Channel 2",
					publishedAt: "2024-01-02T00:00:00Z",
					viewCount: 800000,
					likeCount: 40000,
				},
			];

			mockYouTubeService.getTrending.mockResolvedValueOnce({
				items: mockVideos,
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/trending");
			url.searchParams.set("category", "10");
			url.searchParams.set("country", "US");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);

			expect(response.status).toBe(200);
			expect(mockYouTubeService.getTrending).toHaveBeenCalledWith("10", "US");
		});

		it("should pass period to YouTube API for date filtering", async () => {
			mockYouTubeService.getTrending.mockResolvedValueOnce({
				items: [],
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/trending");
			url.searchParams.set("category", "10");
			url.searchParams.set("country", "US");
			url.searchParams.set("period", "7d");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);

			expect(response.status).toBe(200);
			expect(mockYouTubeService.getTrending).toHaveBeenCalled();
		});
	});

	describe("Trend classification", () => {
		it("should classify videos into emerging/stable/declining", async () => {
			// Create videos with different engagement ratios to test classification
			const mockVideos = [
				{
					id: "video-emerging",
					title: "Emerging Video",
					channelId: "ch1",
					channelTitle: "Channel 1",
					publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
					viewCount: 100000,
					likeCount: 10000, // High ratio = emerging
				},
				{
					id: "video-stable",
					title: "Stable Video",
					channelId: "ch2",
					channelTitle: "Channel 2",
					publishedAt: new Date(
						Date.now() - 5 * 24 * 60 * 60 * 1000,
					).toISOString(), // 5 days ago
					viewCount: 500000,
					likeCount: 25000, // Medium ratio = stable
				},
				{
					id: "video-declining",
					title: "Declining Video",
					channelId: "ch3",
					channelTitle: "Channel 3",
					publishedAt: new Date(
						Date.now() - 10 * 24 * 60 * 60 * 1000,
					).toISOString(), // 10 days ago
					viewCount: 1000000,
					likeCount: 20000, // Low ratio = declining
				},
			];

			mockYouTubeService.getTrending.mockResolvedValueOnce({
				items: mockVideos,
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/trending");
			url.searchParams.set("category", "10");
			url.searchParams.set("country", "US");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.trends).toBeDefined();
			expect(data.trends.emerging).toBeDefined();
			expect(data.trends.stable).toBeDefined();
			expect(data.trends.declining).toBeDefined();
			expect(Array.isArray(data.trends.emerging)).toBe(true);
			expect(Array.isArray(data.trends.stable)).toBe(true);
			expect(Array.isArray(data.trends.declining)).toBe(true);
		});
	});

	describe("Keyword extraction", () => {
		it("should extract trending keywords from video titles and tags", async () => {
			const mockVideos = [
				{
					id: "video1",
					title: "How to Make Money Online in 2024",
					channelId: "ch1",
					channelTitle: "Business Channel",
					publishedAt: "2024-01-01T00:00:00Z",
					viewCount: 1000000,
					tags: ["money", "online", "business", "2024"],
				},
				{
					id: "video2",
					title: "Passive Income Ideas for Beginners",
					channelId: "ch2",
					channelTitle: "Finance Tips",
					publishedAt: "2024-01-02T00:00:00Z",
					viewCount: 800000,
					tags: ["passive income", "beginners", "tips"],
				},
			];

			mockYouTubeService.getTrending.mockResolvedValueOnce({
				items: mockVideos,
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/trending");
			url.searchParams.set("category", "10");
			url.searchParams.set("country", "US");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.keywords).toBeDefined();
			expect(Array.isArray(data.keywords)).toBe(true);
			// Keywords should include extracted terms from titles and tags
		});
	});

	describe("Top channels extraction", () => {
		it("should extract top performing channels from results", async () => {
			const mockVideos = [
				{
					id: "video1",
					title: "Video from Channel 1",
					channelId: "ch1",
					channelTitle: "Popular Channel",
					publishedAt: "2024-01-01T00:00:00Z",
					viewCount: 1000000,
				},
				{
					id: "video2",
					title: "Another video from Channel 1",
					channelId: "ch1",
					channelTitle: "Popular Channel",
					publishedAt: "2024-01-02T00:00:00Z",
					viewCount: 800000,
				},
				{
					id: "video3",
					title: "Video from Channel 2",
					channelId: "ch2",
					channelTitle: "Another Popular Channel",
					publishedAt: "2024-01-03T00:00:00Z",
					viewCount: 600000,
				},
			];

			mockYouTubeService.getTrending.mockResolvedValueOnce({
				items: mockVideos,
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/trending");
			url.searchParams.set("category", "10");
			url.searchParams.set("country", "US");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.channels).toBeDefined();
			expect(Array.isArray(data.channels)).toBe(true);
			// Should have unique channels, sorted by total views
		});
	});

	describe("Quota tracking", () => {
		it("should track quota usage after API call", async () => {
			mockYouTubeService.getTrending.mockResolvedValueOnce({
				items: [],
				quotaUsed: 100,
			});
			mockQuotaService.increment.mockResolvedValueOnce(100);

			const url = new URL("http://localhost/api/trending");
			url.searchParams.set("category", "10");
			url.searchParams.set("country", "US");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.quotaUsed).toBeDefined();
			expect(typeof data.quotaUsed).toBe("number");
		});
	});

	describe("Error handling", () => {
		it("should return 500 on YouTube API error", async () => {
			mockYouTubeService.getTrending.mockRejectedValueOnce(
				new Error("YouTube API error"),
			);

			const url = new URL("http://localhost/api/trending");
			url.searchParams.set("category", "10");
			url.searchParams.set("country", "US");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);

			expect(response.status).toBe(500);
		});

		it("should handle quota exceeded gracefully", async () => {
			mockYouTubeService.getTrending.mockRejectedValueOnce(
				new Error("Daily quota exceeded"),
			);

			const url = new URL("http://localhost/api/trending");
			url.searchParams.set("category", "10");
			url.searchParams.set("country", "US");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never);

			expect(response.status).toBe(500);
		});
	});
});
