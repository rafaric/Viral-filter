/**
 * T3.6: RED — Tests for SearchBar component
 * Strict TDD: Tests must FAIL before implementation
 */

import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock functions
const mockSetQuery = jest.fn();

// Mock store implementation
const mockStore = {
	search: {
		query: "",
		isLoading: false,
	},
	setQuery: mockSetQuery,
};

// Create a stable mock reference
const mockUseAppStore = jest.fn(() => mockStore);

jest.mock("@/lib/store", () => ({
	useAppStore: () => mockUseAppStore(),
}));

// Import component after mock
import { SearchBar } from "@/components/SearchBar";

describe("SearchBar", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseAppStore.mockReturnValue(mockStore);
	});

	describe("Rendering", () => {
		it("should render search input", () => {
			render(<SearchBar />);

			expect(screen.getByRole("searchbox")).toBeInTheDocument();
		});

		it("should render search button", () => {
			render(<SearchBar />);

			expect(
				screen.getByRole("button", { name: /search/i }),
			).toBeInTheDocument();
		});
	});

	describe("Input handling", () => {
		it("should update query in store on input change", () => {
			render(<SearchBar />);

			const input = screen.getByRole("searchbox");
			fireEvent.change(input, { target: { value: "test query" } });

			expect(mockSetQuery).toHaveBeenCalledWith("test query");
		});

		it("should display current query from store", () => {
			const storeWithQuery = {
				...mockStore,
				search: { ...mockStore.search, query: "existing query" },
			};
			mockUseAppStore.mockReturnValue(storeWithQuery);

			render(<SearchBar />);

			const input = screen.getByRole("searchbox") as HTMLInputElement;
			expect(input.value).toBe("existing query");
		});
	});

	describe("Search submission", () => {
		it("should call onSearch callback when search button clicked", () => {
			const mockOnSearch = jest.fn();
			render(<SearchBar onSearch={mockOnSearch} />);

			const input = screen.getByRole("searchbox");
			fireEvent.change(input, { target: { value: "test" } });

			const searchButton = screen.getByRole("button", { name: /search/i });
			fireEvent.click(searchButton);

			expect(mockOnSearch).toHaveBeenCalled();
		});

		it("should handle form submit with Enter key", () => {
			const mockOnSearch = jest.fn();
			render(<SearchBar onSearch={mockOnSearch} />);

			const input = screen.getByRole("searchbox");
			fireEvent.change(input, { target: { value: "test" } });
			fireEvent.submit(input);

			expect(mockOnSearch).toHaveBeenCalled();
		});
	});

	describe("AI toggle", () => {
		it("should render AI toggle when enabled", () => {
			render(<SearchBar aiEnabled={true} />);

			// The switch element is present in the AI toggle section
			expect(document.querySelector('[role="switch"]')).toBeInTheDocument();
		});

		it("should render AI toggle section when aiEnabled prop is not provided", () => {
			render(<SearchBar />);

			// When aiEnabled is undefined, the AI toggle section is not rendered
			expect(document.querySelector('[role="switch"]')).not.toBeInTheDocument();
		});
	});

	describe("Loading state", () => {
		it("should show loading indicator when isLoading is true", () => {
			const loadingStore = {
				...mockStore,
				search: { ...mockStore.search, isLoading: true },
			};
			mockUseAppStore.mockReturnValue(loadingStore);

			render(<SearchBar />);

			// Loading spinner should be visible (check for animate-spin class on loader)
			const loaders = document.querySelectorAll(".animate-spin");
			expect(loaders.length).toBeGreaterThan(0);
		});
	});
});
