import React, { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import MigrationsTable, { MigrationItem } from '@/components/MigrationsTable';
import APIConnectionStatus from '@/components/APIConnectionStatus';
import MigrationModal from '@/components/MigrationModal';
import { useQuery } from '@tanstack/react-query';

const Dashboard: React.FC = () => {
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);

  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return await res.json();
    }
  });

  // Fetch API configs
  const { data: apiConfigs = [], isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['/api/marketplace-configs'],
    queryFn: async () => {
      const res = await fetch('/api/marketplace-configs');
      if (!res.ok) throw new Error('Failed to fetch API configurations');
      return await res.json();
    }
  });

  // Fetch recent migrations
  const { data: recentMigrations = [], isLoading: isLoadingMigrations } = useQuery<MigrationItem[]>({
    queryKey: ['/api/migrations/recent'],
    queryFn: async () => {
      const res = await fetch('/api/migrations/recent?limit=3');
      if (!res.ok) throw new Error('Failed to fetch recent migrations');
      return await res.json();
    }
  });

  // Find API configs
  const ozonConfig = apiConfigs.find(config => config.name === 'ozon');
  const wildberriesConfig = apiConfigs.find(config => config.name === 'wildberries');

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
        <p className="mt-1 text-sm text-gray-600">Сервис для переноса товаров с Ozon на Wildberries</p>
      </div>
      
      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          icon="inventory_2" 
          title="Товары на Ozon" 
          value={isLoadingStats ? '—' : stats?.ozonProducts} 
          iconBgColor="bg-primary-light" 
          iconTextColor="text-primary"
        />
        <StatCard 
          icon="shopping_bag" 
          title="Товары на Wildberries" 
          value={isLoadingStats ? '—' : stats?.wbProducts}
          iconBgColor="bg-secondary-light" 
          iconTextColor="text-secondary"
        />
        <StatCard 
          icon="check_circle" 
          title="Успешные миграции" 
          value={isLoadingStats ? '—' : stats?.successfulMigrations}
          iconBgColor="bg-success" 
          iconTextColor="text-success"
        />
        <StatCard 
          icon="error" 
          title="Ошибки миграции" 
          value={isLoadingStats ? '—' : stats?.failedMigrations}
          iconBgColor="bg-error" 
          iconTextColor="text-error"
        />
      </div>
      
      {/* API Connection status */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Статус подключения API</h2>
        <APIConnectionStatus 
          ozonConfig={ozonConfig}
          wildberriesConfig={wildberriesConfig}
          loading={isLoadingConfigs}
        />
      </div>
      
      {/* Quick actions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Быстрые действия</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button
            variant="ghost"
            className="bg-white hover:bg-gray-50 shadow rounded-lg p-6 h-auto text-left flex justify-start"
            onClick={() => setMigrationModalOpen(true)}
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary bg-opacity-10 text-primary">
                <span className="material-icons">sync</span>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-gray-900">Начать новую миграцию</h3>
                <p className="mt-1 text-sm text-gray-500">Перенести товары с Ozon на Wildberries</p>
              </div>
            </div>
          </Button>
          
          <Button
            variant="ghost"
            className="bg-white hover:bg-gray-50 shadow rounded-lg p-6 h-auto text-left flex justify-start"
            onClick={() => window.location.href = '/api/ozon/sync'}
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gray-100 text-gray-600">
                <span className="material-icons">refresh</span>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-gray-900">Обновить данные Ozon</h3>
                <p className="mt-1 text-sm text-gray-500">Синхронизировать товары с Ozon</p>
              </div>
            </div>
          </Button>
          
          <Button
            variant="ghost"
            className="bg-white hover:bg-gray-50 shadow rounded-lg p-6 h-auto text-left flex justify-start"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gray-100 text-gray-600">
                <span className="material-icons">help_outline</span>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-gray-900">Помощь</h3>
                <p className="mt-1 text-sm text-gray-500">Инструкции по использованию</p>
              </div>
            </div>
          </Button>
        </div>
      </div>
      
      {/* Recent migrations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Недавние миграции</h2>
          <Link href="/migrations">
            <a className="text-sm font-medium text-primary hover:text-primary-dark">
              Просмотреть все
            </a>
          </Link>
        </div>
        
        <MigrationsTable 
          migrations={recentMigrations} 
          loading={isLoadingMigrations}
        />
      </div>

      {/* Migration Modal */}
      <MigrationModal
        open={migrationModalOpen}
        onOpenChange={setMigrationModalOpen}
      />
    </main>
  );
};

export default Dashboard;
