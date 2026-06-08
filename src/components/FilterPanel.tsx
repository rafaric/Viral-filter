/**
 * T3.5: FilterPanel Component
 * Collapsible sidebar with all search filters
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import type { SearchFilters } from "@/types";

// Category options (YouTube video categories)
const CATEGORIES = [
	{ value: "all", label: "All Categories" },
	{ value: "1", label: "Film & Animation" },
	{ value: "2", label: "Autos & Vehicles" },
	{ value: "10", label: "Music" },
	{ value: "15", label: "Pets & Animals" },
	{ value: "17", label: "Sports" },
	{ value: "18", label: "Short Movies" },
	{ value: "19", label: "Travel & Events" },
	{ value: "20", label: "Gaming" },
	{ value: "21", label: "Videoblogging" },
	{ value: "22", label: "People & Blogs" },
	{ value: "23", label: "Comedy" },
	{ value: "24", label: "Entertainment" },
	{ value: "25", label: "News & Politics" },
	{ value: "26", label: "Howto & Style" },
	{ value: "27", label: "Education" },
	{ value: "28", label: "Science & Technology" },
	{ value: "29", label: "Nonprofits & Activism" },
	{ value: "30", label: "Movies" },
	{ value: "31", label: "Anime/Animation" },
	{ value: "32", label: "Action/Adventure" },
	{ value: "33", label: "Classics" },
	{ value: "34", label: "Comedy" },
	{ value: "35", label: "Documentary" },
	{ value: "36", label: "Drama" },
	{ value: "37", label: "Family" },
	{ value: "38", label: "Foreign" },
	{ value: "39", label: "Horror" },
	{ value: "40", label: "Sci-Fi/Fantasy" },
	{ value: "41", label: "Thriller" },
	{ value: "42", label: "Shorts" },
	{ value: "43", label: "Shows" },
	{ value: "44", label: "Trailers" },
];

// Country options
const COUNTRIES = [
	{ value: "all", label: "All Countries" },
	{ value: "US", label: "United States" },
	{ value: "GB", label: "United Kingdom" },
	{ value: "ES", label: "Spain" },
	{ value: "MX", label: "Mexico" },
	{ value: "AR", label: "Argentina" },
	{ value: "FR", label: "France" },
	{ value: "DE", label: "Germany" },
	{ value: "IT", label: "Italy" },
	{ value: "BR", label: "Brazil" },
	{ value: "CA", label: "Canada" },
	{ value: "AU", label: "Australia" },
	{ value: "JP", label: "Japan" },
	{ value: "KR", label: "South Korea" },
	{ value: "IN", label: "India" },
];

// Language options
const LANGUAGES = [
	{ value: "all", label: "All Languages" },
	{ value: "en", label: "English" },
	{ value: "es", label: "Spanish" },
	{ value: "fr", label: "French" },
	{ value: "de", label: "German" },
	{ value: "it", label: "Italian" },
	{ value: "pt", label: "Portuguese" },
	{ value: "ru", label: "Russian" },
	{ value: "ja", label: "Japanese" },
	{ value: "ko", label: "Korean" },
	{ value: "zh", label: "Chinese" },
	{ value: "hi", label: "Hindi" },
	{ value: "ar", label: "Arabic" },
];

// Sort options
const SORT_OPTIONS = [
	{ value: "relevance", label: "Relevance" },
	{ value: "date", label: "Upload Date" },
	{ value: "viewCount", label: "View Count" },
	{ value: "rating", label: "Rating" },
];

export interface FilterPanelProps {
	onApply?: () => void;
	className?: string;
}

/**
 * FilterPanel Component
 * Provides all search filters in a collapsible sidebar
 */
export function FilterPanel({ onApply, className = "" }: FilterPanelProps) {
	const [isOpen, setIsOpen] = useState(true);
	const { search, updateFilter, clearFilters } = useAppStore();
	const { filters, isLoading } = search;

	// Handle filter change
	const handleFilterChange = (
		key: keyof SearchFilters,
		value: string | number,
	) => {
		// Handle "all" placeholder values
		const isAllValue = value === "all" || value === "";
		// Convert string numbers to actual numbers for minViews/minLikes
		if (key === "minViews" || key === "minLikes") {
			updateFilter(key, isAllValue ? undefined : Number(value));
		} else {
			updateFilter(key, isAllValue ? undefined : (value as string));
		}
	};

	// Handle apply button click
	const handleApply = () => {
		onApply?.();
	};

	// Handle clear button click
	const handleClear = () => {
		clearFilters();
	};

	return (
		<div className={`border-r bg-background ${className}`}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<div className="flex items-center gap-2">
						<Filter className="h-4 w-4" />
						<h2 className="font-semibold">Filters</h2>
					</div>
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm">
							{isOpen ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</Button>
					</CollapsibleTrigger>
				</div>

				{/* Collapsible Content */}
				<CollapsibleContent className="p-4 space-y-4">
					{/* Category Filter */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Category</label>
						<Select
							value={filters.category || ""}
							onValueChange={(value) => handleFilterChange("category", value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select category" />
							</SelectTrigger>
							<SelectContent>
								{CATEGORIES.map((cat) => (
									<SelectItem key={cat.value} value={cat.value}>
										{cat.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Country Filter */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Country</label>
						<Select
							value={filters.country || ""}
							onValueChange={(value) => handleFilterChange("country", value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select country" />
							</SelectTrigger>
							<SelectContent>
								{COUNTRIES.map((country) => (
									<SelectItem key={country.value} value={country.value}>
										{country.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Language Filter */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Language</label>
						<Select
							value={filters.language || ""}
							onValueChange={(value) => handleFilterChange("language", value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select language" />
							</SelectTrigger>
							<SelectContent>
								{LANGUAGES.map((lang) => (
									<SelectItem key={lang.value} value={lang.value}>
										{lang.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<Separator />

					{/* Date Range Filters */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Upload Date</label>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="text-xs text-muted-foreground">From</label>
								<Input
									type="date"
									value={filters.publishedAfter || ""}
									onChange={(e) =>
										handleFilterChange("publishedAfter", e.target.value)
									}
									aria-label="Published after"
								/>
							</div>
							<div>
								<label className="text-xs text-muted-foreground">To</label>
								<Input
									type="date"
									value={filters.publishedBefore || ""}
									onChange={(e) =>
										handleFilterChange("publishedBefore", e.target.value)
									}
									aria-label="Published before"
								/>
							</div>
						</div>
					</div>

					<Separator />

					{/* Engagement Filters */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Minimum Engagement</label>
						<div className="space-y-3">
							<div>
								<label className="text-xs text-muted-foreground">
									Min Views
								</label>
								<Input
									type="number"
									placeholder="0"
									value={filters.minViews || ""}
									onChange={(e) =>
										handleFilterChange("minViews", e.target.value)
									}
									aria-label="Minimum views"
									min="0"
								/>
							</div>
							<div>
								<label className="text-xs text-muted-foreground">
									Min Likes
								</label>
								<Input
									type="number"
									placeholder="0"
									value={filters.minLikes || ""}
									onChange={(e) =>
										handleFilterChange("minLikes", e.target.value)
									}
									aria-label="Minimum likes"
									min="0"
								/>
							</div>
						</div>
					</div>

					<Separator />

					{/* Sort By Filter */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Sort By</label>
						<Select
							value={filters.sortBy || "relevance"}
							onValueChange={(value) => handleFilterChange("sortBy", value)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SORT_OPTIONS.map((sort) => (
									<SelectItem key={sort.value} value={sort.value}>
										{sort.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<Separator />

					{/* Action Buttons */}
					<div className="flex gap-2">
						<Button
							onClick={handleApply}
							disabled={isLoading}
							className="flex-1"
						>
							Apply Filters
						</Button>
						<Button
							variant="outline"
							onClick={handleClear}
							disabled={isLoading}
						>
							<X className="h-4 w-4 mr-1" />
							Clear
						</Button>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}

export default FilterPanel;
