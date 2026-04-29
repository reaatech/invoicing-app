import React from 'react';
import '../../types';
interface BulkActionsProps {
    selectedInvoices: number[];
    onActionComplete: () => void;
}
declare const BulkActions: React.FC<BulkActionsProps>;
export default BulkActions;
