'use client';

import { useState } from 'react';
import { X, DollarSign, Calendar, FileText } from 'lucide-react';
import { addCapital } from '@/lib/api';

interface AddCapitalModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCapitalModal({ onClose, onSuccess }: AddCapitalModalProps) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'initial' | 'dca'>('dca');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await addCapital({ amount, type, description });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add capital');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Add Capital</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Capital Type</label>
            <div className="tab-list">
              <button
                type="button"
                onClick={() => setType('initial')}
                className={`tab-button flex-1 ${type === 'initial' ? 'active' : ''}`}
              >
                Initial Capital
              </button>
              <button
                type="button"
                onClick={() => setType('dca')}
                className={`tab-button flex-1 ${type === 'dca' ? 'active' : ''}`}
              >
                DCA
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <DollarSign size={14} className="inline mr-1" />
              Amount (USDT)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount in USDT"
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
              placeholder="e.g., January 2026 DCA"
              className="input-field"
            />
          </div>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Adding...' : 'Add Capital'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

