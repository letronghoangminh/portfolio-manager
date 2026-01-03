'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, Sun, Moon, Trash2, X, AlertTriangle, TrendingDown } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { resetAllData } from '@/lib/api';

interface SettingsMenuProps {
  onReset: () => void;
  onAddRealizedLoss: () => void;
}

export default function SettingsMenu({ onReset, onAddRealizedLoss }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReset = async () => {
    try {
      setResetting(true);
      await resetAllData();
      setShowResetConfirm(false);
      setIsOpen(false);
      onReset();
    } catch (err) {
      console.error('Failed to reset:', err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 hover:bg-muted rounded-xl transition-colors border border-border"
          title="Settings"
        >
          <Settings size={20} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 glass-card p-2 shadow-xl z-50 animate-fade-in">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={18} className="text-yellow-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={18} className="text-blue-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            <div className="h-px bg-border my-2" />

            {/* Realized Loss Button */}
            <button
              onClick={() => { setIsOpen(false); onAddRealizedLoss(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-500/10 text-orange-500 rounded-lg transition-colors"
            >
              <TrendingDown size={18} />
              <span>Add Realized Loss</span>
            </button>

            <div className="h-px bg-border my-2" />

            {/* Reset Button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-danger/10 text-danger rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              <span>Reset All Data</span>
            </button>
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-danger">
                <AlertTriangle size={24} />
                <h2 className="text-xl font-semibold">Reset All Data</h2>
              </div>
              <button 
                onClick={() => setShowResetConfirm(false)} 
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-muted-foreground mb-6">
              Are you sure you want to reset all data? This will permanently delete:
            </p>

            <ul className="space-y-2 mb-6 ml-4">
              <li className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                All capital entries
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                All trading orders
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                All holdings
              </li>
            </ul>

            <p className="text-sm text-muted-foreground mb-6">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowResetConfirm(false)} 
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 bg-danger hover:bg-danger/90 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Yes, Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

