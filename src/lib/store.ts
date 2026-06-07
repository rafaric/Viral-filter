/**
 * T3.3: Zustand Store
 * Global state management for search, filters, results, and UI state
 */

import { create } from "zustand";
import type { Video, SearchFilters } from "@/types";

/**
 * Search state interface
 */
export interface SearchState {
	query: string;
	filters: SearchFilters;
	results: Video[];
	nextPageToken: string | null;
	isLoading: boolean;
	error: string | null;
	cached: boolean;
}

/**
 * UI state interface
 */
export interface UIState {
	filterPanelOpen: boolean;
	selectedVideos: string[];
	analyzingVideo: string | null;
	streamingActive: boolean;
}

/**
 * Quota state interface
 */
export interface QuotaState {
	used: number;
	limit: number;
	remaining: number;
	percentage: number;
	isSoftLimit: boolean;
	isHardLimit: boolean;
}

/**
 * Combined store state
 */
export interface AppState {
	search: SearchState;
	ui: UIState;
	quota: QuotaState;
}

/**
 * Store actions
 */
export interface AppActions {
	// Search actions
	setQuery: (query: string) => void;
	setFilters: (filters: SearchFilters) => void;
	updateFilter: (key: keyof SearchFilters, value: SearchFilters[keyof SearchFilters]) => void;
	clearFilters: () => void;
	setResults: (results: Video[], nextPageToken?: string, cached?: boolean) => void;
	appendResults: (results: Video[], nextPageToken?: string) => void;
	setLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;
	clearResults: () => void;

	// UI actions
	toggleFilterPanel: () => void;
	setFilterPanelOpen: (open: boolean) => void;
	selectVideo: (videoId: string) => void;
	deselectVideo: (videoId: string) => void;
	toggleVideoSelection: (videoId: string) => void;
	clearSelection: () => void;
	setAnalyzingVideo: (videoId: string | null) => void;
	setStreamingActive: (active: boolean) => void;

	// Quota actions
	setQuota: (quota: QuotaState) => void;
	updateQuotaUsed: (used: number) => void;

	// Reset actions
	resetSearch: () => void;
	resetAll: () => void;
}

/**
 * Default filter values
 */
const defaultFilters: SearchFilters = {
	sortBy: "relevance",
};

/**
 * Initial search state
 */
const initialSearchState: SearchState = {
	query: "",
	filters: defaultFilters,
	results: [],
	nextPageToken: null,
	isLoading: false,
	error: null,
	cached: false,
};

/**
 * Initial UI state
 */
const initialUIState: UIState = {
	filterPanelOpen: true,
	selectedVideos: [],
	analyzingVideo: null,
	streamingActive: false,
};

/**
 * Initial quota state
 */
const initialQuotaState: QuotaState = {
	used: 0,
	limit: 10000,
	remaining: 10000,
	percentage: 0,
	isSoftLimit: false,
	isHardLimit: false,
};

/**
 * Create the Zustand store
 */
export const useAppStore = create<AppState & AppActions>((set, get) => ({
	// Initial state
	search: initialSearchState,
	ui: initialUIState,
	quota: initialQuotaState,

	// Search actions
	setQuery: (query) =>
		set((state) => ({
			search: { ...state.search, query },
		})),

	setFilters: (filters) =>
		set((state) => ({
			search: { ...state.search, filters },
		})),

	updateFilter: (key, value) =>
		set((state) => ({
			search: {
				...state.search,
				filters: { ...state.search.filters, [key]: value },
			},
		})),

	clearFilters: () =>
		set((state) => ({
			search: { ...state.search, filters: defaultFilters },
		})),

	setResults: (results, nextPageToken, cached = false) =>
		set((state) => ({
			search: {
				...state.search,
				results,
				nextPageToken: nextPageToken || null,
				cached,
				error: null,
			},
		})),

	appendResults: (results, nextPageToken) =>
		set((state) => ({
			search: {
				...state.search,
				results: [...state.search.results, ...results],
				nextPageToken: nextPageToken || null,
			},
		})),

	setLoading: (isLoading) =>
		set((state) => ({
			search: { ...state.search, isLoading },
		})),

	setError: (error) =>
		set((state) => ({
			search: { ...state.search, error, isLoading: false },
		})),

	clearResults: () =>
		set((state) => ({
			search: {
				...state.search,
				results: [],
				nextPageToken: null,
				cached: false,
			},
		})),

	// UI actions
	toggleFilterPanel: () =>
		set((state) => ({
			ui: { ...state.ui, filterPanelOpen: !state.ui.filterPanelOpen },
		})),

	setFilterPanelOpen: (open) =>
		set((state) => ({
			ui: { ...state.ui, filterPanelOpen: open },
		})),

	selectVideo: (videoId) =>
		set((state) => ({
			ui: {
				...state.ui,
				selectedVideos: state.ui.selectedVideos.includes(videoId)
					? state.ui.selectedVideos
					: [...state.ui.selectedVideos, videoId],
			},
		})),

	deselectVideo: (videoId) =>
		set((state) => ({
			ui: {
				...state.ui,
				selectedVideos: state.ui.selectedVideos.filter((id) => id !== videoId),
			},
		})),

	toggleVideoSelection: (videoId) => {
		const { ui } = get();
		if (ui.selectedVideos.includes(videoId)) {
			get().deselectVideo(videoId);
		} else {
			get().selectVideo(videoId);
		}
	},

	clearSelection: () =>
		set((state) => ({
			ui: { ...state.ui, selectedVideos: [] },
		})),

	setAnalyzingVideo: (videoId) =>
		set((state) => ({
			ui: { ...state.ui, analyzingVideo: videoId },
		})),

	setStreamingActive: (active) =>
		set((state) => ({
			ui: { ...state.ui, streamingActive: active },
		})),

	// Quota actions
	setQuota: (quota) =>
		set(() => ({
			quota,
		})),

	updateQuotaUsed: (used) =>
		set((state) => {
			const remaining = Math.max(0, state.quota.limit - used);
			const percentage = Math.round((used / state.quota.limit) * 100);
			return {
				quota: {
					...state.quota,
					used,
					remaining,
					percentage,
					isSoftLimit: percentage >= 80,
					isHardLimit: percentage >= 95,
				},
			};
		}),

	// Reset actions
	resetSearch: () =>
		set(() => ({
			search: initialSearchState,
		})),

	resetAll: () =>
		set(() => ({
			search: initialSearchState,
			ui: initialUIState,
			quota: initialQuotaState,
		})),
}));

/**
 * Selector hooks for common state slices
 */
export const useSearchQuery = () => useAppStore((state) => state.search.query);
export const useSearchFilters = () => useAppStore((state) => state.search.filters);
export const useSearchResults = () => useAppStore((state) => state.search.results);
export const useIsLoading = () => useAppStore((state) => state.search.isLoading);
export const useSelectedVideos = () => useAppStore((state) => state.ui.selectedVideos);
export const useQuotaState = () => useAppStore((state) => state.quota);

/**
 * Action hooks
 */
export const useSearchActions = () => {
	const store = useAppStore();
	return {
		setQuery: store.setQuery,
		setFilters: store.setFilters,
		updateFilter: store.updateFilter,
		clearFilters: store.clearFilters,
		setResults: store.setResults,
		appendResults: store.appendResults,
		setLoading: store.setLoading,
		setError: store.setError,
		clearResults: store.clearResults,
		resetSearch: store.resetSearch,
	};
};

export const useUIActions = () => {
	const store = useAppStore();
	return {
		toggleFilterPanel: store.toggleFilterPanel,
		setFilterPanelOpen: store.setFilterPanelOpen,
		selectVideo: store.selectVideo,
		deselectVideo: store.deselectVideo,
		toggleVideoSelection: store.toggleVideoSelection,
		clearSelection: store.clearSelection,
		setAnalyzingVideo: store.setAnalyzingVideo,
		setStreamingActive: store.setStreamingActive,
	};
};

export default useAppStore;