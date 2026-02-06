// Export/Import functionality using proper async API calls

export async function exportData(): Promise<{ success: boolean; data?: string; error?: string }> {
  return new Promise((resolve) => {
    window.electronAPI.sendMessage('export-data');
    window.electronAPI.onMessage('export-response', (response: unknown) => {
      resolve(response as { success: boolean; data?: string; error?: string });
    });
  });
}

export async function importData(jsonData: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    window.electronAPI.sendMessage('import-data', jsonData);
    window.electronAPI.onMessage('import-response', (response: unknown) => {
      resolve(response as { success: boolean; error?: string });
    });
  });
}

// Helper function to download exported data as JSON file
export function downloadExportedData(jsonData: string, filename: string = 'invoicing-data-export.json') {
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper function to read imported file
export function readImportFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
