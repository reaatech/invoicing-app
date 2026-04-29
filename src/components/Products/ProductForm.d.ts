import React from 'react';
import type { DbRow } from '../../types';
import '../../types';
interface ProductFormProps {
  product?: DbRow;
  onClose: () => void;
}
declare const ProductForm: React.FC<ProductFormProps>;
export default ProductForm;
