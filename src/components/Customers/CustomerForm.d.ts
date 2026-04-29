import React from 'react';
import type { DbRow } from '../../types';
import '../../types';
interface CustomerFormProps {
    customer?: DbRow;
    onClose: () => void;
}
declare const CustomerForm: React.FC<CustomerFormProps>;
export default CustomerForm;
