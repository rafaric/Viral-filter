const mockPrisma = {
	quotaUsage: {
		findUnique: jest.fn(),
		upsert: jest.fn(),
		update: jest.fn(),
		findMany: jest.fn(),
	},
	videoCache: {
		findUnique: jest.fn(),
		findMany: jest.fn(),
		upsert: jest.fn(),
	},
	searchHistory: {
		create: jest.fn(),
		findMany: jest.fn(),
	},
	channelWatchlist: {
		findUnique: jest.fn(),
		findMany: jest.fn(),
		create: jest.fn(),
		upsert: jest.fn(),
		delete: jest.fn(),
	},
	trendSnapshot: {
		create: jest.fn(),
		findMany: jest.fn(),
	},
};

export default mockPrisma;
