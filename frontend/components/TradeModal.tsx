'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Search, ChevronDown } from 'lucide-react';
import { createOrder, getPrice, getTopCoins } from '@/lib/api';
import { CoinInfo, ASSET_COLORS } from '@/lib/types';
import { formatCurrency, classNames } from '@/lib/utils';

interface TradeModalProps {
  onClose: () => void;
  onSuccess: () => void;
  availableUSDT: number;
  defaultAsset?: string;
  defaultType?: 'buy' | 'sell';
}

export default function TradeModal({ onClose, onSuccess, availableUSDT, defaultAsset, defaultType = 'buy' }: TradeModalProps) {
  const [coins, setCoins] = useState<CoinInfo[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinInfo | null>(null);
  const [showCoinPicker, setShowCoinPicker] = useState(false);
  const [coinSearch, setCoinSearch] = useState('');
  const [type, setType] = useState<'buy' | 'sell'>(defaultType);
  const [inputMode, setInputMode] = useState<'usdt' | 'crypto'>('usdt');
  const [amount, setAmount] = useState('');
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCoins();
  }, []);

  useEffect(() => {
    if (selectedCoin) {
      fetchCurrentPrice(selectedCoin.symbol);
    }
  }, [selectedCoin]);

  const fetchCoins = async () => {
    try {
      setLoadingCoins(true);
      const data = await getTopCoins(100);
      setCoins(data);
      
      // Set default selection
      if (defaultAsset) {
        const defaultCoin = data.find(c => c.symbol === defaultAsset);
        if (defaultCoin) {
          setSelectedCoin(defaultCoin);
        }
      } else if (data.length > 0) {
        // Default to BTC if no default asset
        const btc = data.find(c => c.symbol === 'BTC');
        setSelectedCoin(btc || data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch coins:', err);
    } finally {
      setLoadingCoins(false);
    }
  };

  const fetchCurrentPrice = async (symbol: string) => {
    try {
      const priceData = await getPrice(symbol);
      setCurrentPrice(parseFloat(priceData.price));
    } catch (err) {
      console.error('Failed to fetch price:', err);
      // Fallback to coin's price from list
      if (selectedCoin) {
        setCurrentPrice(parseFloat(selectedCoin.price));
      }
    }
  };

  const filteredCoins = useMemo(() => {
    if (!coinSearch) return coins;
    const search = coinSearch.toLowerCase();
    return coins.filter(c => 
      c.symbol.toLowerCase().includes(search) || 
      c.name.toLowerCase().includes(search)
    );
  }, [coins, coinSearch]);

  const effectivePrice = useCustomPrice && customPrice ? parseFloat(customPrice) : currentPrice;

  const calculateEstimate = () => {
    if (!amount || !effectivePrice) return { usdt: 0, crypto: 0 };
    const amountNum = parseFloat(amount);
    if (inputMode === 'usdt') {
      return { usdt: amountNum, crypto: amountNum / effectivePrice };
    } else {
      return { usdt: amountNum * effectivePrice, crypto: amountNum };
    }
  };

  const estimate = calculateEstimate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoin) return;
    
    setLoading(true);
    setError('');

    try {
      const orderData: {
        asset: string;
        type: 'buy' | 'sell';
        amount?: string;
        total_usdt?: string;
        price?: string;
        is_custom_price?: boolean;
      } = {
        asset: selectedCoin.symbol,
        type,
        is_custom_price: useCustomPrice,
      };

      if (inputMode === 'usdt') {
        orderData.total_usdt = amount;
      } else {
        orderData.amount = amount;
      }

      if (useCustomPrice && customPrice) {
        orderData.price = customPrice;
      }

      await createOrder(orderData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute order');
    } finally {
      setLoading(false);
    }
  };

  const handlePercentage = (percent: number) => {
    if (type === 'buy') {
      setInputMode('usdt');
      setAmount((availableUSDT * percent / 100).toFixed(2));
    }
  };

  const handleSelectCoin = (coin: CoinInfo) => {
    setSelectedCoin(coin);
    setShowCoinPicker(false);
    setCoinSearch('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {type === 'buy' ? 'Buy' : 'Sell'} Crypto
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Order Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Order Type</label>
            <div className="tab-list">
              <button
                type="button"
                onClick={() => setType('buy')}
                className={`tab-button flex-1 ${type === 'buy' ? 'active' : ''}`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setType('sell')}
                className={`tab-button flex-1 ${type === 'sell' ? 'active' : ''}`}
              >
                Sell
              </button>
            </div>
          </div>

          {/* Coin Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Coin (Top 100)</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCoinPicker(!showCoinPicker)}
                className="w-full flex items-center justify-between p-3 bg-muted border border-border rounded-xl hover:border-accent/50 transition-colors"
              >
                {loadingCoins ? (
                  <span className="text-muted-foreground">Loading coins...</span>
                ) : selectedCoin ? (
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: ASSET_COLORS[selectedCoin.symbol] || '#3b82f6' }}
                    >
                      {selectedCoin.symbol.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{selectedCoin.symbol}</div>
                      <div className="text-sm text-muted-foreground">{selectedCoin.name}</div>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select a coin</span>
                )}
                <ChevronDown size={18} className={classNames(
                  'transition-transform',
                  showCoinPicker && 'rotate-180'
                )} />
              </button>

              {/* Coin Picker Dropdown */}
              {showCoinPicker && (
                <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  {/* Search */}
                  <div className="p-3 border-b border-border">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={coinSearch}
                        onChange={e => setCoinSearch(e.target.value)}
                        placeholder="Search coins..."
                        className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  {/* Coin List */}
                  <div className="max-h-64 overflow-y-auto">
                    {filteredCoins.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No coins found
                      </div>
                    ) : (
                      filteredCoins.map((coin, index) => (
                        <button
                          key={coin.symbol}
                          type="button"
                          onClick={() => handleSelectCoin(coin)}
                          className={classNames(
                            'w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors',
                            selectedCoin?.symbol === coin.symbol && 'bg-accent/10'
                          )}
                        >
                          <span className="text-xs text-muted-foreground w-6">#{coin.rank}</span>
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: ASSET_COLORS[coin.symbol] || `hsl(${(index * 37) % 360}, 70%, 50%)` }}
                          >
                            {coin.symbol.charAt(0)}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm">{coin.symbol}</div>
                            <div className="text-xs text-muted-foreground truncate">{coin.name}</div>
                          </div>
                          <span className="font-mono text-sm">{formatCurrency(coin.price)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Price Display */}
          {selectedCoin && (
            <div className="p-4 bg-muted rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current {selectedCoin.symbol} Price</span>
                <span className="font-mono font-medium">{formatCurrency(currentPrice)}</span>
              </div>
            </div>
          )}

          {/* Custom Price Option */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="customPrice"
              checked={useCustomPrice}
              onChange={e => setUseCustomPrice(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-muted text-accent focus:ring-accent"
            />
            <label htmlFor="customPrice" className="text-sm">Use custom price</label>
          </div>

          {useCustomPrice && (
            <div>
              <label className="block text-sm font-medium mb-2">Custom Price (USDT)</label>
              <input
                type="number"
                step="0.00000001"
                min="0"
                value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
                placeholder="Enter custom price"
                className="input-field"
              />
            </div>
          )}

          {/* Input Mode Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">Input Mode</label>
            <div className="tab-list">
              <button
                type="button"
                onClick={() => setInputMode('usdt')}
                className={`tab-button flex-1 ${inputMode === 'usdt' ? 'active' : ''}`}
              >
                USDT Amount
              </button>
              <button
                type="button"
                onClick={() => setInputMode('crypto')}
                className={`tab-button flex-1 ${inputMode === 'crypto' ? 'active' : ''}`}
              >
                {selectedCoin?.symbol || 'Crypto'} Amount
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {inputMode === 'usdt' ? 'Amount in USDT' : `Amount in ${selectedCoin?.symbol || 'Crypto'}`}
            </label>
            <input
              type="number"
              step="0.00000001"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={inputMode === 'usdt' ? 'Enter USDT amount' : `Enter ${selectedCoin?.symbol || 'crypto'} amount`}
              className="input-field"
              required
            />
            
            {type === 'buy' && (
              <div className="flex gap-2 mt-2">
                {[25, 50, 75, 100].map(percent => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => handlePercentage(percent)}
                    className="flex-1 py-1 text-xs bg-muted hover:bg-border rounded-lg transition-colors"
                  >
                    {percent}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Estimate Display */}
          {amount && effectivePrice > 0 && selectedCoin && (
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You {type === 'buy' ? 'pay' : 'receive'}</span>
                <span className="font-mono">{formatCurrency(estimate.usdt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You {type === 'buy' ? 'receive' : 'sell'}</span>
                <span className="font-mono">{estimate.crypto.toFixed(8)} {selectedCoin.symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">At price</span>
                <span className="font-mono">{formatCurrency(effectivePrice)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !selectedCoin} 
              className="btn-primary flex-1"
            >
              {loading ? 'Processing...' : `${type === 'buy' ? 'Buy' : 'Sell'} ${selectedCoin?.symbol || ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
