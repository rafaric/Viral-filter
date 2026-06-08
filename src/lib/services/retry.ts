/**
 * T8.4: Retry Service
 * Retry with exponential backoff for YouTube API
 */

export interface RetryOptions {
	maxRetries?: number;
	baseDelay?: number;
	maxDelay?: number;
	jitterFactor?: number;
	timeout?: number;
	retryableStatuses?: number[];
	onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface RetryResult<T> {
	success: boolean;
	data?: T;
	error?: Error;
	attempts: number;
	totalTime: number;
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxRetries: 3,
	baseDelay: 1000, // 1 second
	maxDelay: 30000, // 30 seconds
	jitterFactor: 0.3,
	timeout: 60000, // 60 seconds
	retryableStatuses: [429, 500, 502, 503, 504] as number[],
	onRetry: (_attempt: number, _error: Error, _delay: number) => {},
};

/**
 * Check if an HTTP status is retryable
 */
export function isRetryableStatus(status: number, retryableStatuses: number[]): boolean {
	return retryableStatuses.includes(status);
}

/**
 * Check if an error is a quota exceeded error
 */
export function isQuotaExceededError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;

	const e = error as Record<string, unknown>;

	// Check YouTube API quota exceeded error
	if (e.status === 403 || e.status === 429) {
		const errors = e.errors as Array<{ reason?: string }> | undefined;
		if (errors?.some((err) => err.reason === "quotaExceeded" || err.reason === "rateLimitExceeded")) {
			return true;
		}
	}

	return false;
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoff(
	attempt: number,
	baseDelay: number,
	maxDelay: number,
	jitterFactor: number,
): number {
	// Exponential backoff: baseDelay * 2^(attempt - 1)
	const exponentialDelay = baseDelay * 2 ** (attempt - 1);

	// Cap at max delay
	const cappedDelay = Math.min(exponentialDelay, maxDelay);

	// Add jitter (±jitterFactor) to prevent thundering herd
	const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);
	const finalDelay = Math.max(0, cappedDelay + jitter);

	return Math.round(finalDelay);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {},
): Promise<RetryResult<T>> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const startTime = Date.now();

	for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
		try {
			const data = await fn();
			return {
				success: true,
				data,
				attempts: attempt,
				totalTime: Date.now() - startTime,
			};
		} catch (error) {
			const elapsed = Date.now() - startTime;

			// Check timeout
			if (elapsed >= opts.timeout) {
				return {
					success: false,
					error: error instanceof Error ? error : new Error(String(error)),
					attempts: attempt,
					totalTime: elapsed,
				};
			}

			// Check if last attempt
			if (attempt > opts.maxRetries) {
				return {
					success: false,
					error: error instanceof Error ? error : new Error(String(error)),
					attempts: attempt,
					totalTime: Date.now() - startTime,
				};
			}

			// Check if error is retryable
			const isRetryable = checkIfRetryable(error, opts.retryableStatuses);
			if (!isRetryable) {
				return {
					success: false,
					error: error instanceof Error ? error : new Error(String(error)),
					attempts: attempt,
					totalTime: Date.now() - startTime,
				};
			}

			// Calculate backoff delay
			const delay = calculateBackoff(
				attempt,
				opts.baseDelay,
				opts.maxDelay,
				opts.jitterFactor,
			);

			// Call onRetry callback if provided
			if (opts.onRetry) {
				opts.onRetry(
					attempt,
					error instanceof Error ? error : new Error(String(error)),
					delay,
				);
			}

			// Wait before retry
			await sleep(delay);
		}
	}

	// Should not reach here, but TypeScript needs it
	return {
		success: false,
		error: new Error("Max retries exceeded"),
		attempts: opts.maxRetries + 1,
		totalTime: Date.now() - startTime,
	};
}

/**
 * Check if an error is retryable
 */
function checkIfRetryable(error: unknown, retryableStatuses: number[]): boolean {
	if (!error) return false;

	// Network errors
	if (error instanceof TypeError && error.message.includes("fetch")) {
		return true;
	}

	// HTTP status codes
	if (error instanceof Error && error.message.includes("HTTP ")) {
		const statusMatch = error.message.match(/HTTP (\d+)/);
		if (statusMatch) {
			const status = parseInt(statusMatch[1], 10);
			return isRetryableStatus(status, retryableStatuses);
		}
	}

	// YouTube API quota exceeded
	if (isQuotaExceededError(error)) {
		return true;
	}

	// Generic retry for unknown errors (with backoff)
	return true;
}

/**
 * Retry decorator for class methods
 */
export function retryable<T extends (...args: unknown[]) => Promise<unknown>>(
	options: RetryOptions = {},
): (
	target: unknown,
	propertyKey: string,
	descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> {
	return (
		_target: unknown,
		_propertyKey: string,
		descriptor: TypedPropertyDescriptor<T>,
	): TypedPropertyDescriptor<T> => {
		const originalMethod = descriptor.value;

		if (!originalMethod) {
			return descriptor;
		}

		descriptor.value = async function (this: unknown, ...args: Parameters<T>): Promise<ReturnType<T>> {
			const result = await withRetry(
				() => originalMethod.apply(this, args) as Promise<ReturnType<T>>,
				options,
			);

			if (result.success && result.data !== undefined) {
				return result.data;
			}

			throw result.error || new Error("Retry failed");
		} as T;

		return descriptor;
	};
}

/**
 * Create a retry wrapper for a specific API call
 */
export function createRetryWrapper(
	apiCall: () => Promise<Response>,
	options?: RetryOptions,
): () => Promise<Response> {
	return async () => {
		const result = await withRetry(apiCall, options);
		if (result.success && result.data) {
			return result.data;
		}
		throw result.error || new Error("API call failed after retries");
	};
}

/**
 * YouTube API specific retry handler
 */
export class YouTubeRetryHandler {
	private options: Required<RetryOptions>;

	constructor(options: RetryOptions = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
		// YouTube specific: increase retries for quota errors
		this.options.maxRetries = Math.max(this.options.maxRetries, 5);
		this.options.baseDelay = 2000; // Start with 2 seconds
	}

	/**
	 * Handle a YouTube API response with retry
	 */
	async handle<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
		return withRetry(fn, this.options);
	}

	/**
	 * Check if error is a quota exceeded error
	 */
	isQuotaError(error: unknown): boolean {
		return isQuotaExceededError(error);
	}

	/**
	 * Get recommended wait time for quota recovery
	 */
	getQuotaRecoveryTime(error: unknown): number {
		if (isQuotaExceededError(error)) {
			// YouTube quota typically resets at midnight PST
			// Suggest waiting 1 hour minimum
			return 60 * 60 * 1000;
		}
		return this.options.baseDelay;
	}
}

// Factory function
export function createRetryHandler(options?: RetryOptions): YouTubeRetryHandler {
	return new YouTubeRetryHandler(options);
}

export default {
	withRetry,
	retryable,
	createRetryWrapper,
	calculateBackoff,
	isRetryableStatus,
	isQuotaExceededError,
	sleep,
	createRetryHandler,
	YouTubeRetryHandler,
};