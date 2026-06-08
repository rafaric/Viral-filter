/**
 * T4.3: RED — Tests for AI prompt builder
 * Strict TDD: Tests must FAIL before implementation
 */

/**
 * @jest-environment node
 */

import type { Video } from "@/types";

describe("AI Prompt Builder", () => {
	let promptBuilder: any;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();

		// Lazy load the prompt builder
		promptBuilder = require("@/lib/services/prompts");
	});

	describe("Template Types", () => {
		it("should export idea template type", () => {
			expect(promptBuilder.PROMPT_TEMPLATES.idea).toBeDefined();
		});

		it("should export keyword template type", () => {
			expect(promptBuilder.PROMPT_TEMPLATES.keyword).toBeDefined();
		});

		it("should export competitor template type", () => {
			expect(promptBuilder.PROMPT_TEMPLATES.competitor).toBeDefined();
		});

		it("should export optimize template type", () => {
			expect(promptBuilder.PROMPT_TEMPLATES.optimize).toBeDefined();
		});
	});

	describe("buildIdeaPrompt()", () => {
		const mockVideos: Video[] = [
			{
				id: "vid1",
				title: "How to make money online",
				description: "Complete guide to earning money from home",
				channelId: "ch1",
				channelTitle: "Money Channel",
				publishedAt: "2024-01-15T00:00:00Z",
				viewCount: 1500000,
				likeCount: 45000,
			},
			{
				id: "vid2",
				title: "10 tips for productivity",
				description: "Boost your daily productivity with these tips",
				channelId: "ch2",
				channelTitle: "Productivity Pro",
				publishedAt: "2024-01-10T00:00:00Z",
				viewCount: 800000,
				likeCount: 25000,
			},
		];

		it("should include video titles in prompt", () => {
			const prompt = promptBuilder.buildIdeaPrompt(mockVideos);

			expect(prompt).toContain("How to make money online");
			expect(prompt).toContain("10 tips for productivity");
		});

		it("should include video statistics", () => {
			const prompt = promptBuilder.buildIdeaPrompt(mockVideos);

			expect(prompt).toContain("1,500,000");
			expect(prompt).toContain("800,000");
		});

		it("should ask for content ideas", () => {
			const prompt = promptBuilder.buildIdeaPrompt(mockVideos);

			expect(prompt).toContain("ideas");
			expect(prompt).toContain("suggest");
		});

		it("should handle empty video array", () => {
			const prompt = promptBuilder.buildIdeaPrompt([]);

			expect(prompt).toBeDefined();
			expect(typeof prompt).toBe("string");
		});
	});

	describe("buildKeywordPrompt()", () => {
		const mockVideos: Video[] = [
			{
				id: "vid1",
				title: "Python tutorial for beginners",
				description: "Learn Python from scratch",
				channelId: "ch1",
				channelTitle: "Code Academy",
				publishedAt: "2024-01-15T00:00:00Z",
				tags: ["python", "programming", "tutorial"],
			},
		];

		it("should extract keywords from video titles", () => {
			const prompt = promptBuilder.buildKeywordPrompt(mockVideos);

			expect(prompt).toContain("Python tutorial for beginners");
		});

		it("should include existing tags", () => {
			const prompt = promptBuilder.buildKeywordPrompt(mockVideos);

			expect(prompt).toContain("python");
			expect(prompt).toContain("programming");
		});

		it("should ask for keyword suggestions", () => {
			const prompt = promptBuilder.buildKeywordPrompt(mockVideos);

			expect(prompt).toContain("keyword");
			expect(prompt).toContain("suggest");
		});
	});

	describe("buildCompetitorPrompt()", () => {
		const mockVideos: Video[] = [
			{
				id: "vid1",
				title: "iPhone 15 Review",
				channelId: "ch123",
				channelTitle: "Tech Reviews",
				publishedAt: "2024-01-15T00:00:00Z",
				viewCount: 2000000,
			},
			{
				id: "vid2",
				title: "Samsung S24 Deep Dive",
				channelId: "ch123",
				channelTitle: "Tech Reviews",
				publishedAt: "2024-01-10T00:00:00Z",
				viewCount: 1500000,
			},
		];

		it("should include channel name", () => {
			const prompt = promptBuilder.buildCompetitorPrompt(
				"ch123",
				"Tech Reviews",
				mockVideos,
			);

			expect(prompt).toContain("Tech Reviews");
		});

		it("should include channel ID", () => {
			const prompt = promptBuilder.buildCompetitorPrompt(
				"ch123",
				"Tech Reviews",
				mockVideos,
			);

			expect(prompt).toContain("ch123");
		});

		it("should include video performance data", () => {
			const prompt = promptBuilder.buildCompetitorPrompt(
				"ch123",
				"Tech Reviews",
				mockVideos,
			);

			expect(prompt).toContain("2,000,000");
			expect(prompt).toContain("1,500,000");
		});

		it("should ask for competitive analysis", () => {
			const prompt = promptBuilder.buildCompetitorPrompt(
				"ch123",
				"Tech Reviews",
				mockVideos,
			);

			expect(prompt).toContain("Analysis");
		});
	});

	describe("buildOptimizePrompt()", () => {
		const mockContent = {
			title: "How to lose weight fast",
			description:
				"In this video I will show you the best ways to lose weight quickly",
			type: "title" as const,
		};

		it("should include the content to optimize", () => {
			const prompt = promptBuilder.buildOptimizePrompt(mockContent);

			expect(prompt).toContain("How to lose weight fast");
		});

		it("should specify content type", () => {
			const prompt = promptBuilder.buildOptimizePrompt(mockContent);

			expect(prompt).toContain("title");
		});

		it("should ask for optimization suggestions", () => {
			const prompt = promptBuilder.buildOptimizePrompt(mockContent);

			expect(prompt).toContain("optimize");
			expect(prompt).toContain("optimized");
		});

		it("should handle description type", () => {
			const content = { ...mockContent, type: "description" as const };
			const prompt = promptBuilder.buildOptimizePrompt(content);

			expect(prompt).toContain("description");
		});

		it("should handle hook type", () => {
			const content = { ...mockContent, type: "hook" as const };
			const prompt = promptBuilder.buildOptimizePrompt(content);

			expect(prompt).toContain("hook");
		});
	});

	describe("Video Data Injection", () => {
		const mockVideo: Video = {
			id: "vid123",
			title: "Amazing Video Title",
			description: "This is a detailed description of the video content",
			channelId: "ch456",
			channelTitle: "Test Channel",
			publishedAt: "2024-06-01T12:00:00Z",
			viewCount: 1000000,
			likeCount: 50000,
			commentCount: 10000,
			categoryId: "22",
			tags: ["tag1", "tag2", "tag3"],
		};

		it("should format view count with commas", () => {
			const prompt = promptBuilder.buildIdeaPrompt([mockVideo]);

			expect(prompt).toContain("1,000,000");
		});

		it("should include engagement metrics", () => {
			const prompt = promptBuilder.buildIdeaPrompt([mockVideo]);

			expect(prompt).toContain("50,000");
			expect(prompt).toContain("10,000");
		});

		it("should include publish date", () => {
			const prompt = promptBuilder.buildIdeaPrompt([mockVideo]);

			expect(prompt).toContain("2024");
		});

		it("should handle video without optional fields", () => {
			const minimalVideo: Video = {
				id: "vid-min",
				title: "Minimal Video",
				channelId: "ch-min",
				channelTitle: "Minimal Channel",
				publishedAt: "2024-01-01T00:00:00Z",
			};

			const prompt = promptBuilder.buildIdeaPrompt([minimalVideo]);

			expect(prompt).toContain("Minimal Video");
			expect(prompt).toBeDefined();
		});
	});

	describe("System Prompts", () => {
		it("should provide helpful assistant system prompt", () => {
			const systemPrompt = promptBuilder.getSystemPrompt();

			expect(systemPrompt).toContain("helpful");
			expect(systemPrompt).toContain("YouTube");
		});

		it("should include content creation focus", () => {
			const systemPrompt = promptBuilder.getSystemPrompt();

			expect(systemPrompt).toContain("content");
			expect(systemPrompt).toContain("video");
		});
	});
});
