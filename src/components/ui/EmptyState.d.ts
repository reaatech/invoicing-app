import React from 'react';
import { type LucideIcon } from 'lucide-react';
interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}
export declare const EmptyState: React.FC<EmptyStateProps>;
export {};
