'use client';

import { useState, useEffect } from 'react';
import { getPrice } from '@/lib/api';
import { PriceData, Holding, ASSET_COLORS } from '@/lib/types';
import { formatCurrency, formatPercent, isPositive, classNames } from '@/lib/utils';
import { TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';

interface PricesTickerProps {
  holdings: Holding[];
}

export default function PricesTicker({ holdings }: PricesTickerProps) {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  useEffect(() => {
    if (holdings.length > 0) {
      fetchPrices();
      const interval = setInterval(fetchPrices, 60000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [holdings]);

  const fetchPrices = async () => {
    if (holdings.length === 0) return;
    
    try {
      setLoading(true);
      const pricePromises = holdings.map(h => getPrice(h.asset));
      const pricesData = await Promise.all(pricePromises);
      setPrices(pricesData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (symbol: string) => {
    setExpandedAsset(prev => prev === symbol ? null : symbol);
  };

  // No holdings - show empty state
  if (holdings.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart2 size={20} />
            Market Prices
          </h3>
        </div>
        <div className="text-center py-6 text-muted-foreground">
          <BarChart2 size={32} className="mx-auto mb-3 opacity-50" />
          <p>No holdings to track</p>
          <p className="text-sm mt-1">Buy some coins to see their live prices here</p>
        </div>
      </div>
    );
  }

  if (loading && prices.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart2 size={20} />
          Market Prices
          <span className="text-sm font-normal text-muted-foreground">
            ({holdings.length} {holdings.length === 1 ? 'coin' : 'coins'})
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={fetchPrices}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            title="Refresh prices"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      {/* Prices Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {prices.map((price, index) => {
            const positive24h = isPositive(price.percent_change_24h);
            const color = ASSET_COLORS[price.symbol] || `hsl(${(index * 37) % 360}, 70%, 50%)`;
            const isExpanded = expandedAsset === price.symbol;
            const holding = holdings.find(h => h.asset === price.symbol);
            
            return (
              <div 
                key={price.symbol}
                className={classNames(
                  'bg-muted/50 rounded-xl transition-all hover:bg-muted relative group',
                  isExpanded && 'ring-1 ring-accent/50'
                )}
              >
                {/* Main content */}
                <div 
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => toggleExpand(price.symbol)}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {price.symbol.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{price.symbol}</span>
                      <span className={classNames(
                        'flex items-center gap-0.5 text-xs font-medium flex-shrink-0 px-2 py-0.5 rounded-full',
                        positive24h ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
                      )}>
                        {positive24h ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {formatPercent(price.percent_change_24h)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-lg">{formatCurrency(price.price)}</span>
                      {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </div>
                  </div>
                </div>

                {/* Expanded stats */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-border/50 mt-1">
                    <div className="grid grid-cols-2 gap-2 pt-3">
                      <StatItem label="1H" value={price.percent_change_1h} />
                      <StatItem label="24H" value={price.percent_change_24h} />
                      <StatItem label="7D" value={price.percent_change_7d} />
                      <StatItem label="30D" value={price.percent_change_30d} />
                    </div>
                    {holding && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Your Holdings</span>
                          <span className="font-mono">{parseFloat(holding.amount).toFixed(6)} {price.symbol}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Value</span>
                          <span className="font-mono">{formatCurrency(holding.current_value)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground px-4 pb-4 text-center">
        Click on any asset to see detailed price changes and your holdings
      </p>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  const positive = isPositive(value);
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={classNames(
        'font-mono',
        positive ? 'text-success' : 'text-danger'
      )}>
        {formatPercent(value)}
      </span>
    </div>
  );
}
