const API_BASE = '/api';

let currentUserId: string | null = null;

export function setUserId(userId: string) {
  currentUserId = userId;
  localStorage.setItem('finsmart-user-id', userId);
}

export function getUserId(): string | null {
  if (!currentUserId) {
    currentUserId = localStorage.getItem('finsmart-user-id');
  }
  return currentUserId;
}

export function clearUserId() {
  currentUserId = null;
  localStorage.removeItem('finsmart-user-id');
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const userId = getUserId();
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// ===== ACCOUNTS =====

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: string;
  balance: string;
  initialBalance: string;
  color: string;
  isPersonal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  name: string;
  type: string;
  balance: string;
  initialBalance: string;
  color: string;
  isPersonal: boolean;
}

export const accountsApi = {
  list: () => apiRequest<Account[]>('/accounts'),
  create: (data: CreateAccountInput) => apiRequest<Account>('/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Account>) => apiRequest<Account>(`/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/accounts/${id}`, {
    method: 'DELETE',
  }),
};

// ===== TRANSACTIONS =====

export interface Transaction {
  id: string;
  userId: string;
  accountId: string | null;
  amount: string;
  type: string;
  category: string;
  description: string;
  date: string;
  source: string;
  isPersonal: boolean;
  status: string;
  paymentMethod: string | null;
  creditCardId: string | null;
  vehicleId: string | null;
  tags: string[] | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionInput {
  accountId?: string;
  amount: string;
  type: string;
  category: string;
  description: string;
  date: string;
  source: string;
  isPersonal: boolean;
  status?: string;
  paymentMethod?: string;
  creditCardId?: string;
  vehicleId?: string;
  tags?: string[];
  notes?: string;
}

export const transactionsApi = {
  list: (filters?: { accountId?: string; type?: string }) => {
    const params = new URLSearchParams();
    if (filters?.accountId) params.append('accountId', filters.accountId);
    if (filters?.type) params.append('type', filters.type);
    const query = params.toString();
    return apiRequest<Transaction[]>(`/transactions${query ? `?${query}` : ''}`);
  },
  create: (data: CreateTransactionInput) => apiRequest<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Transaction>) => apiRequest<Transaction>(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/transactions/${id}`, {
    method: 'DELETE',
  }),
};

// ===== TRANSFERS =====

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  description?: string;
  date: string;
}

export const transfersApi = {
  create: (data: CreateTransferInput) => apiRequest<{ outgoing: Transaction; incoming: Transaction }>('/transfers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// ===== CREDIT CARDS =====

export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  brand: string;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
  linkedAccountId: string | null;
  color: string;
  status: string;
  hasAnnualFee: boolean | null;
  annualFeeValue: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCreditCardInput {
  name: string;
  brand: string;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
  linkedAccountId?: string;
  color: string;
  hasAnnualFee?: boolean;
  annualFeeValue?: string;
}

export const creditCardsApi = {
  list: () => apiRequest<CreditCard[]>('/credit-cards'),
  create: (data: CreateCreditCardInput) => apiRequest<CreditCard>('/credit-cards', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<CreditCard>) => apiRequest<CreditCard>(`/credit-cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/credit-cards/${id}`, {
    method: 'DELETE',
  }),
};

// ===== CREDIT PURCHASES =====

export interface CreditPurchase {
  id: string;
  userId: string;
  creditCardId: string;
  purchaseDate: string;
  totalAmount: string;
  installments: number;
  installmentValue: string;
  category: string;
  description: string;
  status: string;
  refundedAmount: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCreditPurchaseInput {
  creditCardId: string;
  purchaseDate: string;
  totalAmount: string;
  installments: number;
  installmentValue: string;
  category: string;
  description: string;
}

export const creditPurchasesApi = {
  list: (cardId?: string) => {
    const query = cardId ? `?cardId=${cardId}` : '';
    return apiRequest<CreditPurchase[]>(`/credit-purchases${query}`);
  },
  create: (data: CreateCreditPurchaseInput) => apiRequest<CreditPurchase>('/credit-purchases', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<CreditPurchase>) => apiRequest<CreditPurchase>(`/credit-purchases/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/credit-purchases/${id}`, {
    method: 'DELETE',
  }),
};

// ===== CREDIT PAYMENTS =====

export interface CreditPayment {
  id: string;
  userId: string;
  creditCardId: string;
  month: number;
  year: number;
  paymentDate: string;
  amount: string;
  accountId: string;
  type: string;
  createdAt: string;
}

export interface CreateCreditPaymentInput {
  creditCardId: string;
  month: number;
  year: number;
  paymentDate: string;
  amount: string;
  accountId: string;
  type: string;
}

export const creditPaymentsApi = {
  list: (cardId?: string) => {
    const query = cardId ? `?cardId=${cardId}` : '';
    return apiRequest<CreditPayment[]>(`/credit-payments${query}`);
  },
  create: (data: CreateCreditPaymentInput) => apiRequest<CreditPayment>('/credit-payments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<CreateCreditPaymentInput>) => apiRequest<CreditPayment>(`/credit-payments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/credit-payments/${id}`, {
    method: 'DELETE',
  }),
};

// ===== GOALS =====

export interface Goal {
  id: string;
  userId: string;
  name: string;
  target: string;
  current: string;
  color: string;
  linkedAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  name: string;
  target: string;
  current?: string;
  color: string;
  linkedAccountId?: string;
}

export const goalsApi = {
  list: () => apiRequest<Goal[]>('/goals'),
  create: (data: CreateGoalInput) => apiRequest<Goal>('/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Goal>) => apiRequest<Goal>(`/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/goals/${id}`, {
    method: 'DELETE',
  }),
};

// ===== INVESTMENTS =====

export interface Investment {
  id: string;
  userId: string;
  name: string;
  value: string;
  yieldDisplay: string | null;
  yieldRate: string | null;
  startDate: string | null;
  hasTax: boolean | null;
  isPersonal: boolean;
  accountId: string | null;
  lastYieldAppliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvestmentInput {
  name: string;
  value: string;
  yieldDisplay?: string;
  yieldRate?: string;
  startDate?: string;
  hasTax?: boolean;
  isPersonal: boolean;
  accountId?: string;
}

export const investmentsApi = {
  list: () => apiRequest<Investment[]>('/investments'),
  create: (data: CreateInvestmentInput) => apiRequest<Investment>('/investments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Investment>) => apiRequest<Investment>(`/investments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/investments/${id}`, {
    method: 'DELETE',
  }),
};

// ===== VEHICLES =====

export interface VehicleExpense {
  name: string;
  due: string;
  value: number;
  status: 'ok' | 'warning' | 'expired';
}

export interface Vehicle {
  id: string;
  userId: string;
  name: string;
  plate: string;
  expenses: VehicleExpense[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleInput {
  name: string;
  plate: string;
  expenses?: VehicleExpense[];
}

export const vehiclesApi = {
  list: () => apiRequest<Vehicle[]>('/vehicles'),
  create: (data: CreateVehicleInput) => apiRequest<Vehicle>('/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Vehicle>) => apiRequest<Vehicle>(`/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/vehicles/${id}`, {
    method: 'DELETE',
  }),
};

// ===== SUBSCRIPTIONS =====

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  price: string;
  date: string;
  logo: string;
  color: string;
  category: string;
  paymentMethod: string | null;
  accountId: string | null;
  creditCardId: string | null;
  usage: string | null;
  usageLabel: string | null;
  lastUsed: string | null;
  isTrial: boolean | null;
  trialDays: number | null;
  futurePrice: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionInput {
  name: string;
  price: string;
  date: string;
  logo: string;
  color: string;
  category: string;
  paymentMethod?: string;
  accountId?: string;
  creditCardId?: string;
  usage?: string;
  usageLabel?: string;
  isTrial?: boolean;
  trialDays?: number;
  futurePrice?: string;
}

export const subscriptionsApi = {
  list: () => apiRequest<Subscription[]>('/subscriptions'),
  create: (data: CreateSubscriptionInput) => apiRequest<Subscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Subscription>) => apiRequest<Subscription>(`/subscriptions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/subscriptions/${id}`, {
    method: 'DELETE',
  }),
};

// ===== SIMULATIONS =====

export interface Simulation {
  id: string;
  userId: string;
  name: string;
  totalValue: string;
  downPayment: string;
  installments: number;
  startDate: string;
  category: string;
  type: string;
  interestRate: string | null;
  manualInstallmentValue: string | null;
  createdAt: string;
}

export interface CreateSimulationInput {
  name: string;
  totalValue: string;
  downPayment: string;
  installments: number;
  startDate: string;
  category: string;
  type?: string;
  interestRate?: string;
  manualInstallmentValue?: string;
}

export const simulationsApi = {
  list: () => apiRequest<Simulation[]>('/simulations'),
  create: (data: CreateSimulationInput) => apiRequest<Simulation>('/simulations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Simulation>) => apiRequest<Simulation>(`/simulations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/simulations/${id}`, {
    method: 'DELETE',
  }),
};

// ===== CATEGORIES =====

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: string;
  createdAt: string;
}

export interface CreateCategoryInput {
  name: string;
  type: string;
}

export const categoriesApi = {
  list: (type?: string) => {
    const query = type ? `?type=${type}` : '';
    return apiRequest<Category[]>(`/categories${query}`);
  },
  create: (data: CreateCategoryInput) => apiRequest<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/categories/${id}`, {
    method: 'DELETE',
  }),
};

// ===== BUDGET =====

export interface Budget {
  id: string;
  userId: string;
  income: string;
  spendingLimit: string;
  creditLimit: string;
  alertThresholds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBudgetInput {
  income?: string;
  spendingLimit?: string;
  creditLimit?: string;
  alertThresholds?: number[];
}

export const budgetApi = {
  get: () => apiRequest<Budget>('/budget'),
  update: (data: UpdateBudgetInput) => apiRequest<Budget>('/budget', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// ===== BUSINESS =====

export interface BusinessProduct {
  id: string;
  userId: string;
  name: string;
  category: string;
  sellingPrice: string;
  averageMonthlySales: string;
  directCosts: { id: string; name: string; value: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessProductInput {
  name: string;
  category: string;
  sellingPrice: string;
  averageMonthlySales: string;
  directCosts?: { id: string; name: string; value: number }[];
}

export const businessProductsApi = {
  list: () => apiRequest<BusinessProduct[]>('/business/products'),
  create: (data: CreateBusinessProductInput) => apiRequest<BusinessProduct>('/business/products', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<BusinessProduct>) => apiRequest<BusinessProduct>(`/business/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/business/products/${id}`, {
    method: 'DELETE',
  }),
};

export interface BusinessSettings {
  fixedCosts: { id: string; name: string; value: number }[];
}

export const businessSettingsApi = {
  get: () => apiRequest<BusinessSettings>('/business/settings'),
  update: (data: BusinessSettings) => apiRequest<BusinessSettings>('/business/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// ===== BACKUPS =====

export interface Backup {
  id: string;
  userId: string;
  date: string;
  size: string;
  device: string;
  auto: boolean;
  createdAt: string;
}

export interface CreateBackupInput {
  size: string;
  device: string;
  auto?: boolean;
  date?: string;
}

export const backupsApi = {
  list: () => apiRequest<Backup[]>('/backups'),
  create: (data: CreateBackupInput) => apiRequest<Backup>('/backups', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/backups/${id}`, {
    method: 'DELETE',
  }),
};

// ===== REFERRALS =====

export interface Referral {
  id: string;
  userId: string;
  name: string;
  status: 'pending' | 'confirmed';
  date: string;
  createdAt: string;
}

export interface CreateReferralInput {
  name: string;
  status?: 'pending' | 'confirmed';
}

export interface UpdateReferralInput {
  name?: string;
  status?: 'pending' | 'confirmed';
}

export const referralsApi = {
  list: () => apiRequest<Referral[]>('/referrals'),
  create: (data: CreateReferralInput) => apiRequest<Referral>('/referrals', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: UpdateReferralInput) => apiRequest<Referral>(`/referrals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<void>(`/referrals/${id}`, {
    method: 'DELETE',
  }),
};

// ===== CALENDAR SETTINGS =====

export interface CalendarSettings {
  id: string;
  userId: string;
  isEnabled: boolean;
  isConnected: boolean;
  syncCategories: string[];
  reminderDaysBefore: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCalendarSettingsInput {
  isEnabled?: boolean;
  isConnected?: boolean;
  syncCategories?: string[];
  reminderDaysBefore?: number;
}

export const calendarSettingsApi = {
  get: () => apiRequest<CalendarSettings | null>('/calendar-settings'),
  update: (data: UpsertCalendarSettingsInput) => apiRequest<CalendarSettings>('/calendar-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

export const apiClient = apiRequest;
