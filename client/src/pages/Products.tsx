import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Product {
  id: number;
  externalId: string;
  name: string;
  sku: string | null;
  categoryPath: string | null;
  price: number | null;
  imageUrls: string[];
  hasWildberriesAnalog: boolean;
}

const Products: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ozon');

  // Fetch products based on active tab
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: [`/api/${activeTab}/products`, searchQuery],
    queryFn: async ({ queryKey }) => {
      const [endpoint, query] = queryKey;
      const url = `${endpoint}${query ? `?query=${encodeURIComponent(query as string)}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${activeTab} products`);
      return await res.json();
    }
  });

  const handleSearch = () => {
    // The query is already being watched and will trigger a refetch
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Товары</h1>
        <p className="mt-1 text-sm text-gray-600">Управление товарами на маркетплейсах</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Поиск товаров</CardTitle>
          <CardDescription>Найдите товары по названию или артикулу</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Название или артикул товара"
              className="mr-2"
            />
            <Button onClick={handleSearch}>
              <span className="material-icons text-sm mr-1">search</span>
              Поиск
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs 
        defaultValue="ozon" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="ozon">Товары Ozon</TabsTrigger>
          <TabsTrigger value="wildberries">Товары Wildberries</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ozon" className="w-full">
          {renderProductsTable(products, isLoading, activeTab)}
        </TabsContent>
        
        <TabsContent value="wildberries" className="w-full">
          {renderProductsTable(products, isLoading, activeTab)}
        </TabsContent>
      </Tabs>
    </main>
  );
};

function renderProductsTable(products: any[], isLoading: boolean, marketplace: string) {
  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <span className="material-icons text-4xl text-gray-400 mb-2">inventory_2</span>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Нет товаров</h3>
        <p className="text-sm text-gray-500">
          {marketplace === 'ozon' 
            ? 'Синхронизируйте товары с Ozon или добавьте их вручную' 
            : 'Перенесите товары с Ozon на Wildberries'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Артикул</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
              {marketplace === 'ozon' && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
              )}
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {product.sku || product.externalId}
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
                {marketplace === 'ozon' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.hasWildberriesAnalog ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success bg-opacity-10 text-success">
                        Есть на WB
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-500">
                        Нет на WB
                      </span>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark">
                    Детали
                  </Button>
                  {marketplace === 'ozon' && !product.hasWildberriesAnalog && (
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark ml-2">
                      Перенести
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Products;
