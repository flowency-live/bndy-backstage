// MarkAsPaidModal - Quick action to record gig payment
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Check, PoundSterling, Calendar, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PAYMENT_METHODS, PAYMENT_METHOD_CONFIG, type PaymentMethod, type FinancesResponse } from '@/types/api';
import DatePickerModal from '@/components/date-picker-modal';
import './MarkAsPaidModal.css';

interface MarkAsPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  gig: FinancesResponse['income'][0];
  onConfirm: (data: { datePaid: string; paymentMethod: PaymentMethod; actualFee?: number }) => void;
  isLoading: boolean;
}

export default function MarkAsPaidModal({ isOpen, onClose, gig, onConfirm, isLoading }: MarkAsPaidModalProps) {
  const [datePaid, setDatePaid] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [actualFee, setActualFee] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Reset form when gig changes to avoid stale state
  useEffect(() => {
    if (gig) {
      setActualFee(String(gig.actualFee ?? gig.agreedFee ?? ''));
      setDatePaid(format(new Date(), 'yyyy-MM-dd'));
      setPaymentMethod('bank_transfer');
    }
  }, [gig?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fee = parseFloat(actualFee);
    const originalFee = gig.actualFee ?? gig.agreedFee;
    onConfirm({
      datePaid,
      paymentMethod,
      ...(fee !== originalFee && !isNaN(fee) ? { actualFee: fee } : {}),
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="paid-modal-backdrop" onClick={onClose} />
      <div className="paid-modal">
        <div className="paid-modal-header">
          <div className="paid-modal-header-content">
            <div className="paid-modal-check">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h2 className="paid-modal-title">Mark as Paid</h2>
              <p className="paid-modal-subtitle">{gig.venueName || gig.title}</p>
            </div>
          </div>
          <button className="paid-modal-close" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="paid-modal-form">
          {/* Amount */}
          <div className="paid-field">
            <label className="paid-label">Amount Received</label>
            <div className="paid-amount-input">
              <PoundSterling className="paid-input-icon" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={actualFee}
                onChange={(e) => setActualFee(e.target.value)}
                className="paid-amount"
              />
            </div>
            {gig.agreedFee && parseFloat(actualFee) !== gig.agreedFee && (
              <span className="paid-amount-note">
                Agreed: £{gig.agreedFee.toFixed(2)}
              </span>
            )}
          </div>

          {/* Date Paid */}
          <div className="paid-field">
            <label className="paid-label">Date Received</label>
            <button
              type="button"
              className="paid-date-btn"
              onClick={() => setShowDatePicker(true)}
            >
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(datePaid), 'dd MMM yyyy')}</span>
            </button>
          </div>

          {/* Payment Method */}
          <div className="paid-field">
            <label className="paid-label">Payment Method</label>
            <div className="paid-methods">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`paid-method-btn ${paymentMethod === method ? 'active' : ''}`}
                  onClick={() => setPaymentMethod(method)}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{PAYMENT_METHOD_CONFIG[method].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="paid-actions">
            <Button type="button" variant="outline" onClick={onClose} className="paid-cancel-btn">
              Cancel
            </Button>
            <Button type="submit" className="paid-confirm-btn" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Confirm Payment'}
            </Button>
          </div>
        </form>
      </div>

      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(d) => {
          setDatePaid(d);
          setShowDatePicker(false);
        }}
        selectedDate={datePaid}
        title="Payment Date"
      />
    </>
  );
}
