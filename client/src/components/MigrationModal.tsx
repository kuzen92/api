import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import SelectProductsTable, { Product } from './SelectProductsTable';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MigrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MigrationModal: React.FC<MigrationModalProps> = ({ open, onOpenChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [migrationOptions, setMigrationOptions] = useState({
    updatePrices: true,
    updateStocks: true,
    skipExisting: false
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Ozon products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/ozon/products', searchQuery],
    queryFn: async ({ queryKey }) => {
      const [_, query] = queryKey;
      const url = `/api/ozon/products${query ? `?query=${encodeURIComponent(query as string)}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch products');
      return await res.json();
    },
    enabled: open
  });

  // Start migration mutation
  const { isPending: isStartingMigration, mutate: startMigration } = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/migrations', {
        productIds: Array.from(selectedProducts),
        options: migrationOptions
      });
    },
    onSuccess: async () => {
      toast({
        title: 'Миграция успешно запущена',
        description: 'Процесс миграции может занять несколько минут.',
        variant: 'default',
      });
      
      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['/api/migrations'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/migrations/recent'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // Close modal and reset state
      onOpenChange(false);
      setSelectedProducts(new Set());
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Новая миграция товаров</DialogTitle>
          <DialogDescription>
            Выберите товары с Ozon для переноса на Wildberries. Система автоматически сопоставит характеристики и категории товаров.
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleStartMigration} 
            disabled={selectedProducts.size === 0 || isStartingMigration}
          >
            {isStartingMigration ? 'Запуск...' : 'Начать миграцию'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MigrationModal;
