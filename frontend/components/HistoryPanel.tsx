'use client';

import { useState, useEffect } from 'react';
import { History, DollarSign, ArrowRightLeft, Trash2, ArrowUpRight, ArrowDownLeft, TrendingDown } from 'lucide-react';
import { getCapitals, getOrders, deleteCapital, deleteOrder } from '@/lib/api';
import { Capital, Order, ASSET_NAMES } from '@/lib/types';
import { formatCurrency, formatDate, formatCryptoAmount, classNames } from '@/lib/utils';

interface HistoryPanelProps {
  refreshTrigger: number;
  onRefresh: () => void;
}

export default function HistoryPanel({ refreshTrigger, onRefresh }: HistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'capital' | 'orders'>('capital');
  const [capitals, setCapitals] = useState<Capital[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [capsData, ordersData] = await Promise.all([
        getCapitals(),
        getOrders(),
      ]);
      setCapitals(capsData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCapital = async (id: number) => {
    if (!confirm('Are you sure you want to delete this capital entry? This will also adjust your USDT balance.')) {
      return;
    }
    try {
      await deleteCapital(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete capital:', err);
    }
  };

  const totalDeposits = capitals
    .filter(cap => cap.type === 'initial' || cap.type === 'dca')
    .reduce((sum, cap) => sum + parseFloat(cap.amount), 0);
  const totalWithdrawals = capitals
    .filter(cap => cap.type === 'withdraw')
    .reduce((sum, cap) => sum + Math.abs(parseFloat(cap.amount)), 0);
  const totalRealizedLoss = capitals
    .filter(cap => cap.type === 'realized_loss')
    .reduce((sum, cap) => sum + Math.abs(parseFloat(cap.amount)), 0);
  const netCapital = totalDeposits - totalWithdrawals;

  return (
    <div className="glass-card">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <History size={20} />
          Transaction History
        </h2>
      </div>

      {/* Tabs */}
      <div className="p-4 border-b border-border">
        <div className="tab-list">
          <button
            onClick={() => setActiveTab('capital')}
            className={`tab-button flex-1 flex items-center justify-center gap-2 ${activeTab === 'capital' ? 'active' : ''}`}
          >
            <DollarSign size={16} />
            Capital ({capitals.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`tab-button flex-1 flex items-center justify-center gap-2 ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <ArrowRightLeft size={16} />
            Orders ({orders.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
          </div>
        ) : activeTab === 'capital' ? (
          <div>
            {/* Summary */}
            <div className="mb-4 p-4 bg-muted rounded-xl space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Deposits</span>
                <span className="font-mono text-success">+{formatCurrency(totalDeposits)}</span>
              </div>
              {totalWithdrawals > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Withdrawals</span>
                  <span className="font-mono text-danger">-{formatCurrency(totalWithdrawals)}</span>
                </div>
              )}
              {totalRealizedLoss > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Realized Loss</span>
                  <span className="font-mono text-orange-500">-{formatCurrency(totalRealizedLoss)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-muted-foreground">Net Capital</span>
                <span className="font-mono font-semibold text-lg">{formatCurrency(netCapital)}</span>
              </div>
            </div>

            {/* Capital List */}
            {capitals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No capital entries yet. Add your initial capital to get started!
              </div>
            ) : (
              <div className="space-y-3">
                {capitals.map((cap) => {
                  const isWithdraw = cap.type === 'withdraw';
                  const isRealizedLoss = cap.type === 'realized_loss';
                  const amount = parseFloat(cap.amount);
                  const displayAmount = Math.abs(amount);
                  
                  const getIconAndStyle = () => {
                    if (isWithdraw) return { icon: <ArrowUpRight size={18} />, bg: 'bg-danger/20 text-danger' };
                    if (isRealizedLoss) return { icon: <TrendingDown size={18} />, bg: 'bg-orange-500/20 text-orange-500' };
                    if (cap.type === 'initial') return { icon: <ArrowDownLeft size={18} />, bg: 'bg-accent/20 text-accent' };
                    return { icon: <ArrowDownLeft size={18} />, bg: 'bg-success/20 text-success' };
                  };
                  
                  const getBadgeStyle = () => {
                    if (isWithdraw) return 'badge-danger';
                    if (isRealizedLoss) return 'bg-orange-500/10 text-orange-500';
                    if (cap.type === 'initial') return 'bg-accent/10 text-accent';
                    return 'badge-success';
                  };
                  
                  const getLabel = () => {
                    if (isWithdraw) return 'Withdraw';
                    if (isRealizedLoss) return 'Realized Loss';
                    if (cap.type === 'initial') return 'Initial';
                    return 'DCA';
                  };
                  
                  const { icon, bg } = getIconAndStyle();
                  
                  return (
                    <div key={cap.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl group">
                      <div className="flex items-center gap-4">
                        <div className={classNames('w-10 h-10 rounded-full flex items-center justify-center', bg)}>
                          {icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={classNames(
                              'font-mono font-medium',
                              isWithdraw && 'text-danger',
                              isRealizedLoss && 'text-orange-500'
                            )}>
                              {(isWithdraw || isRealizedLoss) ? '-' : '+'}{formatCurrency(displayAmount)}
                            </span>
                            <span className={classNames('badge text-xs', getBadgeStyle())}>
                              {getLabel()}
                            </span>
                          </div>
                          {cap.description && (
                            <p className="text-muted-foreground text-sm">{cap.description}</p>
                          )}
                          <p className="text-muted-foreground text-xs mt-1">{formatDate(cap.created_at)}</p>
                        </div>
                      </div>
                      {!isWithdraw && !isRealizedLoss && (
                        <button
                          onClick={() => handleDeleteCapital(cap.id)}
                          className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No orders yet. Start trading to see your order history!
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={classNames(
                        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm',
                        order.type === 'buy' ? 'bg-success' : 'bg-danger'
                      )}>
                        {order.asset.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={classNames(
                            'badge',
                            order.type === 'buy' ? 'badge-success' : 'badge-danger'
                          )}>
                            {order.type}
                          </span>
                          <span className="font-medium">{order.asset}</span>
                          {order.is_custom_price && (
                            <span className="badge badge-neutral text-xs">Custom</span>
                          )}
                        </div>
                        <div className="text-sm mt-1">
                          <span className="font-mono">{formatCryptoAmount(order.amount, order.asset)}</span>
                          <span className="text-muted-foreground"> @ </span>
                          <span className="font-mono">{formatCurrency(order.price)}</span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-1">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium">{formatCurrency(order.total_usdt)}</p>
                      <p className="text-muted-foreground text-xs">Total</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

