/**
 * T6.1: RED — Tests for /api/channels/[id] route
 * Strict TDD: Tests must FAIL before implementation
 */

/**
 * @jest-environment jsdom
 */

// Mock environment before any imports
jest.mock("@/lib/env", () => ({
	env: {
		YOUTUBE_API_KEY: "test-api-key",
		OPENCODE_API_KEY: "test-opencode-key",
		DATABASE_URL: "file:./test.db",
	},
}));

// Mock services
const mockYouTubeService = {
	getChannel: jest.fn(),
	getChannelVideos: jest.fn(),
	getVideos: jest.fn(),
};

jest.mock("@/lib/services/youtube", () => ({
	createYouTubeService: () => mockYouTubeService,
}));

// Mock Prisma db
jest.mock("@/lib/db", () => ({
	__esModule: true,
	default: {
		channelWatchlist: {
			findUnique: jest.fn(),
			findMany: jest.fn(),
		},
		videoCache: {
			findMany: jest.fn(),
		},
	},
}));

// Create mock response factory
const createMockResponse = (data: unknown, status = 200) => ({
	status,
	ok: status >= 200 && status < 300,
	json: async () => data,
});

// Mock NextResponse with factory
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

// Import route module after mocks
import { GET } from "@/app/api/channels/[id]/route";

// Mock NextRequest for testing
class MockNextRequest {
	url: string;
	method: string;
	headers: Map<string, string>;

	constructor(url: string, options?: { method?: string; headers?: Record<string, string> }) {
		this.url = url;
		this.method = options?.method || "GET";
		this.headers = new Map(Object.entries(options?.headers || {}));
	}
}

describe("GET /api/channels/[id]", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Channel info retrieval", () => {
		it("should return 400 if channel ID is missing", async () => {
			const url = new URL("http://localhost/api/channels/");
			const request = new MockNextRequest(url.toString()) as unknown as Request;
			const response = await GET(request as never, { params: Promise.resolve({ id: "" }) });

			expect(response.status).toBe(400);
		});

		it("should return 404 if channel not found", async () => {
			mockYouTubeService.getChannel.mockResolvedValueOnce(null);

			const request = new MockNextRequest("http://localhost/api/channels/UC123") as unknown as Request;
			const response = await GET(request as never, { params: Promise.resolve({ id: "UC123" }) });

			expect(response.status).toBe(404);
		});
	});

	describe("Error handling", () => {
		it("should return 500 on YouTube API error", async () => {
			mockYouTubeService.getChannel.mockRejectedValueOnce(new Error("API Error"));

			const request = new MockNextRequest("http://localhost/api/channels/UCerror") as unknown as Request;
			const response = await GET(request as never, { params: Promise.resolve({ id: "UCerror" }) });

			expect(response.status).toBe(500);
		});
	});
});