/**
 * T8.4: Global Error Boundary
 * User-friendly error handling for the application
 */

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from "lucide-react";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log error to console for debugging
		console.error("Application error:", error);
	}, [error]);

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="max-w-md w-full">
				<div className="text-center space-y-6">
					{/* Error Icon */}
					<div className="flex justify-center">
						<div className="rounded-full bg-destructive/10 p-4">
							<AlertTriangleIcon className="h-12 w-12 text-destructive" />
						</div>
					</div>

					{/* Error Title */}
					<h1 className="text-2xl font-bold text-foreground">
						Something went wrong
					</h1>

					{/* Error Message */}
					<p className="text-muted-foreground">
						{error.message || "An unexpected error occurred. Please try again."}
					</p>

					{/* Error Code */}
					{error.digest && (
						<p className="text-xs text-muted-foreground font-mono">
							Error ID: {error.digest}
						</p>
					)}

					{/* Actions */}
					<div className="flex flex-col gap-3 pt-4">
						<Button onClick={reset} className="w-full">
							<RefreshCwIcon className="mr-2 h-4 w-4" />
							Try again
						</Button>

						<Button
							variant="outline"
							onClick={() => (window.location.href = "/")}
							className="w-full"
						>
							<HomeIcon className="mr-2 h-4 w-4" />
							Go to Dashboard
						</Button>
					</div>

					{/* Help Text */}
					<p className="text-xs text-muted-foreground pt-4">
						If this problem persists, please check the console for more details
						or contact support.
					</p>
				</div>
			</div>
		</div>
	);
}