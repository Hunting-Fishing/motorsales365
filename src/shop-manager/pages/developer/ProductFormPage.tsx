import React from 'react';
import { useParams } from 'react-router-dom';
import ProductForm from '@/components/developer/shopping/ProductForm';

export default function ProductFormPage() {
  const { productId } = useParams();
  const mode = productId ? 'edit' : 'create';

  return <ProductForm mode={mode} />;
}