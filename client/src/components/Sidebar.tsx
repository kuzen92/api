
import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobile = false, onClose }) => {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const isActive = (path: string) => {
    return location === path;
  };

  const getNavItemClasses = (path: string) => {
    return `flex items-center px-6 py-3 ${
      isActive(path) 
        ? 'text-gray-700 bg-primary-light bg-opacity-10' 
        : 'text-gray-700 hover:bg-gray-100'
    }`;
  };

  return (
    <div className="flex flex-col w-64 bg-white shadow-md h-full">
      {/* Header */}
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        {mobile && (
          <button 
            onClick={onClose}
            className="absolute right-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <span className="material-icons">close</span>
          </button>
        )}
        <h1 className="text-primary text-xl font-bold">Ozon → Wildberries</h1>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 pt-4 pb-4 overflow-y-auto">
        <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Основные
        </div>
        <div className={getNavItemClasses("/")} onClick={() => { onClose?.(); window.location.href = '/'; }}>
          <span className={`material-icons mr-3 ${isActive("/") ? 'text-primary' : 'text-gray-500'}`}>dashboard</span>
          <span>Дашборд</span>
        </div>
        <div className={getNavItemClasses("/migrations")} onClick={() => { onClose?.(); window.location.href = '/migrations'; }}>
          <span className={`material-icons mr-3 ${isActive("/migrations") ? 'text-primary' : 'text-gray-500'}`}>sync_alt</span>
          <span>Миграции</span>
        </div>
        <div className={getNavItemClasses("/products")} onClick={() => { onClose?.(); window.location.href = '/products'; }}>
          <span className={`material-icons mr-3 ${isActive("/products") ? 'text-primary' : 'text-gray-500'}`}>inventory_2</span>
          <span>Товары</span>
        </div>
        
        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Настройки
        </div>
        <Link href="/category-mapping" onClick={onClose} className="w-full text-left">
          <div className={getNavItemClasses("/category-mapping")}>
            <span className={`material-icons mr-3 ${isActive("/category-mapping") ? 'text-primary' : 'text-gray-500'}`}>schema</span>
            <span>Маппинг категорий</span>
          </div>
        </Link>
        <Link href="/api-settings" onClick={onClose} className="w-full text-left">
          <div className={getNavItemClasses("/api-settings")}>
            <span className={`material-icons mr-3 ${isActive("/api-settings") ? 'text-primary' : 'text-gray-500'}`}>settings</span>
            <span>API Ключи</span>
          </div>
        </Link>
      </nav>
      
      {/* User profile */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
            <span className="text-white font-medium">
              {user?.username?.substring(0, 2).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{user?.username || 'Пользователь'}</p>
            <p className="text-xs font-medium text-gray-500">ID: {user?.id || '-'}</p>
          </div>
          <button 
            className="ml-auto p-1 rounded-full text-gray-400 hover:text-gray-500"
            onClick={async () => {
              try {
                await logout();
                toast({
                  title: 'Выход выполнен',
                  description: 'Вы успешно вышли из системы',
                });
              } catch (error) {
                toast({
                  title: 'Ошибка',
                  description: 'Не удалось выйти из системы',
                  variant: 'destructive',
                });
              }
            }}
            title="Выйти из системы"
          >
            <span className="material-icons">logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
