'use client';

import { useState } from 'react';
import { X, ArrowUpRight, DollarSign, FileText } from 'lucide-react';
import { withdrawCapital } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface WithdrawModalProps {
  onClose: () => void;
  onSuccess: () => void;
  availableUSDT: number;
}

export default function WithdrawModal({ onClose, onSuccess, availableUSDT }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const amountNum = parseFloat(amount);
    if (amountNum > availableUSDT) {
      setError(`Insufficient balance. You have ${formatCurrency(availableUSDT)} available.`);
      setLoading(false);
      return;
    }

    try {
      await withdrawCapital({ amount, description });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw');
    } finally {
      setLoading(false);
    }
  };

  const handlePercentage = (percent: number) => {
    setAmount((availableUSDT * percent / 100).toFixed(2));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-danger/10 text-danger">
              <ArrowUpRight size={24} />
            </div>
            <h2 className="text-xl font-semibold">Withdraw USDT</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Available Balance */}
        <div className="p-4 bg-muted rounded-xl mb-6">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Available Balance</span>
            <span className="font-mono font-semibold text-lg">{formatCurrency(availableUSDT)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              <DollarSign size={14} className="inline mr-1" />
              Amount (USDT)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={availableUSDT}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount to withdraw"
              className="input-field"
              required
            />
            
            {/* Quick percentage buttons */}
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map(percent => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => handlePercentage(percent)}
                  className="flex-1 py-2 text-sm bg-muted hover:bg-border rounded-lg transition-colors"
                >
                  {percent}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <FileText size={14} className="inline mr-1" />
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g., Cash out to bank"
              className="input-field"
            />
          </div>

          {/* Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">After withdrawal</span>
                <span className="font-mono font-medium">
                  {formatCurrency(Math.max(0, availableUSDT - parseFloat(amount)))}
                </span>
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
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="flex-1 bg-danger hover:bg-danger/90 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Withdraw'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

