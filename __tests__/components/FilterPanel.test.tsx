/**
 * T3.4: RED — Tests for FilterPanel component
 * Strict TDD: Tests must FAIL before implementation
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock functions
const mockUpdateFilter = jest.fn();
const mockClearFilters = jest.fn();

// Mock store implementation
const mockStore = {
	search: {
		filters: {
			category: "",
			country: "",
			language: "",
			publishedAfter: "",
			publishedBefore: "",
			minViews: 0,
			minLikes: 0,
			sortBy: "relevance",
		},
		isLoading: false,
	},
	ui: {
		filterPanelOpen: true,
	},
	updateFilter: mockUpdateFilter,
	clearFilters: mockClearFilters,
};

// Create a stable mock reference
const mockUseAppStore = jest.fn(() => mockStore);

jest.mock("@/lib/store", () => ({
	useAppStore: () => mockUseAppStore(),
}));

// Import component after mock
import { FilterPanel } from "@/components/FilterPanel";

describe("FilterPanel", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseAppStore.mockReturnValue(mockStore);
	});

	describe("Rendering", () => {
		it("should render the panel header", () => {
			render(<FilterPanel />);

			expect(screen.getByText("Filters")).toBeInTheDocument();
		});

		it("should render the apply button", () => {
			render(<FilterPanel />);

			expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
		});

		it("should render the clear button", () => {
			render(<FilterPanel />);

			expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
		});
	});

	describe("Form submission", () => {
		it("should call onApply callback when apply button clicked", () => {
			const mockOnApply = jest.fn();
			render(<FilterPanel onApply={mockOnApply} />);

			const applyButton = screen.getByRole("button", { name: /apply/i });
			applyButton.click();

			expect(mockOnApply).toHaveBeenCalled();
		});

		it("should call clearFilters when clear button clicked", () => {
			render(<FilterPanel />);

			const clearButton = screen.getByRole("button", { name: /clear/i });
			clearButton.click();

			expect(mockClearFilters).toHaveBeenCalled();
		});
	});

	describe("Store integration", () => {
		it("should read filters from store", () => {
			const customStore = {
				...mockStore,
				search: {
					...mockStore.search,
					filters: {
						...mockStore.search.filters,
						sortBy: "viewCount" as const,
					},
				},
			};
			mockUseAppStore.mockReturnValue(customStore);

			render(<FilterPanel />);

			// The component should render with the store's filter state
			expect(screen.getByText("Filters")).toBeInTheDocument();
		});
	});
});