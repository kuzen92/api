import React from 'react';
import { Link } from 'wouter';

export interface MigrationItem {
  id: number;
  createdAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
  totalProducts: number;
  duration?: number | null;
}

interface MigrationsTableProps {
  migrations: MigrationItem[];
  loading?: boolean;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU');
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return '-';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} мин`;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success bg-opacity-10 text-success">
          Успешно
        </span>
      );
    case 'partial':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-warning bg-opacity-10 text-warning">
          Частично
        </span>
      );
    case 'failed':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-error bg-opacity-10 text-error">
          Ошибка
        </span>
      );
    case 'pending':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-500">
          Ожидание
        </span>
      );
    case 'in_progress':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-info bg-opacity-10 text-info">
          В процессе
        </span>
      );
    default:
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-500">
          {status}
        </span>
      );
  }
};

const MigrationsTable: React.FC<MigrationsTableProps> = ({ migrations, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (migrations.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <span className="material-icons text-4xl text-gray-400 mb-2">sync_problem</span>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Нет миграций</h3>
        <p className="text-sm text-gray-500">Начните новую миграцию товаров</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Товары</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {migrations.map((migration) => (
              <tr key={migration.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{migration.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(migration.createdAt)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{migration.totalProducts} товаров</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(migration.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDuration(migration.duration)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/migrations/${migration.id}`}>
                    <a className="text-primary hover:text-primary-dark">Детали</a>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MigrationsTable;
