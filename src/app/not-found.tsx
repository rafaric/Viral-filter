/**
 * T8.4: Not Found Page (404)
 * User-friendly 404 error page
 */

import { Button } from "@/components/ui/button";
import { HomeIcon, SearchIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="max-w-md w-full text-center space-y-6">
				{/* 404 Icon */}
				<div className="flex justify-center">
					<div className="rounded-full bg-muted p-6">
						<span className="text-5xl font-bold text-muted-foreground">404</span>
					</div>
				</div>

				{/* Title */}
				<h1 className="text-2xl font-bold text-foreground">
					Page not found
				</h1>

				{/* Description */}
				<p className="text-muted-foreground">
					The page you're looking for doesn't exist or has been moved.
				</p>

				{/* Navigation Options */}
				<div className="flex flex-col gap-3 pt-4">
					<Link href="/">
						<Button className="w-full">
							<HomeIcon className="mr-2 h-4 w-4" />
							Go to Dashboard
						</Button>
					</Link>

					<Link href="/search">
						<Button variant="outline" className="w-full">
							<SearchIcon className="mr-2 h-4 w-4" />
							Search Videos
						</Button>
					</Link>

					<Link href="/settings">
						<Button variant="ghost" className="w-full">
							<ArrowLeftIcon className="mr-2 h-4 w-4" />
							Settings
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}