/**
 * T4.1: RED — Tests for OpenCode Go client wrapper
 * Strict TDD: Tests must FAIL before implementation
 */

/**
 * @jest-environment node
 */

// Mock fetch for SSE streaming tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("OpenCode Go Client", () => {
	let OpenCodeClient: any;
	let AVAILABLE_MODELS: string[];

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();

		// Lazy load the client to allow mocking
		const module = require("@/lib/services/aiclient");
		OpenCodeClient = module.OpenCodeClient;
		AVAILABLE_MODELS = module.AVAILABLE_MODELS;
	});

	describe("Available Models", () => {
		it("should define qwen3.7 model", () => {
			expect(AVAILABLE_MODELS).toContain("qwen3.7");
		});

		it("should define deepseek-v4 model", () => {
			expect(AVAILABLE_MODELS).toContain("deepseek-v4");
		});

		it("should define glm-5 model", () => {
			expect(AVAILABLE_MODELS).toContain("glm-5");
		});

		it("should define kimi-k2 model", () => {
			expect(AVAILABLE_MODELS).toContain("kimi-k2");
		});

		it("should define minimax-m3 model", () => {
			expect(AVAILABLE_MODELS).toContain("minimax-m3");
		});

		it("should have 5 available models", () => {
			expect(AVAILABLE_MODELS).toHaveLength(5);
		});

		it("should default to first model", () => {
			const client = new OpenCodeClient("test-api-key");
			expect(client.model).toBe("qwen3.7");
		});
	});

	describe("Model Selection", () => {
		it("should accept valid model override", () => {
			const client = new OpenCodeClient("test-api-key", "deepseek-v4");
			expect(client.model).toBe("deepseek-v4");
		});

		it("should throw on invalid model", () => {
			expect(() => {
				new OpenCodeClient("test-api-key", "invalid-model");
			}).toThrow("Invalid model");
		});

		it("should allow changing model after initialization", () => {
			const client = new OpenCodeClient("test-api-key");
			client.setModel("glm-5");
			expect(client.model).toBe("glm-5");
		});
	});

	describe("chat() - Non-streaming", () => {
		it("should send correct request to OpenCode API", async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: "Test response content",
						},
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const client = new OpenCodeClient("test-api-key");
			const result = await client.chat([
				{ role: "user", content: "Hello" },
			]);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://opencode.ai/zen/go/v1/chat/completions",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						Authorization: "Bearer test-api-key",
						"Content-Type": "application/json",
					}),
					body: expect.stringContaining("qwen3.7"),
				}),
			);
			expect(result).toBe("Test response content");
		});

		it("should handle API errors gracefully", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: "Unauthorized",
			});

			const client = new OpenCodeClient("invalid-key");
			await expect(client.chat([{ role: "user", content: "Hi" }])).rejects.toThrow(
				"API error: 401 Unauthorized",
			);
		});

		it("should handle network errors", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			const client = new OpenCodeClient("test-api-key");
			await expect(client.chat([{ role: "user", content: "Hi" }])).rejects.toThrow(
				"Network error",
			);
		});
	});

	describe("streamChat() - SSE Streaming", () => {
		it("should return async generator for streaming", async () => {
			const mockStreamResponse = {
				ok: true,
				body: {
					getReader: () => ({
						read: jest
							.fn()
							.mockResolvedValueOnce({
								done: false,
								value: new TextEncoder().encode(
									'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
								),
							})
							.mockResolvedValueOnce({
								done: true,
								value: new Uint8Array(),
							}),
						cancel: jest.fn(),
					}),
				},
			};

			mockFetch.mockResolvedValueOnce(mockStreamResponse);

			const client = new OpenCodeClient("test-api-key");
			const stream = client.streamChat([{ role: "user", content: "Hi" }]);

			const chunks: string[] = [];
			for await (const chunk of stream) {
				chunks.push(chunk);
			}

			expect(mockFetch).toHaveBeenCalledWith(
				"https://opencode.ai/zen/go/v1/chat/completions",
				expect.objectContaining({
					body: expect.stringContaining('"stream":true'),
				}),
			);
			expect(chunks).toContain("Hello");
		});

		it("should parse SSE data format correctly", async () => {
			const sseData = 'data: {"choices":[{"delta":{"content":"Test"}}]}\n\n';
			const encoder = new TextEncoder();

			const mockStreamResponse = {
				ok: true,
				body: {
					getReader: () => ({
						read: jest
							.fn()
							.mockResolvedValueOnce({
								done: false,
								value: encoder.encode(sseData),
							})
							.mockResolvedValueOnce({
								done: true,
								value: new Uint8Array(),
							}),
						cancel: jest.fn(),
					}),
				},
			};

			mockFetch.mockResolvedValueOnce(mockStreamResponse);

			const client = new OpenCodeClient("test-api-key");
			const chunks: string[] = [];

			for await (const chunk of client.streamChat([
				{ role: "user", content: "Test" },
			])) {
				chunks.push(chunk);
			}

			expect(chunks).toContain("Test");
		});

		it("should handle empty deltas", async () => {
			const sseData = 'data: {"choices":[{"delta":{}}]}\n\n';
			const encoder = new TextEncoder();

			const mockStreamResponse = {
				ok: true,
				body: {
					getReader: () => ({
						read: jest
							.fn()
							.mockResolvedValueOnce({
								done: false,
								value: encoder.encode(sseData),
							})
							.mockResolvedValueOnce({
								done: true,
								value: new Uint8Array(),
							}),
						cancel: jest.fn(),
					}),
				},
			};

			mockFetch.mockResolvedValueOnce(mockStreamResponse);

			const client = new OpenCodeClient("test-api-key");
			const chunks: string[] = [];

			for await (const chunk of client.streamChat([
				{ role: "user", content: "Test" },
			])) {
				chunks.push(chunk);
			}

			// Empty delta should not yield any chunk
			expect(chunks).toHaveLength(0);
		});

		it("should handle [DONE] signal", async () => {
			const mockStreamResponse = {
				ok: true,
				body: {
					getReader: () => ({
						read: jest
							.fn()
							.mockResolvedValueOnce({
								done: false,
								value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Done"}}]}\n\n'),
							})
							.mockResolvedValueOnce({
								done: false,
								value: new TextEncoder().encode("data: [DONE]\n\n"),
							})
							.mockResolvedValueOnce({
								done: true,
								value: new Uint8Array(),
							}),
						cancel: jest.fn(),
					}),
				},
			};

			mockFetch.mockResolvedValueOnce(mockStreamResponse);

			const client = new OpenCodeClient("test-api-key");
			const chunks: string[] = [];

			for await (const chunk of client.streamChat([
				{ role: "user", content: "Test" },
			])) {
				chunks.push(chunk);
			}

			expect(chunks).toContain("Done");
			expect(chunks).toHaveLength(1); // Should stop after [DONE]
		});

		it("should throw on stream fetch error", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Stream error"));

			const client = new OpenCodeClient("test-api-key");
			const stream = client.streamChat([{ role: "user", content: "Test" }]);

			// Async generators throw when consumed, not when created
			await expect(stream.next()).rejects.toThrow("Stream error");
		});
	});

	describe("Request Formatting", () => {
		it("should include messages array in request", async () => {
			const mockResponse = {
				choices: [
					{
						message: { content: "Response" },
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const client = new OpenCodeClient("test-api-key");
			await client.chat([
				{ role: "system", content: "You are helpful" },
				{ role: "user", content: "Hello" },
			]);

			const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(callBody.messages).toHaveLength(2);
			expect(callBody.messages[0].role).toBe("system");
			expect(callBody.messages[1].role).toBe("user");
		});

		it("should set max_tokens in request", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: "Response" } }],
				}),
			});

			const client = new OpenCodeClient("test-api-key");
			await client.chat([{ role: "user", content: "Hi" }], {
				maxTokens: 1000,
			});

			const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(callBody.max_tokens).toBe(1000);
		});
	});

	describe("Error Handling", () => {
		it("should throw QuotaExceededError for 429 status", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
			});

			const client = new OpenCodeClient("test-api-key");
			await expect(
				client.chat([{ role: "user", content: "Test" }]),
			).rejects.toThrow("API error: 429 Too Many Requests");
		});

		it("should handle malformed JSON response", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => {
					throw new Error("Invalid JSON");
				},
			});

			const client = new OpenCodeClient("test-api-key");
			await expect(
				client.chat([{ role: "user", content: "Test" }]),
			).rejects.toThrow();
		});
	});
});