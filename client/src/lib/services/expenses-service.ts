// src/lib/services/expenses-service.ts
import { API_BASE_URL } from '../../config/api';
import type { Expense, ExpenseCategory, Income, IncomeCategory, FinancesResponse } from '@/types/api';

export interface CreateExpenseRequest {
  date: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  paidBy?: string;
  relatedEventId?: string;
  groupId?: string;
}

export interface UpdateExpenseRequest {
  date?: string;
  amount?: number;
  category?: ExpenseCategory;
  description?: string;
  paidBy?: string;
  relatedEventId?: string;
  groupId?: string;
}

export interface ExpensesListResponse {
  expenses: Expense[];
}

export interface CreateIncomeRequest {
  date: string;
  amount: number;
  category: IncomeCategory;
  description?: string;
  relatedEventId?: string;
  memberId?: string;
}

export interface IncomeListResponse {
  income: Income[];
}

class ExpensesService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make authenticated API request with credentials
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    // Handle empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return await response.json();
  }

  /**
   * Get all expenses for an artist with optional date range
   */
  async getExpenses(
    artistId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ExpensesListResponse> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiRequest<ExpensesListResponse>(
      `/api/artists/${artistId}/expenses${query}`
    );
  }

  /**
   * Create a new expense for an artist
   */
  async createExpense(
    artistId: string,
    expense: CreateExpenseRequest
  ): Promise<Expense> {
    return this.apiRequest<Expense>(`/api/artists/${artistId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  }

  /**
   * Update an existing expense
   */
  async updateExpense(
    artistId: string,
    expenseId: string,
    updates: UpdateExpenseRequest
  ): Promise<Expense> {
    return this.apiRequest<Expense>(
      `/api/artists/${artistId}/expenses/${expenseId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
  }

  /**
   * Delete an expense
   */
  async deleteExpense(artistId: string, expenseId: string): Promise<void> {
    await this.apiRequest<{ success: boolean }>(
      `/api/artists/${artistId}/expenses/${expenseId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Get finances summary with income and expenses
   */
  async getFinances(
    artistId: string,
    startDate?: string,
    endDate?: string
  ): Promise<FinancesResponse> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiRequest<FinancesResponse>(
      `/api/artists/${artistId}/finances${query}`
    );
  }

  /**
   * Create member payment expenses for a gig split
   * Creates grouped expenses for each member when a gig fee is marked as split
   */
  async createMemberPayments(
    artistId: string,
    eventId: string,
    totalAmount: number,
    memberIds: string[],
    gigTitle: string,
    date: string
  ): Promise<Expense[]> {
    const amountPerMember = totalAmount / memberIds.length;
    const groupId = `member-payment-${eventId}`;

    const expenses = await Promise.all(
      memberIds.map(memberId =>
        this.createExpense(artistId, {
          date,
          amount: amountPerMember,
          category: 'member_payment',
          description: `${gigTitle} - Member Payment`,
          paidBy: memberId,
          relatedEventId: eventId,
          groupId,
        })
      )
    );

    return expenses;
  }

  // ==========================================================================
  // Income Methods
  // ==========================================================================

  /**
   * Get all standalone income entries for an artist with optional date range
   */
  async getIncome(
    artistId: string,
    startDate?: string,
    endDate?: string
  ): Promise<IncomeListResponse> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiRequest<IncomeListResponse>(
      `/api/artists/${artistId}/income${query}`
    );
  }

  /**
   * Create a new standalone income entry for an artist
   */
  async createIncome(
    artistId: string,
    income: CreateIncomeRequest
  ): Promise<Income> {
    return this.apiRequest<Income>(`/api/artists/${artistId}/income`, {
      method: 'POST',
      body: JSON.stringify(income),
    });
  }

  /**
   * Delete a standalone income entry
   */
  async deleteIncome(artistId: string, incomeId: string): Promise<void> {
    await this.apiRequest<{ success: boolean }>(
      `/api/artists/${artistId}/income/${incomeId}`,
      { method: 'DELETE' }
    );
  }
}

export const expensesService = new ExpensesService();
