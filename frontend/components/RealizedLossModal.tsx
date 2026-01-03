'use client';

import { useState } from 'react';
import { X, TrendingDown, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { addRealizedLoss } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface RealizedLossModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function RealizedLossModal({ onClose, onSuccess }: RealizedLossModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await addRealizedLoss({ amount, description });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add realized loss');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <TrendingDown size={24} />
            </div>
            <h2 className="text-xl font-semibold">Add Realized Loss</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-6">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-orange-500 mb-1">What is Realized Loss?</p>
              <p className="text-muted-foreground">
                Use this to record losses you made before starting to use this app. 
                This will be added to your Total Capital (to reflect your actual investment) 
                and subtracted from your Total PnL.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              <DollarSign size={14} className="inline mr-1" />
              Loss Amount (USDT)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter the amount you lost"
              className="input-field"
              required
            />
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
              placeholder="e.g., Previous trading losses in 2025"
              className="input-field"
            />
          </div>

          {/* Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-4 bg-muted rounded-xl space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Added to Total Capital</span>
                <span className="font-mono text-success">+{formatCurrency(parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtracted from Total PnL</span>
                <span className="font-mono text-danger">-{formatCurrency(parseFloat(amount))}</span>
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
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record Loss'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

