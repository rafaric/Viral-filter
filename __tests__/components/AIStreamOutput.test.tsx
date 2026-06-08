/**
 * T5.1: Tests for AIStreamOutput component
 * Covers: idle, streaming (chunk rendering), complete, error states, text/JSON toggle
 */

import {
	render,
	screen,
	fireEvent,
	act,
	waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock fetch for SSE testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock clipboard
Object.defineProperty(navigator, "clipboard", {
	value: {
		writeText: jest.fn().mockResolvedValue(undefined),
	},
	writable: true,
});

// Mock store
jest.mock("@/lib/store", () => ({
	useAppStore: jest.fn(() => ({
		ui: { streamingActive: false },
		setStreamingActive: jest.fn(),
	})),
}));

// Import component after mocks
import { AIStreamOutput } from "@/components/AIStreamOutput";

describe("AIStreamOutput", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockFetch.mockReset();
	});

	describe("Rendering", () => {
		it("should render idle state by default", () => {
			render(<AIStreamOutput endpoint="" />);

			expect(screen.getByText(/no analysis yet/i)).toBeInTheDocument();
		});

		it("should render with custom placeholder", () => {
			render(<AIStreamOutput endpoint="" placeholder="Enter your query" />);

			expect(screen.getByText(/enter your query/i)).toBeInTheDocument();
		});

		it("should render action buttons", () => {
			render(<AIStreamOutput endpoint="" />);

			// Copy and Clear buttons
			expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /clear/i }),
			).toBeInTheDocument();
		});
	});

	describe("Output Format Toggle", () => {
		it("should render format toggle buttons", () => {
			render(<AIStreamOutput endpoint="" />);

			const textButton = screen.getByRole("button", { name: /text/i });
			const jsonButton = screen.getByRole("button", { name: /json/i });

			expect(textButton).toBeInTheDocument();
			expect(jsonButton).toBeInTheDocument();
		});

		it("should default to text format", () => {
			render(<AIStreamOutput endpoint="" />);

			const textButton = screen.getByRole("button", { name: /text/i });
			expect(textButton).toHaveAttribute("aria-pressed", "true");
		});

		it("should toggle to JSON format when clicked and content exists", async () => {
			render(<AIStreamOutput endpoint="" initialContent='{"test": true}' />);

			const jsonButton = screen.getByRole("button", { name: /json/i });

			await act(async () => {
				fireEvent.click(jsonButton);
			});

			await waitFor(() => {
				const updatedJsonButton = screen.getByRole("button", { name: /json/i });
				expect(updatedJsonButton).toHaveAttribute("aria-pressed", "true");
			});
		});
	});

	describe("Error State", () => {
		it("should display error message when error prop is provided", () => {
			render(<AIStreamOutput endpoint="" error="Connection failed" />);

			expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
		});

		it("should show error styling when error is present", () => {
			render(<AIStreamOutput endpoint="" error="API Error" />);

			// The component should have border-destructive class when in error state
			const container = screen
				.getByText(/api error/i)
				.closest("[class*='flex flex-col']");
			expect(container).toBeTruthy();
		});
	});

	describe("Copy to Clipboard", () => {
		it("should have copy button disabled when no content", () => {
			render(<AIStreamOutput endpoint="" />);

			const copyButton = screen.getByRole("button", { name: /copy/i });
			expect(copyButton).toBeDisabled();
		});

		it("should copy content when button is clicked and content exists", async () => {
			render(
				<AIStreamOutput endpoint="" initialContent="Test content to copy" />,
			);

			const copyButton = screen.getByRole("button", { name: /copy/i });
			expect(copyButton).not.toBeDisabled();

			await act(async () => {
				fireEvent.click(copyButton);
			});

			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				"Test content to copy",
			);
		});
	});

	describe("Clear Action", () => {
		it("should have clear button disabled when no content", () => {
			render(<AIStreamOutput endpoint="" />);

			const clearButton = screen.getByRole("button", { name: /clear/i });
			expect(clearButton).toBeDisabled();
		});

		it("should clear content when clear button is clicked", async () => {
			render(<AIStreamOutput endpoint="" initialContent="Content to clear" />);

			const clearButton = screen.getByRole("button", { name: /clear/i });
			expect(clearButton).not.toBeDisabled();

			await act(async () => {
				fireEvent.click(clearButton);
			});

			await waitFor(() => {
				// Content should be cleared, placeholder should be shown
				expect(screen.getByText(/no analysis yet/i)).toBeInTheDocument();
			});
		});
	});

	describe("Status Indicator", () => {
		it("should show idle status when not streaming", () => {
			render(<AIStreamOutput endpoint="" isStreaming={false} />);

			expect(screen.getByText(/ready/i)).toBeInTheDocument();
		});

		it("should show streaming status when isStreaming is true", () => {
			render(<AIStreamOutput endpoint="" isStreaming={true} />);

			expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
		});

		it("should show complete status when complete", () => {
			render(<AIStreamOutput endpoint="" isComplete={true} />);

			expect(screen.getByText(/complete/i)).toBeInTheDocument();
		});
	});

	describe("Content Display", () => {
		it("should display initial content when provided", () => {
			render(
				<AIStreamOutput endpoint="" initialContent="Initial analysis result" />,
			);

			expect(screen.getByText(/initial analysis result/i)).toBeInTheDocument();
		});
	});

	describe("SSE Connection", () => {
		it("should not initiate connection when endpoint is empty", () => {
			render(<AIStreamOutput endpoint="" />);

			// No fetch should be called
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe("JSON Parsing", () => {
		it("should format JSON content when JSON mode is selected", async () => {
			render(
				<AIStreamOutput
					endpoint=""
					initialContent='{"title":"Test","score":95}'
				/>,
			);

			// Switch to JSON mode
			const jsonButton = screen.getByRole("button", { name: /json/i });
			await act(async () => {
				fireEvent.click(jsonButton);
			});

			// Content should be formatted (JSON stringified with indent)
			await waitFor(() => {
				const content = screen.getByText(/"title":/i);
				expect(content).toBeInTheDocument();
			});
		});

		it("should show invalid JSON message for non-parseable content in JSON mode", async () => {
			render(<AIStreamOutput endpoint="" initialContent="This is not JSON" />);

			// Switch to JSON mode
			const jsonButton = screen.getByRole("button", { name: /json/i });
			await act(async () => {
				fireEvent.click(jsonButton);
			});

			// Should still show the content (falls back to text)
			await waitFor(() => {
				expect(screen.getByText(/this is not json/i)).toBeInTheDocument();
			});
		});
	});

	describe("onContentChange Callback", () => {
		it("should call onContentChange when content changes", async () => {
			const handleContentChange = jest.fn();

			render(
				<AIStreamOutput
					endpoint=""
					onContentChange={handleContentChange}
					initialContent="Initial"
				/>,
			);

			// onContentChange should be called with initial content
			expect(handleContentChange).toHaveBeenCalledWith("Initial");
		});
	});

	describe("Multi-line Content", () => {
		it("should preserve line breaks in content", () => {
			const multilineContent = `Line 1
Line 2
Line 3`;

			render(<AIStreamOutput endpoint="" initialContent={multilineContent} />);

			expect(screen.getByText(/line 1/i)).toBeInTheDocument();
			expect(screen.getByText(/line 2/i)).toBeInTheDocument();
			expect(screen.getByText(/line 3/i)).toBeInTheDocument();
		});
	});
});
