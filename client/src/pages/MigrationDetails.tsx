import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface MigrationProduct {
  id: number;
  productId: number;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
  wildberriesProductId?: string;
  product?: {
    id: number;
    name: string;
    sku?: string;
    categoryPath?: string;
    price?: number;
    imageUrls?: string[];
  };
}

interface Migration {
  id: number;
  createdAt: string;
  completedAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
  totalProducts: number;
  successfulProducts: number;
  failedProducts: number;
  options?: {
    updatePrices?: boolean;
    updateStocks?: boolean;
    skipExisting?: boolean;
  };
  duration?: number;
  products?: MigrationProduct[];
}

const MigrationDetails: React.FC = () => {
  const [match, params] = useRoute<{ id: string }>('/migrations/:id');
  const id = params?.id;

  // Fetch migration details
  const { data: migration, isLoading } = useQuery<Migration>({
    queryKey: [`/api/migrations/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/migrations/${id}`);
      if (!res.ok) throw new Error('Failed to fetch migration details');
      return await res.json();
    },
    refetchInterval: (data) => {
      // Auto-refresh while migration is in progress
      if (data?.status === 'pending' || data?.status === 'in_progress') {
        return 5000; // Refresh every 5 seconds
      }
      return false; // Don't auto-refresh once completed
    }
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ', ' + date.toLocaleDateString('ru-RU');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} мин`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-white">Успешно</Badge>;
      case 'partial':
        return <Badge className="bg-warning text-white">Частично</Badge>;
      case 'failed':
        return <Badge className="bg-error text-white">Ошибка</Badge>;
      case 'pending':
        return <Badge variant="outline">Ожидание</Badge>;
      case 'in_progress':
        return <Badge className="bg-info text-white">В процессе</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProductStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success text-white">Успешно</Badge>;
      case 'failed':
        return <Badge className="bg-error text-white">Ошибка</Badge>;
      case 'pending':
        return <Badge variant="outline">Ожидание</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-100">
        <div className="flex items-center mb-6">
          <Skeleton className="h-6 w-32 mr-4" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-4 w-64 mb-2" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32 mb-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!migration) {
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-100">
        <Alert variant="destructive">
          <AlertTitle>Миграция не найдена</AlertTitle>
          <AlertDescription>
            Миграция с ID {id} не найдена. Проверьте корректность ссылки или перейдите к списку миграций.
          </AlertDescription>
        </Alert>
        <div className="mt-6">
          <Link href="/migrations">
            <Button>Вернуться к списку миграций</Button>
          </Link>
        </div>
      </main>
    );
  }

  const isActive = migration.status === 'pending' || migration.status === 'in_progress';
  const progressValue = migration.totalProducts > 0 
    ? ((migration.successfulProducts + migration.failedProducts) / migration.totalProducts) * 100 
    : 0;

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Миграция #{migration.id}</h1>
          <div className="flex items-center mt-1">
            <p className="text-sm text-gray-600 mr-3">
              Создана: {formatDate(migration.createdAt)}
            </p>
            {getStatusBadge(migration.status)}
          </div>
        </div>
        <Link href="/migrations">
          <Button variant="outline">
            Назад к списку
          </Button>
        </Link>
      </div>

      {/* Migration Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Информация о миграции</CardTitle>
          <CardDescription>Общая статистика и параметры миграции</CardDescription>
        </CardHeader>
        <CardContent>
          {isActive && (
            <div className="mb-6">
              <p className="text-sm mb-2">Прогресс миграции:</p>
              <Progress value={progressValue} className="h-2" />
              <p className="text-sm text-right mt-1">
                {migration.successfulProducts + migration.failedProducts} из {migration.totalProducts} товаров обработано
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Всего товаров</p>
              <p className="text-xl font-semibold mt-1">{migration.totalProducts}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Успешно перенесено</p>
              <p className="text-xl font-semibold mt-1 text-success">{migration.successfulProducts}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Ошибок</p>
              <p className="text-xl font-semibold mt-1 text-error">{migration.failedProducts}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Время выполнения</p>
              <p className="text-xl font-semibold mt-1">{formatDuration(migration.duration)}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-base font-medium text-gray-900 mb-3">Параметры миграции</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center">
                <span className="material-icons text-sm mr-2 text-gray-500">
                  {migration.options?.updatePrices ? 'check_circle' : 'cancel'}
                </span>
                <span className="text-sm text-gray-600">
                  Обновление цен: {migration.options?.updatePrices ? 'Да' : 'Нет'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="material-icons text-sm mr-2 text-gray-500">
                  {migration.options?.updateStocks ? 'check_circle' : 'cancel'}
                </span>
                <span className="text-sm text-gray-600">
                  Синхронизация остатков: {migration.options?.updateStocks ? 'Да' : 'Нет'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="material-icons text-sm mr-2 text-gray-500">
                  {migration.options?.skipExisting ? 'check_circle' : 'cancel'}
                </span>
                <span className="text-sm text-gray-600">
                  Пропуск существующих: {migration.options?.skipExisting ? 'Да' : 'Нет'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Товары</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Все товары</TabsTrigger>
              <TabsTrigger value="success">Успешные</TabsTrigger>
              <TabsTrigger value="failed">Ошибки</TabsTrigger>
              <TabsTrigger value="pending">В обработке</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="w-full">
              {renderProductsTable(migration.products || [])}
            </TabsContent>
            
            <TabsContent value="success" className="w-full">
              {renderProductsTable((migration.products || []).filter(p => p.status === 'success'))}
            </TabsContent>
            
            <TabsContent value="failed" className="w-full">
              {renderProductsTable((migration.products || []).filter(p => p.status === 'failed'))}
            </TabsContent>
            
            <TabsContent value="pending" className="w-full">
              {renderProductsTable((migration.products || []).filter(p => p.status === 'pending'))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );

  function renderProductsTable(products: MigrationProduct[]) {
    if (products.length === 0) {
      return (
        <div className="text-center py-10">
          <span className="material-icons text-4xl text-gray-400 mb-2">inventory_2</span>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Нет товаров</h3>
          <p className="text-sm text-gray-500">В этой категории нет товаров</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Товар</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID на Ozon</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID на Wildberries</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Детали</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {product.product?.imageUrls && product.product.imageUrls[0] && (
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-md overflow-hidden mr-3">
                        <img 
                          src={product.product.imageUrls[0]} 
                          alt={product.product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23ddd%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2210%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20font-family%3D%22sans-serif%22%20fill%3D%22%23999%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E';
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {product.product?.name || `Товар #${product.productId}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.product?.sku || '—'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.product?.id || product.productId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.wildberriesProductId || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getProductStatusBadge(product.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.status === 'failed' && product.errorMessage ? (
                    <div className="max-w-md truncate" title={product.errorMessage}>
                      <span className="text-error">{product.errorMessage}</span>
                    </div>
                  ) : (
                    product.status === 'success' ? 'Успешно перенесен' : '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
};

export default MigrationDetails;
