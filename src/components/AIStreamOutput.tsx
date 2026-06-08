/**
 * T5.2: AIStreamOutput Component
 * SSE streaming display with chunked rendering, format toggle, and copy-to-clipboard
 */

"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type OutputFormat = "text" | "json";

export interface AIStreamOutputProps {
	/** SSE endpoint URL */
	endpoint?: string;
	/** Request body for the SSE request */
	requestBody?: Record<string, unknown>;
	/** Initial content to display */
	initialContent?: string;
	/** Custom placeholder text */
	placeholder?: string;
	/** Whether streaming is active */
	isStreaming?: boolean;
	/** Whether streaming is complete */
	isComplete?: boolean;
	/** Error message to display */
	error?: string;
	/** Callback when content changes */
	onContentChange?: (content: string) => void;
	/** Callback when streaming starts */
	onStreamStart?: () => void;
	/** Callback when streaming ends */
	onStreamEnd?: (result: string) => void;
	/** Callback when error occurs */
	onError?: (error: string) => void;
	/** Additional CSS classes */
	className?: string;
}

type StreamStatus = "idle" | "streaming" | "complete" | "error";

/**
 * AIStreamOutput - Displays streaming AI responses with SSE support
 */
export function AIStreamOutput({
	endpoint = "",
	requestBody,
	initialContent = "",
	placeholder = "No analysis yet. Select videos and choose an analysis type.",
	isStreaming = false,
	isComplete = false,
	error,
	onContentChange,
	onStreamStart,
	onStreamEnd,
	onError,
	className,
}: AIStreamOutputProps) {
	// State
	const [content, setContent] = useState(initialContent);
	const [format, setFormat] = useState<OutputFormat>("text");
	const [status, setStatus] = useState<StreamStatus>("idle");
	const [displayError, setDisplayError] = useState<string | null>(null);

	// Refs
	const contentRef = useRef<HTMLDivElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const onStreamStartRef = useRef(onStreamStart);
	const onStreamEndRef = useRef(onStreamEnd);
	const onErrorRef = useRef(onError);
	const endpointRef = useRef(endpoint);
	const requestBodyRef = useRef(requestBody);

	// Keep refs up to date
	useEffect(() => {
		onStreamStartRef.current = onStreamStart;
		onStreamEndRef.current = onStreamEnd;
		onErrorRef.current = onError;
		endpointRef.current = endpoint;
		requestBodyRef.current = requestBody;
	}, [onStreamStart, onStreamEnd, onError, endpoint, requestBody]);

	// Auto-scroll to bottom when content changes
	useEffect(() => {
		if (contentRef.current) {
			contentRef.current.scrollTop = contentRef.current.scrollHeight;
		}
	}, [content]);

	// Handle error prop
	useEffect(() => {
		if (error) {
			setDisplayError(error);
			setStatus("error");
		}
	}, [error]);

	// Update status based on props
	useEffect(() => {
		if (isStreaming) {
			setStatus("streaming");
		} else if (isComplete) {
			setStatus("complete");
		} else if (!displayError && !content) {
			setStatus("idle");
		}
	}, [isStreaming, isComplete, displayError, content]);

	// Notify parent of content changes
	useEffect(() => {
		onContentChange?.(content);
	}, [content, onContentChange]);

	/**
	 * Process SSE stream from endpoint
	 */
	const startStream = async () => {
		if (!endpointRef.current) return;

		// Cancel any existing stream
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		// Create new abort controller
		abortControllerRef.current = new AbortController();

		// Reset state
		setContent("");
		setStatus("streaming");
		setDisplayError(null);
		onStreamStartRef.current?.();

		try {
			const response = await fetch(endpointRef.current, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBodyRef.current),
				signal: abortControllerRef.current.signal,
			});

			if (!response.ok) {
				throw new Error(`HTTP error: ${response.status}`);
			}

			if (!response.body) {
				throw new Error("No response body");
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let fullContent = "";

			while (true) {
				const { done, value } = await reader.read();

				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6).trim();

						try {
							const parsed = JSON.parse(data);

							if (parsed.type === "chunk" && parsed.content) {
								fullContent += parsed.content;
								setContent(fullContent);
							} else if (parsed.type === "done") {
								setStatus("complete");
								onStreamEndRef.current?.(fullContent);
							} else if (parsed.type === "error") {
								throw new Error(parsed.message || "Stream error");
							}
						} catch {
							// Skip malformed JSON
						}
					}
				}
			}
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") {
				// Stream was cancelled
				return;
			}
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			setDisplayError(errorMessage);
			setStatus("error");
			onErrorRef.current?.(errorMessage);
		}
	};

	// Auto-start stream when endpoint is provided
	useEffect(() => {
		if (endpoint && !isStreaming && !content) {
			startStream();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [endpoint]);

	/**
	 * Copy content to clipboard
	 */
	const handleCopy = async () => {
		if (!content) return;

		try {
			await navigator.clipboard.writeText(content);
		} catch {
			// Fallback for older browsers
			const textarea = document.createElement("textarea");
			textarea.value = content;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);
		}
	};

	/**
	 * Clear content
	 */
	const handleClear = () => {
		setContent("");
		setStatus("idle");
		setDisplayError(null);
	};

	/**
	 * Format content for display based on current format
	 */
	const formattedContent = useMemo(() => {
		if (!content) return "";

		if (format === "json") {
			try {
				const parsed = JSON.parse(content);
				return JSON.stringify(parsed, null, 2);
			} catch {
				return content;
			}
		}

		return content;
	}, [content, format]);

	// Status badge configuration
	const statusConfig = useMemo(() => {
		switch (status) {
			case "streaming":
				return {
					label: "Analyzing...",
					className: "bg-blue-500 animate-pulse",
				};
			case "complete":
				return {
					label: "Complete",
					className: "bg-green-500",
				};
			case "error":
				return {
					label: "Error",
					className: "bg-destructive",
				};
			default:
				return {
					label: "Ready",
					className: "bg-muted",
				};
		}
	}, [status]);

	return (
		<div
			className={cn(
				"flex flex-col h-full border rounded-lg overflow-hidden",
				status === "error" && "border-destructive",
				className,
			)}
		>
			{/* Header with format toggle and actions */}
			<div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
				<div className="flex items-center gap-2">
					{/* Format toggle */}
					<div className="flex rounded-md border bg-background">
						<button
							type="button"
							onClick={() => setFormat("text")}
							disabled={!content}
							className={cn(
								"px-2 py-1 text-xs rounded-l-md transition-colors",
								format === "text"
									? "bg-primary text-primary-foreground"
									: "hover:bg-muted",
							)}
							aria-pressed={format === "text"}
						>
							Text
						</button>
						<button
							type="button"
							onClick={() => setFormat("json")}
							disabled={!content}
							className={cn(
								"px-2 py-1 text-xs rounded-r-md transition-colors",
								format === "json"
									? "bg-primary text-primary-foreground"
									: "hover:bg-muted",
							)}
							aria-pressed={format === "json"}
						>
							JSON
						</button>
					</div>

					{/* Status badge */}
					<Badge className={cn("text-xs", statusConfig.className)}>
						{statusConfig.label}
					</Badge>
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCopy}
						disabled={!content}
						className="h-7 px-2 text-xs"
					>
						<CopyIcon className="h-3 w-3 mr-1" />
						Copy
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClear}
						disabled={!content}
						className="h-7 px-2 text-xs"
					>
						Clear
					</Button>
				</div>
			</div>

			{/* Content area */}
			<div
				ref={contentRef}
				className="flex-1 overflow-y-auto p-4 font-mono text-sm"
			>
				{/* Error state */}
				{displayError ? (
					<div className="text-destructive">{displayError}</div>
				) : /* Content or placeholder */
				formattedContent ? (
					<pre
						className={cn(
							"whitespace-pre-wrap break-words",
							format === "json" && "text-green-600",
						)}
					>
						{formattedContent}
					</pre>
				) : (
					<div className="text-muted-foreground">
						{status === "streaming" ? (
							<span className="flex items-center gap-2">
								<span className="animate-pulse">...</span>
							</span>
						) : (
							placeholder
						)}
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * Copy icon component
 */
function CopyIcon({ className }: { className?: string }) {
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
			<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
			<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
		</svg>
	);
}

export default AIStreamOutput;
