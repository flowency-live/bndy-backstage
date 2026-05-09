// EditExpenseModal - Edit expense description and amount
import { useState, useEffect } from 'react';
import { X, PoundSterling, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Expense } from '@/types/api';
import { EXPENSE_CATEGORY_CONFIG } from '@/types/api';
import './EditExpenseModal.css';

interface EditExpenseModalProps {
  expense: Expense;
  onClose: () => void;
  onSave: (updates: { amount?: number; description?: string }) => void;
  isLoading: boolean;
}

export default function EditExpenseModal({ expense, onClose, onSave, isLoading }: EditExpenseModalProps) {
  const [amount, setAmount] = useState(String(expense.amount));
  const [description, setDescription] = useState(expense.description || '');

  // Reset form when expense changes
  useEffect(() => {
    setAmount(String(expense.amount));
    setDescription(expense.description || '');
  }, [expense.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const updates: { amount?: number; description?: string } = {};
    if (amountNum !== expense.amount) updates.amount = amountNum;
    if (description.trim() !== (expense.description || '')) updates.description = description.trim();

    if (Object.keys(updates).length > 0) {
      onSave(updates);
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="edit-expense-backdrop" onClick={onClose} />
      <div className="edit-expense-modal">
        <div className="edit-expense-header">
          <div className="edit-expense-header-content">
            <span className="edit-expense-icon">
              {EXPENSE_CATEGORY_CONFIG[expense.category]?.icon}
            </span>
            <div>
              <h2 className="edit-expense-title">Edit Expense</h2>
              <p className="edit-expense-subtitle">{EXPENSE_CATEGORY_CONFIG[expense.category]?.label}</p>
            </div>
          </div>
          <button className="edit-expense-close" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-expense-form">
          {/* Amount */}
          <div className="edit-expense-field">
            <label className="edit-expense-label">Amount</label>
            <div className="edit-expense-amount-input">
              <PoundSterling className="edit-expense-input-icon" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="edit-expense-amount"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div className="edit-expense-field">
            <label className="edit-expense-label">Description</label>
            <div className="edit-expense-description-input">
              <FileText className="edit-expense-input-icon-small" />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                className="edit-expense-description"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="edit-expense-actions">
            <Button type="button" variant="outline" onClick={onClose} className="edit-expense-cancel-btn">
              Cancel
            </Button>
            <Button type="submit" className="edit-expense-save-btn" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
