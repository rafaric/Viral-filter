/**
 * T8.6: App Header Component
 * Logo, navigation, and quota indicator
 */

"use client";

import Link from "next/link";
import { QuotaIndicator } from "@/components/QuotaIndicator";
import { Button } from "@/components/ui/button";
import { SettingsIcon, TrendingUpIcon } from "lucide-react";

export function AppHeader() {
	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container flex h-14 items-center justify-between">
				{/* Logo */}
				<Link href="/" className="flex items-center gap-2">
					<div className="bg-primary rounded-lg p-1.5">
						<TrendingUpIcon className="h-5 w-5 text-primary-foreground" />
					</div>
					<span className="font-bold text-lg hidden sm:inline-block">
						viral-filter
					</span>
				</Link>

				{/* Right Side */}
				<div className="flex items-center gap-4">
					{/* Quota Indicator */}
					<div className="hidden md:block">
						<QuotaIndicator compact endpoint="/api/quota" />
					</div>

					{/* Settings Link */}
					<Link href="/settings">
						<Button variant="ghost" size="icon">
							<SettingsIcon className="h-4 w-4" />
							<span className="sr-only">Settings</span>
						</Button>
					</Link>
				</div>
			</div>
		</header>
	);
}

export default AppHeader;