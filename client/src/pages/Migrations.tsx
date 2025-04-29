import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import MigrationsTable, { MigrationItem } from '@/components/MigrationsTable';
import { useQuery } from '@tanstack/react-query';

const Migrations: React.FC = () => {
  // Fetch all migrations
  const { data: migrations = [], isLoading } = useQuery<MigrationItem[]>({
    queryKey: ['/api/migrations'],
    queryFn: async () => {
      const res = await fetch('/api/migrations');
      if (!res.ok) throw new Error('Failed to fetch migrations');
      return await res.json();
    }
  });

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Миграции товаров</h1>
          <p className="mt-1 text-sm text-gray-600">История миграций с Ozon на Wildberries</p>
        </div>
        <Link href="/new-migration">
          <Button>
            <span className="material-icons mr-2 text-sm">add</span>
            Новая миграция
          </Button>
        </Link>
      </div>
      
      <MigrationsTable 
        migrations={migrations} 
        loading={isLoading}
      />
    </main>
  );
};

export default Migrations;
