/**
 * AI Prompt Builder
 * Generates prompts for OpenCode AI based on analysis type and video data
 */

import type { Video } from "@/types";

export const PROMPT_TEMPLATES = {
	idea: "idea",
	keyword: "keyword",
	competitor: "competitor",
	optimize: "optimize",
} as const;

export type PromptType = (typeof PROMPT_TEMPLATES)[keyof typeof PROMPT_TEMPLATES];

/**
 * Format a number with commas for readability
 */
function formatNumber(num: number | undefined): string {
	if (num === undefined) return "N/A";
	return num.toLocaleString("en-US");
}

/**
 * Format video data for prompts
 */
function formatVideoForPrompt(video: Video): string {
	const parts: string[] = [];

	parts.push(`Title: ${video.title}`);

	if (video.description) {
		const shortDesc =
			video.description.length > 200
				? video.description.slice(0, 200) + "..."
				: video.description;
		parts.push(`Description: ${shortDesc}`);
	}

	parts.push(`Channel: ${video.channelTitle}`);

	if (video.viewCount !== undefined) {
		parts.push(`Views: ${formatNumber(video.viewCount)}`);
	}

	if (video.likeCount !== undefined) {
		parts.push(`Likes: ${formatNumber(video.likeCount)}`);
	}

	if (video.commentCount !== undefined) {
		parts.push(`Comments: ${formatNumber(video.commentCount)}`);
	}

	if (video.tags && video.tags.length > 0) {
		parts.push(`Tags: ${video.tags.join(", ")}`);
	}

	if (video.publishedAt) {
		const date = new Date(video.publishedAt).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
		parts.push(`Published: ${date}`);
	}

	return parts.join("\n");
}

/**
 * Build prompt for content idea generation
 */
export function buildIdeaPrompt(videos: Video[]): string {
	const header = `# Content Idea Generator

Based on the following trending videos, suggest new content ideas:

`;

	if (videos.length === 0) {
		return (
			header +
			"No videos provided. Please provide some videos to analyze for content ideas."
		);
	}

	const videoList = videos
		.map((v, i) => `## Video ${i + 1}\n${formatVideoForPrompt(v)}`)
		.join("\n\n");

	const footer = `

Please provide:
1. 5-10 content ideas that could perform well based on these videos
2. Target audience for each idea
3. Unique angle or hook for each idea
4. Estimated difficulty level (Easy/Medium/Hard)
`;

	return header + videoList + footer;
}

/**
 * Build prompt for keyword extraction
 */
export function buildKeywordPrompt(videos: Video[]): string {
	const header = `# Keyword Research & Extraction

From the following videos, extract trending keywords and search terms:

`;

	if (videos.length === 0) {
		return (
			header +
			"No videos provided. Please provide videos to analyze for keywords."
		);
	}

	const videoList = videos
		.map((v, i) => `## Video ${i + 1}\n${formatVideoForPrompt(v)}`)
		.join("\n\n");

	const footer = `

Please suggest and extract:
1. Primary keywords (high search volume)
2. Long-tail keywords (specific phrases)
3. Trending topics or themes
4. Competitor keywords (words used by similar channels)
5. Audience intent keywords (informational, transactional, etc.)
`;

	return header + videoList + footer;
}

/**
 * Build prompt for competitor analysis
 */
export function buildCompetitorPrompt(
	channelId: string,
	channelName: string,
	videos: Video[],
	competitorChannels?: string[],
): string {
	const header = `# Competitor Analysis

Analyzing channel: **${channelName}** (ID: ${channelId})

`;

	let content = "";

	if (videos.length > 0) {
		const videoList = videos
			.map((v, i) => `## Recent Video ${i + 1}\n${formatVideoForPrompt(v)}`)
			.join("\n\n");
		content += videoList + "\n\n";
	}

	if (competitorChannels && competitorChannels.length > 0) {
		content += `## Competitor Channels\n${competitorChannels.join("\n")}\n\n`;
	}

	const footer = `

Please provide:
1. Content strategy analysis
2. Strengths and weaknesses
3. Content gaps to exploit
4. Posting frequency recommendations
5. Topics to differentiate from
6. Engagement strategies used
`;

	return header + content + footer;
}

/**
 * Build prompt for content optimization
 */
export function buildOptimizePrompt(
	content: {
		title?: string;
		description?: string;
		type?: "title" | "description" | "hook";
	},
	context?: {
		channelName?: string;
		targetAudience?: string;
		similarVideos?: Video[];
	},
): string {
	const contentType = content.type || "title";
	const header = `# Content Optimizer

Optimizing content type: **${contentType}**

`;

	let contentPart = "";
	if (content.title) {
		contentPart += `## Original Title\n${content.title}\n\n`;
	}
	if (content.description) {
		contentPart += `## Original Description\n${content.description}\n\n`;
	}

	let contextPart = "";
	if (context) {
		if (context.channelName) {
			contextPart += `Channel: ${context.channelName}\n`;
		}
		if (context.targetAudience) {
			contextPart += `Target Audience: ${context.targetAudience}\n`;
		}
		if (context.similarVideos && context.similarVideos.length > 0) {
			contextPart += "\n## Similar High-Performing Videos\n";
			contextPart += context.similarVideos
				.map((v) => `Title: ${v.title} (${formatNumber(v.viewCount)} views)`)
				.join("\n");
		}
	}

	const footer = `

Please provide optimized version with:
1. Improved ${content.type} that respects the original intent
2. Key SEO terms to include
3. Engagement hooks to add
4. Why this optimization will perform better
`;

	return header + contentPart + (contextPart ? contextPart + "\n" : "") + footer;
}

/**
 * Get the system prompt for the AI assistant
 */
export function getSystemPrompt(): string {
	return `You are a helpful YouTube content strategy assistant. Your role is to:

- Analyze trending videos and suggest content ideas
- Research and extract keywords for better SEO
- Compare channels and provide competitive insights
- Optimize titles, descriptions, and hooks for maximum engagement

Always consider:
- Current YouTube trends and algorithm preferences
- Audience retention and click-through rates
- SEO best practices and keyword research
- Content differentiation from existing videos

Provide actionable, specific recommendations backed by data when possible.`;
}

/**
 * Factory function to create prompt builder
 */
export function createPromptBuilder() {
	return {
		buildIdeaPrompt,
		buildKeywordPrompt,
		buildCompetitorPrompt,
		buildOptimizePrompt,
		getSystemPrompt,
	};
}

export default {
	buildIdeaPrompt,
	buildKeywordPrompt,
	buildCompetitorPrompt,
	buildOptimizePrompt,
	getSystemPrompt,
	PROMPT_TEMPLATES,
};