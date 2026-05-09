// AddExpenseModal - Slide-up modal for adding expenses
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, PoundSterling, Calendar, Tag, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { expensesService, type CreateExpenseRequest } from '@/lib/services/expenses-service';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_CONFIG, type ExpenseCategory } from '@/types/api';
import DatePickerModal from '@/components/date-picker-modal';
import './AddExpenseModal.css';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistId: string;
  onSuccess: () => void;
}

export default function AddExpenseModal({ isOpen, onClose, artistId, onSuccess }: AddExpenseModalProps) {
  const { toast } = useToast();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenseRequest) => expensesService.createExpense(artistId, data),
    onSuccess: () => {
      toast({ title: 'Expense added' });
      resetForm();
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setAmount('');
    setCategory('other');
    setDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }

    if (category === 'other' && !description.trim()) {
      toast({ title: 'Description required for "Other" category', variant: 'destructive' });
      return;
    }

    createMutation.mutate({
      date,
      amount: amountNum,
      category,
      description: description.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="expense-modal-backdrop" onClick={onClose} />
      <div className="expense-modal">
        <div className="expense-modal-header">
          <h2 className="expense-modal-title">Add Expense</h2>
          <button className="expense-modal-close" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="expense-modal-form">
          {/* Amount */}
          <div className="expense-field expense-amount-field">
            <label className="expense-label">Amount</label>
            <div className="expense-amount-input">
              <PoundSterling className="expense-input-icon" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="expense-amount"
                autoFocus
              />
            </div>
          </div>

          {/* Date */}
          <div className="expense-field">
            <label className="expense-label">Date</label>
            <button
              type="button"
              className="expense-date-btn"
              onClick={() => setShowDatePicker(true)}
            >
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(date), 'dd MMM yyyy')}</span>
            </button>
          </div>

          {/* Category */}
          <div className="expense-field">
            <label className="expense-label">Category</label>
            <div className="expense-categories">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`expense-category-btn ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  <span className="expense-category-icon">
                    {EXPENSE_CATEGORY_CONFIG[cat].icon}
                  </span>
                  <span className="expense-category-label">
                    {EXPENSE_CATEGORY_CONFIG[cat].label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="expense-field">
            <label className="expense-label">
              Description {category === 'other' && <span className="required">*</span>}
            </label>
            <div className="expense-description-input">
              <FileText className="expense-input-icon-small" />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
                className="expense-description"
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="expense-submit-btn"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Adding...' : 'Add Expense'}
          </Button>
        </form>
      </div>

      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(d) => {
          setDate(d);
          setShowDatePicker(false);
        }}
        selectedDate={date}
        title="Expense Date"
      />
    </>
  );
}
