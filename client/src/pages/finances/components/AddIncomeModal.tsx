// AddIncomeModal - Slide-up modal for adding income entries
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, PoundSterling, Calendar, FileText, Music, Users, Wallet, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { expensesService, type CreateIncomeRequest } from '@/lib/services/expenses-service';
import { INCOME_CATEGORY_CONFIG, type IncomeCategory, type FinancesResponse } from '@/types/api';
import DatePickerModal from '@/components/date-picker-modal';
import './AddIncomeModal.css';

type IncomeType = 'gig_payment' | 'member_contribution' | 'other';

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistId: string;
  onSuccess: () => void;
  unpaidGigs: FinancesResponse['income'];
  onSelectGig: (gig: FinancesResponse['income'][0]) => void;
}

const INCOME_TYPES: { type: IncomeType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    type: 'gig_payment',
    label: 'Gig Payment',
    icon: <Music className="w-5 h-5" />,
    description: 'Record payment for a gig'
  },
  {
    type: 'member_contribution',
    label: 'Member Contribution',
    icon: <Users className="w-5 h-5" />,
    description: 'Member adds to band pot'
  },
  {
    type: 'other',
    label: 'Other Income',
    icon: <Wallet className="w-5 h-5" />,
    description: 'Tips, merch, donations, etc.'
  }
];

export default function AddIncomeModal({
  isOpen,
  onClose,
  artistId,
  onSuccess,
  unpaidGigs,
  onSelectGig
}: AddIncomeModalProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<IncomeType | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: CreateIncomeRequest) => expensesService.createIncome(artistId, data),
    onSuccess: () => {
      toast({ title: 'Income added' });
      resetForm();
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setSelectedType(null);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setAmount('');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType || selectedType === 'gig_payment') return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }

    if (!description.trim()) {
      toast({ title: 'Description required', variant: 'destructive' });
      return;
    }

    createMutation.mutate({
      date,
      amount: amountNum,
      category: selectedType as IncomeCategory,
      description: description.trim(),
    });
  };

  const handleGigSelect = (gig: FinancesResponse['income'][0]) => {
    handleClose();
    onSelectGig(gig);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="income-modal-backdrop" onClick={handleClose} />
      <div className="income-modal">
        <div className="income-modal-header">
          <h2 className="income-modal-title">
            {selectedType ? INCOME_TYPES.find(t => t.type === selectedType)?.label : 'Add Income'}
          </h2>
          <button className="income-modal-close" onClick={handleClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selection */}
        {!selectedType && (
          <div className="income-type-list">
            {INCOME_TYPES.map((incomeType) => (
              <button
                key={incomeType.type}
                className="income-type-btn"
                onClick={() => setSelectedType(incomeType.type)}
              >
                <div className="income-type-icon">{incomeType.icon}</div>
                <div className="income-type-content">
                  <span className="income-type-label">{incomeType.label}</span>
                  <span className="income-type-desc">{incomeType.description}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Gig Payment - Show unpaid gigs */}
        {selectedType === 'gig_payment' && (
          <div className="income-gig-list">
            <button
              className="income-back-btn"
              onClick={() => setSelectedType(null)}
            >
              ← Back
            </button>
            {unpaidGigs.length === 0 ? (
              <div className="income-empty">
                <Music className="w-12 h-12 text-muted-foreground/30" />
                <p>No unpaid gigs</p>
                <p className="text-sm text-muted-foreground">
                  All gigs with fees have been marked as paid
                </p>
              </div>
            ) : (
              <>
                <p className="income-gig-hint">Select a gig to mark as paid</p>
                {unpaidGigs.map((gig) => (
                  <button
                    key={gig.id}
                    className="income-gig-btn"
                    onClick={() => handleGigSelect(gig)}
                  >
                    <div className="income-gig-date">
                      <span className="day">{format(new Date(gig.date), 'd')}</span>
                      <span className="month">{format(new Date(gig.date), 'MMM')}</span>
                    </div>
                    <div className="income-gig-details">
                      <span className="income-gig-title">{gig.title || 'Untitled Gig'}</span>
                      {gig.noFee ? (
                        <span className="income-gig-fee no-fee">No guaranteed fee</span>
                      ) : (
                        <span className="income-gig-fee">£{(gig.agreedFee ?? 0).toFixed(2)}</span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-emerald-500" />
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Member Contribution / Other Income Form */}
        {(selectedType === 'member_contribution' || selectedType === 'other') && (
          <form onSubmit={handleSubmit} className="income-form">
            <button
              type="button"
              className="income-back-btn"
              onClick={() => setSelectedType(null)}
            >
              ← Back
            </button>

            {/* Amount */}
            <div className="income-field income-amount-field">
              <label className="income-label">Amount</label>
              <div className="income-amount-input">
                <PoundSterling className="income-input-icon" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="income-amount"
                  autoFocus
                />
              </div>
            </div>

            {/* Date */}
            <div className="income-field">
              <label className="income-label">Date</label>
              <button
                type="button"
                className="income-date-btn"
                onClick={() => setShowDatePicker(true)}
              >
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(date), 'dd MMM yyyy')}</span>
              </button>
            </div>

            {/* Description */}
            <div className="income-field">
              <label className="income-label">
                Description <span className="required">*</span>
              </label>
              <div className="income-description-input">
                <FileText className="income-input-icon-small" />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    selectedType === 'member_contribution'
                      ? 'e.g., John - Equipment fund'
                      : 'e.g., Merch sales at The Crown'
                  }
                  className="income-description"
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="income-submit-btn"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Adding...' : 'Add Income'}
            </Button>
          </form>
        )}
      </div>

      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(d) => {
          setDate(d);
          setShowDatePicker(false);
        }}
        selectedDate={date}
        title="Income Date"
      />
    </>
  );
}
