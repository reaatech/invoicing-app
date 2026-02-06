export declare const isElectronAvailable: () => boolean;
export declare const safeElectronAPI: {
    sendMessage: (channel: string, ...args: any[]) => void;
    onMessage: (channel: string, callback: (data: any) => void) => void;
    removeMessage: (channel: string, callback: (data: any) => void) => void;
};
export declare const showSaveDialog: (options: {
    title?: string;
    defaultPath?: string;
    filters?: {
        name: string;
        extensions: string[];
    }[];
}) => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string | null;
    error?: string;
}>;
