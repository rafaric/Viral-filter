/**
 * T5.3: OutputFormatToggle Component
 * Toggle between text and JSON output formats
 */

"use client";

import { cn } from "@/lib/utils";

export type OutputFormatType = "text" | "json";

export interface OutputFormatToggleProps {
	/** Current format selection */
	format: OutputFormatType;
	/** Callback when format changes */
	onFormatChange: (format: OutputFormatType) => void;
	/** Whether the toggle is disabled */
	disabled?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * OutputFormatToggle - Switch between text and JSON output modes
 */
export function OutputFormatToggle({
	format,
	onFormatChange,
	disabled = false,
	className,
}: OutputFormatToggleProps) {
	return (
		<div
			className={cn(
				"inline-flex rounded-md border bg-background p-0.5",
				className,
			)}
			role="group"
			aria-label="Output format selection"
		>
			<button
				type="button"
				onClick={() => onFormatChange("text")}
				disabled={disabled}
				className={cn(
					"px-3 py-1.5 text-xs font-medium rounded-l-md transition-colors",
					"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
					format === "text"
						? "bg-primary text-primary-foreground shadow-sm"
						: "text-muted-foreground hover:text-foreground hover:bg-muted",
					disabled && "opacity-50 cursor-not-allowed",
				)}
				aria-pressed={format === "text"}
			>
				<TextIcon className="inline-block h-3 w-3 mr-1" />
				Text
			</button>
			<button
				type="button"
				onClick={() => onFormatChange("json")}
				disabled={disabled}
				className={cn(
					"px-3 py-1.5 text-xs font-medium rounded-r-md transition-colors",
					"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
					format === "json"
						? "bg-primary text-primary-foreground shadow-sm"
						: "text-muted-foreground hover:text-foreground hover:bg-muted",
					disabled && "opacity-50 cursor-not-allowed",
				)}
				aria-pressed={format === "json"}
			>
				<JsonIcon className="inline-block h-3 w-3 mr-1" />
				JSON
			</button>
		</div>
	);
}

/**
 * Text icon
 */
function TextIcon({ className }: { className?: string }) {
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
			<polyline points="4 7 4 4 20 4 20 7" />
			<line x1="9" x2="15" y1="20" y2="20" />
			<line x1="12" x2="12" y1="4" y2="20" />
		</svg>
	);
}

/**
 * JSON/braces icon
 */
function JsonIcon({ className }: { className?: string }) {
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
			<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
			<path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
		</svg>
	);
}

export default OutputFormatToggle;
