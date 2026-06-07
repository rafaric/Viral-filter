import "@testing-library/jest-dom";

// ResizeObserver polyfill for Radix UI components
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};