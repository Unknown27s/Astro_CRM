import type { ComponentType } from 'react';
import { Card, CardContent } from './ui/Card';
import { cn } from '../utils/cn';

interface StatCardProps {
  icon: ComponentType<{ size?: number }>;
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning';
  onClick?: () => void;
}

export function StatCard({
  icon: Icon,
  title,
  value,
  description,
  trend,
  variant = 'default',
  onClick,
}: StatCardProps) {
  const variantClasses = {
    default: 'text-neutral-600 bg-neutral-50',
    primary: 'text-primary-600 bg-primary-50',
    success: 'text-success-600 bg-success-50',
    danger: 'text-danger-600 bg-danger-50',
    warning: 'text-warning-600 bg-warning-50',
  };

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-lg transition-all',
        onClick && 'hover:border-primary-300'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-neutral-500 font-medium mb-2">{title}</p>
            <h3 className="text-3xl font-bold text-neutral-900 mb-1">{value}</h3>
            {description && <p className="text-xs text-neutral-400">{description}</p>}
          </div>
          <div className={cn('p-3 rounded-lg', variantClasses[variant])}>
            <Icon size={24} />
          </div>
        </div>
        {trend && (
          <div className={cn('mt-4 text-sm font-medium', trend.isPositive ? 'text-success-600' : 'text-danger-600')}>
            {trend.isPositive ? '+' : ''}{trend.value}% from last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}
