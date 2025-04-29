import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function ApiSettings() {
  const [ozonClientId, setOzonClientId] = useState('');
  const [ozonApiKey, setOzonApiKey] = useState('');
  const [wildberriesApiKey, setWildberriesApiKey] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configs } = useQuery({
    queryKey: ['/api/marketplace-configs'],
    queryFn: async () => {
      const res = await fetch('/api/marketplace-configs');
      if (!res.ok) throw new Error('Failed to fetch configs');
      return res.json();
    }
  });

  useEffect(() => {
    if (configs) {
      const ozonConfig = configs.find((c: any) => c.name === 'ozon');
      const wbConfig = configs.find((c: any) => c.name === 'wildberries');

      if (ozonConfig) {
        setOzonClientId(ozonConfig.clientId || '');
        setOzonApiKey(ozonConfig.apiKey || '');
      }

      if (wbConfig) {
        setWildberriesApiKey(wbConfig.apiKey || '');
      }
    }
  }, [configs]);

  const saveConfig = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/marketplace-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        throw new Error('Failed to save configuration');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace-configs'] });
      toast({
        title: 'Успех',
        description: 'Настройки API успешно сохранены',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    }
  });

  const handleSave = () => {
    saveConfig.mutate({
      ozon: {
        clientId: ozonClientId,
        apiKey: ozonApiKey
      },
      wildberries: {
        apiKey: wildberriesApiKey
      }
    });
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API Ключи</h1>
        <p className="mt-1 text-sm text-gray-600">Настройка ключей для работы с маркетплейсами</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ozon</CardTitle>
            <CardDescription>Настройка интеграции с Ozon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID
              </label>
              <Input
                value={ozonClientId}
                onChange={(e) => setOzonClientId(e.target.value)}
                placeholder="Введите Client ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <Input
                value={ozonApiKey}
                onChange={(e) => setOzonApiKey(e.target.value)}
                type="password"
                placeholder="Введите API Key"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wildberries</CardTitle>
            <CardDescription>Настройка интеграции с Wildberries</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <Input
                value={wildberriesApiKey}
                onChange={(e) => setWildberriesApiKey(e.target.value)}
                type="password"
                placeholder="Введите API Key"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={saveConfig.isPending}
          >
            {saveConfig.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </main>
  );
}