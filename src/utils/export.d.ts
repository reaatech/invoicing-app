export declare function exportData(): Promise<{
    success: boolean;
    data?: string;
    error?: string;
}>;
export declare function importData(jsonData: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function downloadExportedData(jsonData: string, filename?: string): void;
export declare function readImportFile(file: File): Promise<string>;
