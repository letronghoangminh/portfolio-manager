'use client';

import { HoldingDetail, ASSET_NAMES, ASSET_COLORS } from '@/lib/types';
import { formatCurrency, formatPercent, formatCryptoAmount, isPositive, classNames } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface HoldingCardProps {
  holding: HoldingDetail;
  onClick: () => void;
}

export default function HoldingCard({ holding, onClick }: HoldingCardProps) {
  const pnl = parseFloat(holding.pnl);
  const pnlPercent = parseFloat(holding.pnl_percent);
  const positive = isPositive(pnl);
  const color = ASSET_COLORS[holding.asset] || '#3b82f6';

  return (
    <div 
      onClick={onClick}
      className="glass-card glass-card-hover p-5 cursor-pointer"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
            style={{ backgroundColor: color }}
          >
            {holding.asset.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold">{holding.asset}</h3>
            <p className="text-muted-foreground text-sm">{ASSET_NAMES[holding.asset] || holding.asset}</p>
          </div>
        </div>
        <div className={classNames(
          'flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium',
          positive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        )}>
          {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {formatPercent(pnlPercent)}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">Holdings</span>
          <span className="font-mono">
            {formatCryptoAmount(holding.amount, holding.asset)} {holding.asset}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">Current Value</span>
          <span className="font-mono font-medium">
            {formatCurrency(holding.current_value)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">P&L</span>
          <span className={classNames(
            'font-mono font-medium',
            positive ? 'text-success' : 'text-danger'
          )}>
            {positive ? '+' : ''}{formatCurrency(pnl)}
          </span>
        </div>
        
        <div className="pt-3 border-t border-border">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">% of Portfolio</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${Math.min(parseFloat(holding.percent_of_capital), 100)}%`,
                    backgroundColor: color 
                  }}
                />
              </div>
              <span className="font-mono">{parseFloat(holding.percent_of_capital).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

