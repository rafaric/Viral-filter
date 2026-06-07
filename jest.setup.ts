import "@testing-library/jest-dom";

// ResizeObserver polyfill for Radix UI components
(global as { ResizeObserver?: unknown }).ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// Request/Response polyfills for jsdom
if (typeof Request === "undefined") {
	(global as Record<string, unknown>).Request = class Request {
		url: string;
		method: string;
		headers: Headers;
		constructor(url: string, init?: RequestInit) {
			this.url = url;
			this.method = init?.method || "GET";
			this.headers = new Headers(init?.headers);
		}
	} as unknown as typeof Request;
}

if (typeof Response === "undefined") {
	(global as Record<string, unknown>).Response = class Response {
		status: number;
		statusText: string;
		constructor(_body?: BodyInit | null, init?: ResponseInit) {
			this.status = init?.status || 200;
			this.statusText = init?.statusText || "OK";
		}
		// Add json method to Response instance
		static json = (() => {
			return async (data: unknown, init?: ResponseInit) => {
				const body = JSON.stringify(data);
				return new Response(body, {
					...init,
					headers: {
						"Content-Type": "application/json",
						...(init?.headers || {}),
					},
				});
			};
		})();
	} as unknown as typeof Response;
}

// TextEncoder/TextDecoder polyfills for SSE streaming tests (jsdom doesn't have them)
// Check if already available (Node 20+ has it natively)
if (typeof TextEncoder === "undefined" || typeof TextDecoder === "undefined") {
	// Use node's built-in from util if available
	try {
		const {
			TextEncoder: NodeTextEncoder,
			TextDecoder: NodeTextDecoder,
		} = require("util");
		if (typeof TextEncoder === "undefined") {
			(global as Record<string, unknown>).TextEncoder = NodeTextEncoder;
		}
		if (typeof TextDecoder === "undefined") {
			(global as Record<string, unknown>).TextDecoder = NodeTextDecoder;
		}
	} catch {
		// Fallback: define minimal stubs
		if (typeof TextEncoder === "undefined") {
			(global as Record<string, unknown>).TextEncoder = class {
				encode(input: string): Uint8Array {
					// Simple UTF-8 encoder
					const arr: number[] = [];
					for (let i = 0; i < input.length; i++) {
						const code = input.charCodeAt(i);
						if (code < 0x80) arr.push(code);
						else if (code < 0x800) {
							arr.push(0xc0 | (code >> 6));
							arr.push(0x80 | (code & 0x3f));
						} else if (code < 0x10000) {
							arr.push(0xe0 | (code >> 12));
							arr.push(0x80 | ((code >> 6) & 0x3f));
							arr.push(0x80 | (code & 0x3f));
						}
					}
					return new Uint8Array(arr);
				}
			};
		}
		if (typeof TextDecoder === "undefined") {
			(global as Record<string, unknown>).TextDecoder = class {
				decode(buffer: ArrayBuffer | Uint8Array): string {
					const bytes =
						buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
					return String.fromCharCode.apply(null, Array.from(bytes));
				}
			};
		}
	}
}