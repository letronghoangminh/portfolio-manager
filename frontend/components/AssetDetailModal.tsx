'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { getAssetDetail } from '@/lib/api';
import { AssetDetail, ASSET_NAMES, ASSET_COLORS, Order } from '@/lib/types';
import { formatCurrency, formatPercent, formatCryptoAmount, formatDate, isPositive, classNames } from '@/lib/utils';

interface AssetDetailModalProps {
  asset: string;
  onClose: () => void;
  onTrade: (asset: string, type: 'buy' | 'sell') => void;
}

export default function AssetDetailModal({ asset, onClose, onTrade }: AssetDetailModalProps) {
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDetail();
  }, [asset]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await getAssetDetail(asset);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset details');
    } finally {
      setLoading(false);
    }
  };

  const color = ASSET_COLORS[asset] || '#3b82f6';

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="text-center py-12">
            <p className="text-danger">{error || 'No data available'}</p>
            <button onClick={onClose} className="btn-secondary mt-4">Close</button>
          </div>
        </div>
      </div>
    );
  }

  const pnl = parseFloat(detail.pnl);
  const pnlPercent = parseFloat(detail.pnl_percent);
  const positive = isPositive(pnl);
  const change24h = parseFloat(detail.percent_change_24h);
  const positive24h = isPositive(change24h);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg"
              style={{ backgroundColor: color }}
            >
              {asset.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{asset}</h2>
              <p className="text-muted-foreground">{ASSET_NAMES[asset] || asset}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Price Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm mb-1">Current Price</p>
            <p className="text-2xl font-mono font-semibold">{formatCurrency(detail.current_price)}</p>
            <div className={classNames(
              'inline-flex items-center mt-2 gap-1 text-sm',
              positive24h ? 'text-success' : 'text-danger'
            )}>
              {positive24h ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {formatPercent(change24h)} (24h)
            </div>
          </div>
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm mb-1">Average Price</p>
            <p className="text-2xl font-mono font-semibold">{formatCurrency(detail.average_price)}</p>
            <p className="text-muted-foreground text-sm mt-2">Entry price</p>
          </div>
        </div>

        {/* Holdings Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm mb-1">Holdings</p>
            <p className="text-lg font-mono font-medium">
              {formatCryptoAmount(detail.amount, asset)} {asset}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm mb-1">Total Cost</p>
            <p className="text-lg font-mono font-medium">{formatCurrency(detail.total_cost)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm mb-1">Current Value</p>
            <p className="text-lg font-mono font-medium">{formatCurrency(detail.current_value)}</p>
          </div>
        </div>

        {/* PnL Section */}
        <div className={classNames(
          'glass-card p-5 mb-6',
          positive ? 'border-success/30' : 'border-danger/30'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Profit / Loss</p>
              <p className={classNames(
                'text-3xl font-mono font-bold',
                positive ? 'text-success' : 'text-danger'
              )}>
                {positive ? '+' : ''}{formatCurrency(pnl)}
              </p>
            </div>
            <div className={classNames(
              'text-right px-4 py-2 rounded-xl',
              positive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            )}>
              <p className="text-2xl font-mono font-bold">{formatPercent(pnlPercent)}</p>
              <p className="text-xs mt-1">Return</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">% of Portfolio</span>
              <span className="font-mono">{parseFloat(detail.percent_of_capital).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button 
            onClick={() => { onClose(); onTrade(asset, 'buy'); }}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <ArrowDownLeft size={18} />
            Buy More
          </button>
          <button 
            onClick={() => { onClose(); onTrade(asset, 'sell'); }}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <ArrowUpRight size={18} />
            Sell
          </button>
        </div>

        {/* Order History */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock size={18} />
            Order History
          </h3>
          
          {detail.orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders yet
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className={classNames(
                          'badge',
                          order.type === 'buy' ? 'badge-success' : 'badge-danger'
                        )}>
                          {order.type}
                        </span>
                      </td>
                      <td>{formatCryptoAmount(order.amount, asset)}</td>
                      <td>
                        {formatCurrency(order.price)}
                        {order.is_custom_price && (
                          <span className="ml-1 text-xs text-muted-foreground">(custom)</span>
                        )}
                      </td>
                      <td>{formatCurrency(order.total_usdt)}</td>
                      <td className="text-muted-foreground text-sm">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

