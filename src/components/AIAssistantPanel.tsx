/**
 * T5.6: AI Assistant Panel
 * Analysis type selector, input area, streaming output, format toggle
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIStreamOutput } from "@/components/AIStreamOutput";
import {
	OutputFormatToggle,
	type OutputFormatType,
} from "@/components/OutputFormatToggle";
import { QuotaIndicator } from "@/components/QuotaIndicator";
import { useAppStore } from "@/lib/store";
import { AVAILABLE_MODELS, type ModelName } from "@/lib/services/aiclient";
import type { Video } from "@/types";

export interface AIAssistantPanelProps {
	/** Selected videos for analysis */
	selectedVideos?: Video[];
	/** Callback when analysis starts */
	onAnalysisStart?: (type: AnalysisType) => void;
	/** Callback when analysis completes */
	onAnalysisComplete?: (type: AnalysisType, result: string) => void;
	/** Whether the panel is collapsible */
	collapsible?: boolean;
	/** Default collapsed state */
	defaultCollapsed?: boolean;
	/** Additional CSS classes */
	className?: string;
}

export type AnalysisType = "idea" | "keyword" | "competitor" | "optimize";

/**
 * Analysis type configuration
 */
const ANALYSIS_TYPES: {
	type: AnalysisType;
	label: string;
	description: string;
	icon: React.ReactNode;
}[] = [
	{
		type: "idea",
		label: "Idea Generator",
		description: "Generate content ideas based on selected videos",
		icon: <LightbulbIcon className="h-4 w-4" />,
	},
	{
		type: "keyword",
		label: "Keyword Extraction",
		description: "Extract trending keywords and topics",
		icon: <TagIcon className="h-4 w-4" />,
	},
	{
		type: "competitor",
		label: "Competitor Analysis",
		description: "Analyze competitor channels and strategies",
		icon: <ChartIcon className="h-4 w-4" />,
	},
	{
		type: "optimize",
		label: "Content Optimize",
		description: "Optimize titles, descriptions, and hooks",
		icon: <SparklesIcon className="h-4 w-4" />,
	},
];

/**
 * AI Assistant Panel - Main AI analysis interface
 */
export function AIAssistantPanel({
	selectedVideos = [],
	collapsible = true,
	defaultCollapsed = false,
	className,
}: AIAssistantPanelProps) {
	// State
	const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
	const [analysisType, setAnalysisType] = useState<AnalysisType>("idea");
	const [outputFormat, setOutputFormat] = useState<OutputFormatType>("text");
	const [selectedModel, setSelectedModel] = useState<ModelName>(
		AVAILABLE_MODELS[0],
	);
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamComplete, setStreamComplete] = useState(false);
	const [streamError, setStreamError] = useState<string | null>(null);
	const [content, setContent] = useState("");

	// Get videos from store if not provided via props
	const storeVideos = useAppStore((state) => state.search.results);
	const effectiveVideos =
		selectedVideos.length > 0 ? selectedVideos : storeVideos;

	// Get selected video IDs
	const selectedVideoIds = useAppStore((state) => state.ui.selectedVideos);
	const selectedStoreVideos = useMemo(
		() => effectiveVideos.filter((v) => selectedVideoIds.includes(v.id)),
		[effectiveVideos, selectedVideoIds],
	);

	// Build request body for analysis
	const requestBody = useMemo(() => {
		const body: Record<string, unknown> = {
			type: analysisType,
			data: {},
			model: selectedModel,
			outputFormat,
		};

		if (analysisType === "idea" || analysisType === "keyword") {
			body.data = { videos: selectedStoreVideos };
		} else if (analysisType === "competitor") {
			body.data = {
				videos: selectedStoreVideos.slice(0, 5), // Limit to 5 videos
				channelId: selectedStoreVideos[0]?.channelId,
				channelName: selectedStoreVideos[0]?.channelTitle,
			};
		} else if (analysisType === "optimize") {
			body.data = {
				content: {
					title: selectedStoreVideos[0]?.title,
					description: selectedStoreVideos[0]?.description,
					type: "title",
				},
				channelName: selectedStoreVideos[0]?.channelTitle,
			};
		}

		return body;
	}, [analysisType, selectedStoreVideos, selectedModel, outputFormat]);

	// Handle stream start
	const handleStreamStart = useCallback(() => {
		setIsStreaming(true);
		setStreamComplete(false);
		setStreamError(null);
	}, []);

	// Handle stream end
	const handleStreamEnd = useCallback((result: string) => {
		setIsStreaming(false);
		setStreamComplete(true);
		setContent(result);
	}, []);

	// Handle stream error
	const handleStreamError = useCallback((error: string) => {
		setIsStreaming(false);
		setStreamError(error);
	}, []);

	// Handle format change
	const handleFormatChange = useCallback((format: OutputFormatType) => {
		setOutputFormat(format);
	}, []);

	// Get current analysis config
	const currentAnalysis = ANALYSIS_TYPES.find((a) => a.type === analysisType);

	return (
		<Card
			className={cn(
				"flex flex-col transition-all duration-300",
				collapsible && isCollapsed && "w-12",
				className,
			)}
		>
			{/* Header */}
			<CardHeader className="flex-shrink-0 p-4 border-b">
				<div className="flex items-center justify-between">
					{collapsible && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsCollapsed(!isCollapsed)}
							className="h-8 w-8 p-0"
						>
							{isCollapsed ? (
								<ChevronLeftIcon className="h-4 w-4" />
							) : (
								<ChevronRightIcon className="h-4 w-4" />
							)}
						</Button>
					)}
					{!isCollapsed && (
						<CardTitle className="text-lg flex items-center gap-2">
							<BotIcon className="h-5 w-5" />
							AI Assistant
						</CardTitle>
					)}
					{!isCollapsed && <QuotaIndicator compact endpoint="/api/quota" />}
				</div>
			</CardHeader>

			{/* Collapsed state - just show toggle button */}
			{collapsible && isCollapsed && (
				<div className="flex-1 flex items-center justify-center p-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsCollapsed(false)}
						className="h-full w-8"
					>
						<ChevronLeftIcon className="h-4 w-4 rotate-180" />
					</Button>
				</div>
			)}

			{/* Content */}
			{!isCollapsed && (
				<CardContent className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
					{/* Analysis type selector */}
					<div className="flex flex-col gap-2">
						<label className="text-sm font-medium">Analysis Type</label>
						<div className="grid grid-cols-2 gap-2">
							{ANALYSIS_TYPES.map((analysis) => (
								<button
									key={analysis.type}
									type="button"
									onClick={() => setAnalysisType(analysis.type)}
									className={cn(
										"flex items-center gap-2 p-2 rounded-lg border text-left transition-colors",
										analysisType === analysis.type
											? "border-primary bg-primary/10"
											: "border-border hover:bg-muted",
									)}
								>
									{analysis.icon}
									<span className="text-xs font-medium">{analysis.label}</span>
								</button>
							))}
						</div>
					</div>

					{/* Model selector */}
					<div className="flex flex-col gap-2">
						<label className="text-sm font-medium">AI Model</label>
						<select
							value={selectedModel}
							onChange={(e) => setSelectedModel(e.target.value as ModelName)}
							className="h-9 rounded-md border border-input bg-background px-3 text-sm"
						>
							{AVAILABLE_MODELS.map((model) => (
								<option key={model} value={model}>
									{model}
								</option>
							))}
						</select>
					</div>

					{/* Selected videos info */}
					{selectedStoreVideos.length > 0 && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<VideoIcon className="h-4 w-4" />
							<span>
								{selectedStoreVideos.length} video
								{selectedStoreVideos.length > 1 ? "s" : ""} selected for
								analysis
							</span>
						</div>
					)}

					{/* Analysis description */}
					{currentAnalysis && (
						<p className="text-xs text-muted-foreground">
							{currentAnalysis.description}
						</p>
					)}

					{/* Output area */}
					<div className="flex-1 flex flex-col min-h-0 gap-2">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Output</span>
							<OutputFormatToggle
								format={outputFormat}
								onFormatChange={handleFormatChange}
							/>
						</div>

						<div className="flex-1 min-h-[200px]">
							<AIStreamOutput
								endpoint={isStreaming || content ? "/api/analyze" : ""}
								requestBody={requestBody}
								isStreaming={isStreaming}
								isComplete={streamComplete}
								error={streamError || undefined}
								onContentChange={setContent}
								onStreamStart={handleStreamStart}
								onStreamEnd={handleStreamEnd}
								onError={handleStreamError}
							/>
						</div>
					</div>

					{/* Action buttons */}
					<div className="flex items-center gap-2">
						<Button
							onClick={() => {
								// Trigger re-analysis by resetting state
								setContent("");
								setIsStreaming(true);
							}}
							disabled={selectedStoreVideos.length === 0 || isStreaming}
							className="flex-1"
						>
							{isStreaming ? (
								<>
									<LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
									Analyzing...
								</>
							) : (
								<>
									<PlayIcon className="h-4 w-4 mr-2" />
									Start Analysis
								</>
							)}
						</Button>
					</div>
				</CardContent>
			)}
		</Card>
	);
}

// Icon components
function BotIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M12 8V4H8" />
			<rect width="16" height="12" x="4" y="8" rx="2" />
			<path d="M2 14h2" />
			<path d="M20 14h2" />
			<path d="M15 13v2" />
			<path d="M9 13v2" />
		</svg>
	);
}

function ChevronLeftIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="m15 18-6-6 6-6" />
		</svg>
	);
}

function ChevronRightIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="m9 18 6-6-6-6" />
		</svg>
	);
}

function LightbulbIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
			<path d="M9 18h6" />
			<path d="M10 22h4" />
		</svg>
	);
}

function TagIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
			<circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
		</svg>
	);
}

function ChartIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M3 3v18h18" />
			<path d="m19 9-5 5-4-4-3 3" />
		</svg>
	);
}

function SparklesIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
		</svg>
	);
}

function VideoIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="m22 8-6 4 6 4V8Z" />
			<rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
		</svg>
	);
}

function PlayIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<polygon points="6 3 20 12 6 21 6 3" />
		</svg>
	);
}

function LoaderIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M21 12a9 9 0 1 1-6.219-8.56" />
		</svg>
	);
}

export default AIAssistantPanel;
