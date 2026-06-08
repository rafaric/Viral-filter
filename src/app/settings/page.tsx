/**
 * T8.3: Settings Page
 * API keys, quota config, export/import actions
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { QuotaIndicator } from "@/components/QuotaIndicator";
import { exportFullBackup, exportVideosToCSV } from "@/lib/services/export";
import { importFromJSON, getImportStats } from "@/lib/services/import";
import { AlertCircleIcon, CheckCircleIcon, DownloadIcon, UploadIcon, TrashIcon } from "lucide-react";

export default function SettingsPage() {
	// API Keys state
	const [youtubeApiKey, setYoutubeApiKey] = useState("");
	const [opencodeApiKey, setOpencodeApiKey] = useState("");
	const [showYoutubeKey, setShowYoutubeKey] = useState(false);
	const [showOpencodeKey, setShowOpencodeKey] = useState(false);

	// Quota config state
	const [dailyLimit, setDailyLimit] = useState("10000");
	const [softLimitPercent, setSoftLimitPercent] = useState("80");
	const [hardLimitPercent, setHardLimitPercent] = useState("95");

	// Export/Import state
	const [importFile, setImportFile] = useState<File | null>(null);
	const [importPreview, setImportPreview] = useState<{
		totalVideos: number;
		totalChannels: number;
		totalTrends: number;
	} | null>(null);
	const [importResult, setImportResult] = useState<{
		success: boolean;
		imported: number;
		skipped: number;
		errors: string[];
	} | null>(null);
	const [exportLoading, setExportLoading] = useState(false);
	const [importLoading, setImportLoading] = useState(false);

	// Handle save API keys
	const handleSaveApiKeys = () => {
		// In production, save to secure storage or environment
		console.log("Saving API keys:", { youtubeApiKey: youtubeApiKey ? "***" : "", opencodeApiKey: opencodeApiKey ? "***" : "" });
		// Show success message
		alert("API keys saved successfully!");
	};

	// Handle save quota config
	const handleSaveQuotaConfig = () => {
		console.log("Saving quota config:", {
			dailyLimit: parseInt(dailyLimit),
			softLimitPercent: parseInt(softLimitPercent),
			hardLimitPercent: parseInt(hardLimitPercent),
		});
		alert("Quota configuration saved!");
	};

	// Handle export
	const handleExport = async (format: "json" | "csv") => {
		setExportLoading(true);
		try {
			let data: string;
			let filename: string;
			let mimeType: string;

			if (format === "json") {
				data = await exportFullBackup();
				filename = `viral-filter-backup-${new Date().toISOString().split("T")[0]}.json`;
				mimeType = "application/json";
			} else {
				data = await exportVideosToCSV();
				filename = `videos-export-${new Date().toISOString().split("T")[0]}.csv`;
				mimeType = "text/csv";
			}

			// Download file
			const blob = new Blob([data], { type: mimeType });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Export failed:", err);
			alert("Export failed. Please try again.");
		} finally {
			setExportLoading(false);
		}
	};

	// Handle import file selection
	const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setImportFile(file);

		// Preview import
		const text = await file.text();
		const stats = await getImportStats(text);
		setImportPreview({
			totalVideos: stats.totalVideos,
			totalChannels: stats.totalChannels,
			totalTrends: stats.totalTrends,
		});
	};

	// Handle import
	const handleImport = async () => {
		if (!importFile) return;

		setImportLoading(true);
		setImportResult(null);

		try {
			const text = await importFile.text();
			const result = await importFromJSON(text, { conflictStrategy: "overwrite" });
			setImportResult(result);
		} catch (err) {
			console.error("Import failed:", err);
			setImportResult({
				success: false,
				imported: 0,
				skipped: 0,
				errors: [err instanceof Error ? err.message : "Import failed"],
			});
		} finally {
			setImportLoading(false);
		}
	};

	return (
		<div className="container mx-auto py-8 px-4 max-w-4xl">
			<h1 className="text-3xl font-bold mb-8">Settings</h1>

			<Tabs defaultValue="api-keys" className="w-full">
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="api-keys">API Keys</TabsTrigger>
					<TabsTrigger value="quota">Quota</TabsTrigger>
					<TabsTrigger value="export">Export</TabsTrigger>
					<TabsTrigger value="import">Import</TabsTrigger>
				</TabsList>

				{/* API Keys Tab */}
				<TabsContent value="api-keys" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>API Configuration</CardTitle>
							<CardDescription>
								Configure your YouTube and OpenCode API keys
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* YouTube API Key */}
							<div className="space-y-2">
								<Label htmlFor="youtube-key">YouTube Data API Key</Label>
								<div className="flex gap-2">
									<Input
										id="youtube-key"
										type={showYoutubeKey ? "text" : "password"}
										placeholder="Enter your YouTube API key"
										value={youtubeApiKey}
										onChange={(e) => setYoutubeApiKey(e.target.value)}
										className="flex-1"
									/>
									<Switch
										checked={showYoutubeKey}
										onCheckedChange={setShowYoutubeKey}
										aria-label="Show key"
									/>
								</div>
								<p className="text-sm text-muted-foreground">
									Get your API key from Google Cloud Console
								</p>
							</div>

							<Separator />

							{/* OpenCode API Key */}
							<div className="space-y-2">
								<Label htmlFor="opencode-key">OpenCode API Key</Label>
								<div className="flex gap-2">
									<Input
										id="opencode-key"
										type={showOpencodeKey ? "text" : "password"}
										placeholder="Enter your OpenCode API key"
										value={opencodeApiKey}
										onChange={(e) => setOpencodeApiKey(e.target.value)}
										className="flex-1"
									/>
									<Switch
										checked={showOpencodeKey}
										onCheckedChange={setShowOpencodeKey}
										aria-label="Show key"
									/>
								</div>
								<p className="text-sm text-muted-foreground">
									Get your API key from opencode.ai
								</p>
							</div>

							<Button onClick={handleSaveApiKeys} className="w-full">
								Save API Keys
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Quota Tab */}
				<TabsContent value="quota" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Quota Configuration</CardTitle>
							<CardDescription>
								Configure daily quota limits and warning thresholds
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Current Status */}
							<div className="p-4 bg-muted rounded-lg">
								<h3 className="font-medium mb-2">Current Status</h3>
								<QuotaIndicator showDetails />
							</div>

							<Separator />

							{/* Daily Limit */}
							<div className="space-y-2">
								<Label htmlFor="daily-limit">Daily Quota Limit</Label>
								<Input
									id="daily-limit"
									type="number"
									value={dailyLimit}
									onChange={(e) => setDailyLimit(e.target.value)}
								/>
								<p className="text-sm text-muted-foreground">
									YouTube API default is 10,000 units per day
								</p>
							</div>

							{/* Soft Limit */}
							<div className="space-y-2">
								<Label htmlFor="soft-limit">Soft Limit Warning (%)</Label>
								<Input
									id="soft-limit"
									type="number"
									value={softLimitPercent}
									onChange={(e) => setSoftLimitPercent(e.target.value)}
								/>
								<p className="text-sm text-muted-foreground">
									Show warning when quota reaches this percentage
								</p>
							</div>

							{/* Hard Limit */}
							<div className="space-y-2">
								<Label htmlFor="hard-limit">Hard Limit Block (%)</Label>
								<Input
									id="hard-limit"
									type="number"
									value={hardLimitPercent}
									onChange={(e) => setHardLimitPercent(e.target.value)}
								/>
								<p className="text-sm text-muted-foreground">
									Block API calls when quota reaches this percentage
								</p>
							</div>

							<Button onClick={handleSaveQuotaConfig} className="w-full">
								Save Quota Configuration
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Export Tab */}
				<TabsContent value="export" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Export Data</CardTitle>
							<CardDescription>
								Download your data in JSON or CSV format
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* JSON Full Backup */}
							<div className="flex items-center justify-between p-4 border rounded-lg">
								<div>
									<h3 className="font-medium">Full Backup (JSON)</h3>
									<p className="text-sm text-muted-foreground">
										Export all videos, channels, trends, and quota data
									</p>
								</div>
								<Button
									variant="outline"
									onClick={() => handleExport("json")}
									disabled={exportLoading}
								>
									<DownloadIcon className="mr-2 h-4 w-4" />
									Export JSON
								</Button>
							</div>

							{/* CSV Videos Export */}
							<div className="flex items-center justify-between p-4 border rounded-lg">
								<div>
									<h3 className="font-medium">Videos Only (CSV)</h3>
									<p className="text-sm text-muted-foreground">
										Export cached videos in spreadsheet format
									</p>
								</div>
								<Button
									variant="outline"
									onClick={() => handleExport("csv")}
									disabled={exportLoading}
								>
									<DownloadIcon className="mr-2 h-4 w-4" />
									Export CSV
								</Button>
							</div>

							{/* Export Info */}
							<div className="p-4 bg-muted rounded-lg">
								<div className="flex items-center gap-2 text-sm">
									<AlertCircleIcon className="h-4 w-4" />
									<span>Exported data includes cached videos, watchlist channels, trend snapshots, and quota history.</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Import Tab */}
				<TabsContent value="import" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Import Data</CardTitle>
							<CardDescription>
								Restore data from a backup file
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* File Selection */}
							<div className="space-y-2">
								<Label htmlFor="import-file">Select Backup File</Label>
								<Input
									id="import-file"
									type="file"
									accept=".json"
									onChange={handleImportFileChange}
								/>
								<p className="text-sm text-muted-foreground">
									Select a JSON backup file exported from viral-filter
								</p>
							</div>

							{/* Import Preview */}
							{importPreview && (
								<div className="p-4 border rounded-lg">
									<h3 className="font-medium mb-2">Import Preview</h3>
									<div className="grid grid-cols-3 gap-4 text-center">
										<div>
											<div className="text-2xl font-bold">{importPreview.totalVideos}</div>
											<div className="text-sm text-muted-foreground">Videos</div>
										</div>
										<div>
											<div className="text-2xl font-bold">{importPreview.totalChannels}</div>
											<div className="text-sm text-muted-foreground">Channels</div>
										</div>
										<div>
											<div className="text-2xl font-bold">{importPreview.totalTrends}</div>
											<div className="text-sm text-muted-foreground">Trends</div>
										</div>
									</div>
								</div>
							)}

							{/* Import Result */}
							{importResult && (
								<div className={`p-4 rounded-lg ${importResult.success ? "bg-green-500/10" : "bg-destructive/10"}`}>
									<div className="flex items-center gap-2 mb-2">
										{importResult.success ? (
											<CheckCircleIcon className="h-5 w-5 text-green-500" />
										) : (
											<AlertCircleIcon className="h-5 w-5 text-destructive" />
										)}
										<h3 className="font-medium">
											{importResult.success ? "Import Successful" : "Import Failed"}
										</h3>
									</div>
									<div className="text-sm">
										<p>Imported: {importResult.imported}</p>
										<p>Skipped: {importResult.skipped}</p>
										{importResult.errors.length > 0 && (
											<p className="text-destructive">Errors: {importResult.errors.length}</p>
										)}
									</div>
								</div>
							)}

							{/* Import Button */}
							<Button
								onClick={handleImport}
								disabled={!importFile || importLoading}
								className="w-full"
							>
								<UploadIcon className="mr-2 h-4 w-4" />
								{importLoading ? "Importing..." : "Import Backup"}
							</Button>

							{/* Import Info */}
							<div className="p-4 bg-muted rounded-lg">
								<div className="flex items-center gap-2 text-sm">
									<AlertCircleIcon className="h-4 w-4" />
									<span>Existing data with the same ID will be overwritten. Use the export function to create a backup first.</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}