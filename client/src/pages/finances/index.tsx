// Finances - Artist Financial Dashboard
// Luxury fintech aesthetic with bold typography and satisfying interactions

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, parseISO } from 'date-fns';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { expensesService } from '@/lib/services/expenses-service';
import { eventsService } from '@/lib/services/events-service';
import { apiRequest } from '@/lib/queryClient';
import type { ArtistMembership, FinancesResponse, Expense, ExpenseCategory, PaymentMethod } from '@/types/api';
import { EXPENSE_CATEGORY_CONFIG, PAYMENT_METHOD_CONFIG } from '@/types/api';
import { TrendingUp, TrendingDown, Wallet, Plus, Check, ChevronDown, Calendar, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import AddExpenseModal from './components/AddExpenseModal';
import AddIncomeModal from './components/AddIncomeModal';
import MarkAsPaidModal from './components/MarkAsPaidModal';
import './finances.css';

interface FinancesProps {
  artistId: string;
  membership: ArtistMembership;
}

type DateRangePreset = 'this_month' | 'this_quarter' | 'this_year' | 'all_time';
type TabView = 'income' | 'outgoing';

const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  this_month: 'This Month',
  this_quarter: 'This Quarter',
  this_year: 'This Year',
  all_time: 'All Time',
};

function getDateRange(preset: DateRangePreset): { startDate: string; endDate: string } {
  const now = new Date();
  switch (preset) {
    case 'this_month':
      return {
        startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'this_quarter':
      return {
        startDate: format(startOfQuarter(now), 'yyyy-MM-dd'),
        endDate: format(endOfQuarter(now), 'yyyy-MM-dd'),
      };
    case 'this_year':
      return {
        startDate: format(startOfYear(now), 'yyyy-MM-dd'),
        endDate: format(endOfYear(now), 'yyyy-MM-dd'),
      };
    case 'all_time':
    default:
      return { startDate: '2020-01-01', endDate: '2099-12-31' };
  }
}

export default function Finances({ artistId, membership }: FinancesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRangePreset>('this_month');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>('income');
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [selectedGigForPayment, setSelectedGigForPayment] = useState<FinancesResponse['income'][0] | null>(null);

  const { startDate, endDate } = useMemo(() => getDateRange(dateRange), [dateRange]);

  // Fetch finances data
  const { data: finances, isLoading, error } = useQuery({
    queryKey: ['finances', artistId, startDate, endDate],
    queryFn: () => expensesService.getFinances(artistId, startDate, endDate),
    staleTime: 30000,
  });

  // Mark gig as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async ({ eventId, datePaid, paymentMethod, actualFee }: {
      eventId: string;
      datePaid: string;
      paymentMethod: PaymentMethod;
      actualFee?: number;
    }) => {
      return apiRequest('PUT', `/api/artists/${artistId}/events/${eventId}`, {
        datePaid,
        paymentMethod,
        ...(actualFee !== undefined && { actualFee }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances', artistId] });
      toast({ title: 'Payment recorded', description: 'Gig marked as paid' });
      setSelectedGigForPayment(null);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => expensesService.deleteExpense(artistId, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances', artistId] });
      toast({ title: 'Expense deleted' });
    },
  });

  const summary = finances?.summary || {
    totalIncome: 0,
    totalPaidIncome: 0,
    totalUnpaidIncome: 0,
    totalExpenses: 0,
    balance: 0,
  };

  const income = finances?.income || [];
  const expenses = finances?.expenses || [];

  // Filter unpaid gigs for income modal
  const unpaidGigs = useMemo(() => income.filter(gig => !gig.isPaid), [income]);

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const grouped: Record<ExpenseCategory, Expense[]> = {} as any;
    expenses.forEach((expense) => {
      if (!grouped[expense.category]) {
        grouped[expense.category] = [];
      }
      grouped[expense.category].push(expense);
    });
    return grouped;
  }, [expenses]);

  return (
    <PageContainer variant="default">
      <div className="finances-page">
        {/* Header */}
        <div className="finances-header">
          <div className="finances-header-content">
            <h1 className="finances-title">Finances</h1>
            <div className="finances-date-filter">
              <button
                className="finances-date-button"
                onClick={() => setShowDateDropdown(!showDateDropdown)}
              >
                <Calendar className="w-4 h-4" />
                <span>{DATE_RANGE_LABELS[dateRange]}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showDateDropdown && (
                <>
                  <div className="finances-dropdown-backdrop" onClick={() => setShowDateDropdown(false)} />
                  <div className="finances-dropdown">
                    {(Object.keys(DATE_RANGE_LABELS) as DateRangePreset[]).map((preset) => (
                      <button
                        key={preset}
                        className={`finances-dropdown-item ${dateRange === preset ? 'active' : ''}`}
                        onClick={() => {
                          setDateRange(preset);
                          setShowDateDropdown(false);
                        }}
                      >
                        {DATE_RANGE_LABELS[preset]}
                        {dateRange === preset && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="finances-summary">
          <div className="finances-card finances-card-income" style={{ '--delay': '0' } as React.CSSProperties}>
            <div className="finances-card-icon income">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="finances-card-content">
              <span className="finances-card-label">Income</span>
              <span className="finances-card-value">
                <span className="finances-currency">£</span>
                {summary.totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {summary.totalUnpaidIncome > 0 && (
                <span className="finances-card-sublabel">
                  £{summary.totalUnpaidIncome.toFixed(0)} pending
                </span>
              )}
            </div>
          </div>

          <div className="finances-card finances-card-expenses" style={{ '--delay': '1' } as React.CSSProperties}>
            <div className="finances-card-icon expenses">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div className="finances-card-content">
              <span className="finances-card-label">Expenses</span>
              <span className="finances-card-value">
                <span className="finances-currency">£</span>
                {summary.totalExpenses.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="finances-card finances-card-balance" style={{ '--delay': '2' } as React.CSSProperties}>
            <div className={`finances-card-icon balance ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
              <Wallet className="w-5 h-5" />
            </div>
            <div className="finances-card-content">
              <span className="finances-card-label">Balance</span>
              <span className={`finances-card-value ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
                <span className="finances-currency">£</span>
                {Math.abs(summary.balance).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="finances-tabs">
          <button
            className={`finances-tab ${activeTab === 'income' ? 'active' : ''}`}
            onClick={() => setActiveTab('income')}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Income</span>
            <Badge variant="secondary" className="finances-tab-badge">
              {income.length}
            </Badge>
          </button>
          <button
            className={`finances-tab ${activeTab === 'outgoing' ? 'active' : ''}`}
            onClick={() => setActiveTab('outgoing')}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Outgoing</span>
            <Badge variant="secondary" className="finances-tab-badge">
              {expenses.length}
            </Badge>
          </button>
        </div>

        {/* Content */}
        <div className="finances-content">
          {isLoading ? (
            <div className="finances-loading">
              <div className="finances-loading-spinner" />
              <span>Loading finances...</span>
            </div>
          ) : error ? (
            <div className="finances-error">
              <span>Failed to load finances</span>
            </div>
          ) : activeTab === 'income' ? (
            /* Income List */
            <div className="finances-list">
              {income.length === 0 ? (
                <div className="finances-empty">
                  <TrendingUp className="w-12 h-12 text-muted-foreground/30" />
                  <p>No gigs with fees in this period</p>
                  <p className="text-sm text-muted-foreground">Add a fee to a gig to track income</p>
                </div>
              ) : (
                income.map((gig, index) => (
                  <div
                    key={gig.id}
                    className="finances-item income-item"
                    style={{ '--index': index } as React.CSSProperties}
                  >
                    <div className="finances-item-date">
                      <span className="day">{format(parseISO(gig.date), 'd')}</span>
                      <span className="month">{format(parseISO(gig.date), 'MMM')}</span>
                    </div>
                    <div className="finances-item-details">
                      <span className="finances-item-title">{gig.title || 'Untitled Gig'}</span>
                      {gig.datePaid && gig.paymentMethod && (
                        <span className="finances-item-meta">
                          {PAYMENT_METHOD_CONFIG[gig.paymentMethod]?.label}
                        </span>
                      )}
                    </div>
                    <div className="finances-item-amount">
                      {gig.noFee && !gig.isPaid ? (
                        <span className="amount no-fee">No Fee</span>
                      ) : (
                        <span className="amount">
                          £{(gig.actualFee ?? gig.agreedFee ?? 0).toFixed(2)}
                        </span>
                      )}
                      {gig.isPaid ? (
                        <Badge className="finances-badge paid">
                          <Check className="w-3 h-3 mr-1" />
                          Paid
                        </Badge>
                      ) : (
                        <button
                          className="finances-mark-paid-btn"
                          onClick={() => setSelectedGigForPayment(gig)}
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Outgoing List */
            <div className="finances-list">
              {expenses.length === 0 ? (
                <div className="finances-empty">
                  <TrendingDown className="w-12 h-12 text-muted-foreground/30" />
                  <p>No expenses recorded</p>
                  <p className="text-sm text-muted-foreground">Tap + to add an expense</p>
                </div>
              ) : (
                Object.entries(expensesByCategory).map(([category, categoryExpenses]) => (
                  <div key={category} className="finances-category-group">
                    <div className="finances-category-header">
                      <span className="finances-category-icon">
                        {EXPENSE_CATEGORY_CONFIG[category as ExpenseCategory]?.icon}
                      </span>
                      <span className="finances-category-label">
                        {EXPENSE_CATEGORY_CONFIG[category as ExpenseCategory]?.label}
                      </span>
                      <span className="finances-category-total">
                        £{categoryExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                      </span>
                    </div>
                    {categoryExpenses.map((expense, index) => (
                      <div
                        key={expense.id}
                        className="finances-item expense-item"
                        style={{ '--index': index } as React.CSSProperties}
                      >
                        <div className="finances-item-date">
                          <span className="day">{format(parseISO(expense.date), 'd')}</span>
                          <span className="month">{format(parseISO(expense.date), 'MMM')}</span>
                        </div>
                        <div className="finances-item-details">
                          <span className="finances-item-title">
                            {expense.description || EXPENSE_CATEGORY_CONFIG[expense.category]?.label}
                          </span>
                        </div>
                        <div className="finances-item-amount expense">
                          <span className="amount">-£{expense.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Floating Action Button with Menu */}
        {showFabMenu && (
          <div className="finances-fab-backdrop" onClick={() => setShowFabMenu(false)} />
        )}
        <div className={`finances-fab-menu ${showFabMenu ? 'open' : ''}`}>
          <button
            className="finances-fab-option"
            onClick={() => {
              setShowFabMenu(false);
              setShowAddIncome(true);
            }}
          >
            <ArrowDownLeft className="w-5 h-5" />
            <span>Add Income</span>
          </button>
          <button
            className="finances-fab-option expense"
            onClick={() => {
              setShowFabMenu(false);
              setShowAddExpense(true);
            }}
          >
            <ArrowUpRight className="w-5 h-5" />
            <span>Add Expense</span>
          </button>
        </div>
        <button
          className={`finances-fab ${showFabMenu ? 'active' : ''}`}
          onClick={() => setShowFabMenu(!showFabMenu)}
          aria-label="Add transaction"
        >
          {showFabMenu ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>

        {/* Modals */}
        <AddExpenseModal
          isOpen={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          artistId={artistId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['finances', artistId] });
            setShowAddExpense(false);
          }}
        />

        <AddIncomeModal
          isOpen={showAddIncome}
          onClose={() => setShowAddIncome(false)}
          artistId={artistId}
          unpaidGigs={unpaidGigs}
          onSelectGig={(gig) => {
            setShowAddIncome(false);
            setSelectedGigForPayment(gig);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['finances', artistId] });
            setShowAddIncome(false);
          }}
        />

        {selectedGigForPayment && (
          <MarkAsPaidModal
            isOpen={!!selectedGigForPayment}
            onClose={() => setSelectedGigForPayment(null)}
            gig={selectedGigForPayment}
            onConfirm={(data) => markAsPaidMutation.mutate({
              eventId: selectedGigForPayment.id,
              ...data,
            })}
            isLoading={markAsPaidMutation.isPending}
          />
        )}
      </div>
    </PageContainer>
  );
}
