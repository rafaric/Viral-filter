/**
 * T3.7: SearchBar Component
 * Main search input with AI toggle
 */

"use client";

import { useState } from "react";
import { Search, Loader2, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface SearchBarProps {
	onSearch?: () => void;
	aiEnabled?: boolean;
	onAiToggle?: (enabled: boolean) => void;
	className?: string;
}

/**
 * SearchBar Component
 * Provides search input with optional AI toggle
 */
export function SearchBar({
	onSearch,
	aiEnabled = false,
	onAiToggle,
	className = "",
}: SearchBarProps) {
	const [inputValue, setInputValue] = useState("");
	const { search, setQuery } = useAppStore();
	const { query, isLoading } = search;

	// Sync input with store query
	const displayValue = query || inputValue;

	// Handle input change
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setInputValue(value);
		setQuery(value);
	};

	// Handle form submit
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (inputValue.trim() || query.trim()) {
			onSearch?.();
		}
	};

	// Handle AI toggle
	const handleAiToggle = (checked: boolean) => {
		onAiToggle?.(checked);
	};

	return (
		<form
			onSubmit={handleSubmit}
			className={cn("flex gap-2 w-full", className)}
		>
			<div className="relative flex-1">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Search YouTube videos..."
					value={displayValue}
					onChange={handleChange}
					className="pl-10 pr-4"
					disabled={isLoading}
					aria-label="Search videos"
				/>
				{isLoading && (
					<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
				)}
			</div>

			<Button type="submit" disabled={isLoading || (!displayValue && !query)}>
				{isLoading ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Search className="h-4 w-4" />
				)}
				<span className="ml-2">Search</span>
			</Button>

			{aiEnabled === true && (
				<div className="flex items-center gap-2 border rounded-md px-3 py-2">
					<Sparkles className="h-4 w-4 text-primary" />
					<Switch
						checked={aiEnabled}
						onCheckedChange={handleAiToggle}
						aria-label="Enable AI assistant"
					/>
				</div>
			)}
		</form>
	);
}

export default SearchBar;
