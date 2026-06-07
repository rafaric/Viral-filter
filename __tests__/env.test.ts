/**
 * @jest-environment node
 */
import { z } from "zod";

// RED test - This should fail initially
describe("Environment Validation", () => {
	const envSchema = z.object({
		YOUTUBE_API_KEY: z.string().min(1),
		OPENCODE_API_KEY: z.string().min(1),
		DATABASE_URL: z.string().default("file:./dev.db"),
	});

	it("should require YOUTUBE_API_KEY", () => {
		const result = envSchema.safeParse({
			YOUTUBE_API_KEY: "",
			OPENCODE_API_KEY: "test",
		});
		expect(result.success).toBe(false);
	});

	it("should require OPENCODE_API_KEY", () => {
		const result = envSchema.safeParse({
			YOUTUBE_API_KEY: "test",
			OPENCODE_API_KEY: "",
		});
		expect(result.success).toBe(false);
	});

	it("should have default DATABASE_URL", () => {
		const result = envSchema.safeParse({
			YOUTUBE_API_KEY: "test",
			OPENCODE_API_KEY: "test",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.DATABASE_URL).toBe("file:./dev.db");
		}
	});

	it("should accept valid environment variables", () => {
		const result = envSchema.safeParse({
			YOUTUBE_API_KEY: "test_key_123",
			OPENCODE_API_KEY: "opencode_key_456",
			DATABASE_URL: "file:./custom.db",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.YOUTUBE_API_KEY).toBe("test_key_123");
			expect(result.data.OPENCODE_API_KEY).toBe("opencode_key_456");
			expect(result.data.DATABASE_URL).toBe("file:./custom.db");
		}
	});
});
