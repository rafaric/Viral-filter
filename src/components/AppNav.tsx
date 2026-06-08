/**
 * T8.6: App Navigation Component
 * Main navigation links
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HomeIcon, SearchIcon, TrendingUpIcon, ListIcon, SettingsIcon } from "lucide-react";

const navItems = [
	{
		href: "/",
		label: "Dashboard",
		icon: HomeIcon,
	},
	{
		href: "/trends",
		label: "Trends",
		icon: TrendingUpIcon,
	},
	{
		href: "/watchlist",
		label: "Watchlist",
		icon: ListIcon,
	},
	{
		href: "/settings",
		label: "Settings",
		icon: SettingsIcon,
	},
];

export function AppNav({ className }: { className?: string }) {
	const pathname = usePathname();

	return (
		<nav className={cn("flex items-center gap-1", className)}>
			{navItems.map((item) => {
				const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
				const Icon = item.icon;

				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
							isActive
								? "bg-muted text-foreground"
								: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
						)}
					>
						<Icon className="h-4 w-4" />
						<span className="hidden sm:inline">{item.label}</span>
					</Link>
				);
			})}
		</nav>
	);
}

export default AppNav;