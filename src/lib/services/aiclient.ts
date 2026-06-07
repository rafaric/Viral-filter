/**
 * OpenCode Go Client
 * OpenAI-compatible client for OpenCode.ai API with streaming SSE support
 */

export const AVAILABLE_MODELS = [
	"qwen3.7",
	"deepseek-v4",
	"glm-5",
	"kimi-k2",
	"minimax-m3",
] as const;

export type ModelName = (typeof AVAILABLE_MODELS)[number];

export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface ChatOptions {
	maxTokens?: number;
	temperature?: number;
}

export interface OpenCodeClientConfig {
	apiKey: string;
	model?: ModelName;
	baseUrl?: string;
}

/**
 * OpenCode Go Client - OpenAI-compatible API client with streaming support
 */
export class OpenCodeClient {
	private apiKey: string;
	model: ModelName;
	private baseUrl: string;

	constructor(apiKey: string, model?: ModelName) {
		if (!apiKey) {
			throw new Error("API key is required");
		}

		// Validate model
		const defaultModel: ModelName = model ?? AVAILABLE_MODELS[0];
		if (model && !AVAILABLE_MODELS.includes(defaultModel)) {
			throw new Error(
				`Invalid model: ${model}. Available: ${AVAILABLE_MODELS.join(", ")}`,
			);
		}

		this.apiKey = apiKey;
		this.model = defaultModel;
		this.baseUrl = "https://opencode.ai/zen/go/v1";
	}

	/**
	 * Set a different model
	 */
	setModel(model: ModelName): void {
		if (!AVAILABLE_MODELS.includes(model)) {
			throw new Error(
				`Invalid model: ${model}. Available: ${AVAILABLE_MODELS.join(", ")}`,
			);
		}
		this.model = model;
	}

	/**
	 * Build request headers
	 */
	private getHeaders(): Record<string, string> {
		return {
			Authorization: `Bearer ${this.apiKey}`,
			"Content-Type": "application/json",
		};
	}

	/**
	 * Build request body for chat completions
	 */
	private buildBody(
		messages: ChatMessage[],
		options: ChatOptions = {},
		stream = false,
	): Record<string, unknown> {
		return {
			model: this.model,
			messages,
			stream,
			...(options.maxTokens && { max_tokens: options.maxTokens }),
			...{
				temperature:
					options.temperature !== undefined ? options.temperature : undefined,
			},
		};
	}

	/**
	 * Non-streaming chat completion
	 */
	async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
		const response = await fetch(`${this.baseUrl}/chat/completions`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify(this.buildBody(messages, options, false)),
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		// Handle OpenAI-compatible response format
		if (data.choices && data.choices[0]?.message?.content) {
			return data.choices[0].message.content;
		}

		throw new Error("Invalid response format from OpenCode API");
	}

	/**
	 * Streaming chat completion - returns async generator
	 */
	async *streamChat(
		messages: ChatMessage[],
		options: ChatOptions = {},
	): AsyncGenerator<string, void, unknown> {
		const response = await fetch(`${this.baseUrl}/chat/completions`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify(this.buildBody(messages, options, true)),
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.status} ${response.statusText}`);
		}

		if (!response.body) {
			throw new Error("No response body for streaming");
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					break;
				}

				// Decode chunk and add to buffer
				buffer += decoder.decode(value, { stream: true });

				// Process complete lines
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					// SSE data format: "data: {...}"
					if (line.startsWith("data: ")) {
						const data = line.slice(6).trim();

						// Check for [DONE] signal
						if (data === "[DONE]") {
							return;
						}

						// Parse JSON
						try {
							const parsed = JSON.parse(data);

							// Extract content delta
							const content = parsed.choices?.[0]?.delta?.content;

							if (content) {
								yield content;
							}
						} catch {
							// Skip malformed JSON lines
						}
					}
				}
			}
		} finally {
			reader.cancel();
		}
	}
}

/**
 * Factory function to create OpenCode client
 */
export function createOpenCodeClient(
	apiKey: string,
	model?: ModelName,
): OpenCodeClient {
	return new OpenCodeClient(apiKey, model);
}

export default OpenCodeClient;