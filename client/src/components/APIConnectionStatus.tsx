import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export interface ApiConfig {
  id: number;
  name: string;
  clientId?: string;
  apiKey: string;
  isConnected: boolean;
  lastSyncAt?: string;
}

interface APIConnectionStatusProps {
  ozonConfig?: ApiConfig;
  wildberriesConfig?: ApiConfig;
  loading: boolean;
}

const APIConnectionStatus: React.FC<APIConnectionStatusProps> = ({
  ozonConfig,
  wildberriesConfig,
  loading
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ', ' + date.toLocaleDateString('ru-RU');
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        <div className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
              <span className="text-white">O</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Ozon API</h3>
              <div className="flex items-center mt-1">
                {ozonConfig?.isConnected ? (
                  <>
                    <span className="material-icons text-success text-sm mr-1">circle</span>
                    <span className="text-sm text-success">Подключено</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons text-error text-sm mr-1">circle</span>
                    <span className="text-sm text-error">Не подключено</span>
                  </>
                )}
              </div>
            </div>
            <div className="ml-auto">
              <Link href="/api-settings">
                <Button variant="outline">
                  Настроить
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Client ID:</span>
                <span className="text-gray-800 font-mono">{ozonConfig?.clientId || '—'}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">API Key:</span>
                <span className="text-gray-800 font-mono">{ozonConfig?.apiKey || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Последняя синхронизация:</span>
                <span className="text-gray-800">{formatDate(ozonConfig?.lastSyncAt)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary-light flex items-center justify-center">
              <span className="text-white">W</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Wildberries API</h3>
              <div className="flex items-center mt-1">
                {wildberriesConfig?.isConnected ? (
                  <>
                    <span className="material-icons text-success text-sm mr-1">circle</span>
                    <span className="text-sm text-success">Подключено</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons text-error text-sm mr-1">circle</span>
                    <span className="text-sm text-error">Не подключено</span>
                  </>
                )}
              </div>
            </div>
            <div className="ml-auto">
              <Link href="/api-settings">
                <Button variant="outline">
                  Настроить
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">API Key:</span>
                <span className="text-gray-800 font-mono">{wildberriesConfig?.apiKey || '—'}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Статус:</span>
                <span className="text-gray-800">{wildberriesConfig?.isConnected ? 'Активен' : 'Не активен'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Последняя синхронизация:</span>
                <span className="text-gray-800">{formatDate(wildberriesConfig?.lastSyncAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIConnectionStatus;
