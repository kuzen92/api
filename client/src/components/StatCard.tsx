import React from 'react';

interface StatCardProps {
  icon: string;
  title: string;
  value: number | string;
  iconBgColor?: string;
  iconTextColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  title, 
  value, 
  iconBgColor = 'bg-primary-light', 
  iconTextColor = 'text-primary' 
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${iconBgColor} bg-opacity-10 ${iconTextColor}`}>
          <span className="material-icons">{icon}</span>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
