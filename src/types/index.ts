// Shared types for viral-filter application

export interface Video {
	id: string;
	title: string;
	description?: string;
	channelId: string;
	channelTitle: string;
	publishedAt: string;
	viewCount?: number;
	likeCount?: number;
	commentCount?: number;
	categoryId?: string;
	tags?: string[];
	thumbnailUrl?: string;
	fetchedAt?: string;
	analyzedAt?: string;
	aiAnalysis?: string;
}

export interface Channel {
	id: string;
	title: string;
	description?: string;
	subscriberCount?: number;
	videoCount?: number;
	thumbnailUrl?: string;
	addedAt?: string;
	lastAnalyzed?: string;
}

export interface SearchFilters {
	category?: string;
	language?: string;
	country?: string;
	publishedAfter?: string;
	publishedBefore?: string;
	minViews?: number;
	minLikes?: number;
	sortBy?: "relevance" | "date" | "viewCount" | "rating";
}

export interface AnalysisRequest {
	type: "idea" | "keyword" | "competitor" | "optimize";
	data: {
		videos?: Video[];
		channelId?: string;
		content?: {
			title?: string;
			description?: string;
			type?: "title" | "description" | "hook";
		};
	};
	model?: string;
	outputFormat?: "text" | "json";
}

export interface TrendClassification {
	emerging: Video[];
	stable: Video[];
	declining: Video[];
}

export interface TrendData {
	trends: TrendClassification;
	keywords: string[];
	channels: Channel[];
	quotaUsed: number;
}

export interface QuotaData {
	daily: {
		used: number;
		limit: number;
		remaining: number;
		resetAt: string;
	};
	weekly: {
		used: number;
		trend: "increasing" | "stable" | "decreasing";
	};
}

export interface SearchResponse {
	items: Video[];
	nextPageToken?: string;
	quotaUsed: number;
	cached: boolean;
}

export interface ChannelStats {
	avgViews: number;
	avgLikes: number;
	totalVideos: number;
}

export interface ChannelDetail extends Channel {
	stats: ChannelStats;
	recentVideos: Video[];
}
