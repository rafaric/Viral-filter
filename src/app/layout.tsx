/**
 * T8.6: Root Layout
 * Updated with navigation header and quota indicator
 */

import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { AppNav } from "@/components/AppNav";

export const metadata: Metadata = {
	title: "viral-filter",
	description: "AI-powered YouTube niche discovery and analysis",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-background font-sans antialiased">
				<AppHeader />
				<div className="border-b">
					<div className="container py-2">
						<AppNav />
					</div>
				</div>
				<main>{children}</main>
			</body>
		</html>
	);
}