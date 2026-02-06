import React from 'react';
import '../../types';
interface InvoiceFormProps {
    invoice?: {
        [key: string]: string | number;
    };
    initialCustomerId?: number | string;
    onClose: () => void;
}
declare const InvoiceForm: React.FC<InvoiceFormProps>;
export default InvoiceForm;
