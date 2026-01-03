'use client';

import { ReactNode } from 'react';
import { classNames, isPositive } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon?: ReactNode;
  trend?: string;
  className?: string;
  valueClassName?: string;
}

export default function StatCard({ title, value, subValue, icon, trend, className, valueClassName }: StatCardProps) {
  const hasTrend = trend !== undefined;
  const positive = hasTrend && isPositive(trend);

  return (
    <div className={classNames('glass-card p-6 h-full', className)}>
      <div className="flex items-start justify-between h-full">
        <div className="flex flex-col">
          <p className="text-muted-foreground text-sm font-medium mb-2">{title}</p>
          <p className={classNames('text-2xl font-semibold font-mono tracking-tight', valueClassName)}>{value}</p>
          <div className="mt-1 min-h-[28px] flex items-center">
            {subValue && (
              <p className="text-muted-foreground text-sm">{subValue}</p>
            )}
            {hasTrend && (
              <div className={classNames(
                'inline-flex items-center px-2 py-1 rounded-full text-sm font-medium',
                positive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              )}>
                {positive ? '↑' : '↓'} {trend}
              </div>
            )}
          </div>
        </div>
        {icon && (
          <div className="p-3 rounded-xl bg-accent/10 text-accent flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
