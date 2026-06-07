/**
 * T6.3: RED — Tests for /api/channels route (watchlist CRUD)
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

// Mock YouTube service
const mockYouTubeService = {
	getChannel: jest.fn(),
	getChannelVideos: jest.fn(),
};

jest.mock("@/lib/services/youtube", () => ({
	createYouTubeService: () => mockYouTubeService,
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
import { POST, DELETE } from "@/app/api/channels/route";

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

describe("POST /api/channels", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should return 400 if channelId is missing", async () => {
		const request = new MockNextRequest("http://localhost/api/channels", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		}) as unknown as Request;

		const response = await POST(request);
		expect(response.status).toBe(400);
	});

	it("should return 400 if channel not found on YouTube", async () => {
		mockYouTubeService.getChannel.mockResolvedValueOnce(null);

		const request = new MockNextRequest("http://localhost/api/channels", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ channelId: "UCinvalid" }),
		}) as unknown as Request;

		const response = await POST(request);
		expect(response.status).toBe(400);
	});

	it("should return 500 on database error", async () => {
		mockYouTubeService.getChannel.mockResolvedValueOnce({
			id: "UC123",
			title: "Test Channel",
			description: "A test channel",
			subscriberCount: 1000000,
			videoCount: 500,
			thumbnailUrl: "https://example.com/thumb.jpg",
		});

		// Mock Prisma error
		jest.doMock("@/lib/db", () => ({
			__esModule: true,
			default: {
				channelWatchlist: {
					upsert: jest.fn().mockRejectedValueOnce(new Error("DB Error")),
				},
			},
		}));

		const request = new MockNextRequest("http://localhost/api/channels", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ channelId: "UC123" }),
		}) as unknown as Request;

		const response = await POST(request);
		expect(response.status).toBe(500);
	});
});

describe("DELETE /api/channels", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should return 400 if channelId is missing", async () => {
		const request = new MockNextRequest("http://localhost/api/channels", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		}) as unknown as Request;

		const response = await DELETE(request);
		expect(response.status).toBe(400);
	});

	it("should return 500 on database error", async () => {
		// Mock Prisma error
		jest.doMock("@/lib/db", () => ({
			__esModule: true,
			default: {
				channelWatchlist: {
					delete: jest.fn().mockRejectedValueOnce(new Error("DB Error")),
				},
			},
		}));

		const request = new MockNextRequest("http://localhost/api/channels", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ channelId: "UC123" }),
		}) as unknown as Request;

		const response = await DELETE(request);
		expect(response.status).toBe(500);
	});
});