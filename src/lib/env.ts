import { z } from "zod";

const envSchema = z.object({
	YOUTUBE_API_KEY: z.string().min(1, "YouTube API key is required"),
	OPENCODE_API_KEY: z.string().min(1, "OpenCode API key is required"),
	DATABASE_URL: z.string().default("file:./dev.db"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("❌ Invalid environment variables:");
	console.error(parsed.error.format());
	throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
