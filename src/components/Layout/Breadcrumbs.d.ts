import React from 'react';
export interface BreadcrumbItem {
    label: string;
    to?: string;
}
interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}
declare const Breadcrumbs: React.FC<BreadcrumbsProps>;
export default Breadcrumbs;
