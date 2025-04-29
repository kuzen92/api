import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import SelectProductsTable, { Product } from '@/components/SelectProductsTable';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const NewMigration: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [migrationOptions, setMigrationOptions] = useState({
    updatePrices: true,
    updateStocks: true,
    skipExisting: false
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, navigate] = useLocation();

  // Fetch Ozon products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/ozon/products', searchQuery],
    queryFn: async ({ queryKey }) => {
      const [_, query] = queryKey;
      const url = `/api/ozon/products${query ? `?query=${encodeURIComponent(query as string)}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch products');
      return await res.json();
    }
  });

  // Start migration mutation
  const { isPending: isStartingMigration, mutate: startMigration } = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/migrations', {
        productIds: Array.from(selectedProducts),
        options: migrationOptions
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      
      toast({
        title: 'Миграция успешно запущена',
        description: 'Процесс миграции может занять несколько минут.',
        variant: 'default',
      });
      
      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['/api/migrations'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/migrations/recent'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // Navigate to migration details
      navigate(`/migrations/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка при запуске миграции',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleStartMigration = () => {
    if (selectedProducts.size === 0) {
      toast({
        title: 'Нет выбранных товаров',
        description: 'Выберите товары для миграции',
        variant: 'destructive',
      });
      return;
    }
    
    startMigration();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleToggleOption = (option: keyof typeof migrationOptions) => {
    setMigrationOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Новая миграция</h1>
        <p className="mt-1 text-sm text-gray-600">Перенос товаров с Ozon на Wildberries</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Выбор товаров для миграции</CardTitle>
          <CardDescription>
            Выберите товары с Ozon для переноса на Wildberries. Система автоматически сопоставит характеристики и категории товаров.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <SelectProductsTable
              products={products}
              loading={isLoading}
              onSearch={handleSearch}
              selectedProducts={selectedProducts}
              onSelectedProductsChange={setSelectedProducts}
            />
          </div>

          <div className="mb-6">
            <h4 className="text-base font-medium text-gray-900 mb-3">Настройки миграции</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="updatePrices" 
                  checked={migrationOptions.updatePrices}
                  onCheckedChange={() => handleToggleOption('updatePrices')}
                />
                <Label htmlFor="updatePrices">Обновлять цены автоматически</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="updateStocks" 
                  checked={migrationOptions.updateStocks}
                  onCheckedChange={() => handleToggleOption('updateStocks')}
                />
                <Label htmlFor="updateStocks">Синхронизировать остатки</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="skipExisting" 
                  checked={migrationOptions.skipExisting}
                  onCheckedChange={() => handleToggleOption('skipExisting')}
                />
                <Label htmlFor="skipExisting">Пропускать существующие товары</Label>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="mr-2"
          >
            Отмена
          </Button>
          <Button 
            onClick={handleStartMigration} 
            disabled={selectedProducts.size === 0 || isStartingMigration}
          >
            {isStartingMigration ? 'Запуск...' : 'Начать миграцию'}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
};

export default NewMigration;
