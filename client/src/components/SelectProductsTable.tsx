import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface Product {
  id: number;
  sku: string | null;
  name: string;
  categoryPath: string | null;
  price: number | null;
}

interface SelectProductsTableProps {
  products: Product[];
  loading: boolean;
  onSearch: (query: string) => void;
  selectedProducts: Set<number>;
  onSelectedProductsChange: (products: Set<number>) => void;
}

const SelectProductsTable: React.FC<SelectProductsTableProps> = ({
  products,
  loading,
  onSearch,
  selectedProducts,
  onSelectedProductsChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    onSearch(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      onSelectedProductsChange(new Set());
    } else {
      onSelectedProductsChange(new Set(products.map(product => product.id)));
    }
  };

  const toggleProductSelection = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    onSelectedProductsChange(newSelected);
  };

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="productFilter" className="block text-sm font-medium text-gray-700 mb-1">
          Поиск товаров
        </label>
        <div className="flex">
          <Input
            id="productFilter"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Название или артикул товара"
            className="rounded-r-none"
          />
          <Button 
            className="rounded-l-none" 
            onClick={handleSearch}
          >
            <span className="material-icons text-sm">search</span>
          </Button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-md overflow-hidden mb-4">
        <div className="overflow-x-auto max-h-80">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Checkbox
                    checked={products.length > 0 && selectedProducts.size === products.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Артикул</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Загрузка...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Товары не найдены
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.sku || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.categoryPath || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.price ? `${product.price.toLocaleString('ru-RU')} ₽` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-500">
        Выбрано товаров: <span className="font-medium text-gray-900">{selectedProducts.size}</span>
      </div>
    </div>
  );
};

export default SelectProductsTable;
