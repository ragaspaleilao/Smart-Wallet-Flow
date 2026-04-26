import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  accountsApi,
  transactionsApi,
  transfersApi,
  creditCardsApi,
  creditPurchasesApi,
  creditPaymentsApi,
  goalsApi,
  investmentsApi,
  vehiclesApi,
  subscriptionsApi,
  simulationsApi,
  categoriesApi,
  budgetApi,
  businessProductsApi,
  businessSettingsApi,
  backupsApi,
  referralsApi,
  calendarSettingsApi,
  type Backup,
  type CreateBackupInput,
  type Referral,
  type CreateReferralInput,
  type UpdateReferralInput,
  type CalendarSettings,
  type UpsertCalendarSettingsInput,
  getUserId,
  type Account,
  type CreateAccountInput,
  type Transaction,
  type CreateTransactionInput,
  type CreateTransferInput,
  type CreditCard,
  type CreateCreditCardInput,
  type CreditPurchase,
  type CreateCreditPurchaseInput,
  type CreditPayment,
  type CreateCreditPaymentInput,
  type Goal,
  type CreateGoalInput,
  type Investment,
  type CreateInvestmentInput,
  type Vehicle,
  type CreateVehicleInput,
  type Subscription,
  type CreateSubscriptionInput,
  type Simulation,
  type CreateSimulationInput,
  type Category,
  type CreateCategoryInput,
  type Budget,
  type UpdateBudgetInput,
  type BusinessProduct,
  type CreateBusinessProductInput,
  type BusinessSettings,
} from '@/lib/api';

// ===== ACCOUNTS =====

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.list,
    enabled: !!getUserId(),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAccountInput) => accountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) => 
      accountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// ===== TRANSACTIONS =====

export function useTransactions(filters?: { accountId?: string; type?: string }) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionsApi.list(filters),
    enabled: !!getUserId(),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionInput) => transactionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) => 
      transactionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransferInput) => transfersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// ===== CREDIT CARDS =====

export function useCreditCards() {
  return useQuery({
    queryKey: ['creditCards'],
    queryFn: creditCardsApi.list,
    enabled: !!getUserId(),
  });
}

export function useCreateCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCreditCardInput) => creditCardsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
    },
  });
}

export function useUpdateCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreditCard> }) => 
      creditCardsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
    },
  });
}

export function useDeleteCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => creditCardsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
    },
  });
}

// ===== CREDIT PURCHASES =====

export function useCreditPurchases(cardId?: string) {
  return useQuery({
    queryKey: ['creditPurchases', cardId],
    queryFn: () => creditPurchasesApi.list(cardId),
    enabled: !!getUserId(),
  });
}

export function useCreateCreditPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCreditPurchaseInput) => creditPurchasesApi.create(data),
    onSuccess: (newPurchase) => {
      queryClient.setQueryData(['creditPurchases', undefined], (old: any[]) =>
        old ? [...old, newPurchase] : [newPurchase]
      );
      queryClient.invalidateQueries({ queryKey: ['creditPurchases'] });
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
    },
  });
}

export function useUpdateCreditPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreditPurchase> }) => 
      creditPurchasesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['creditPurchases'] });
      const previous = queryClient.getQueryData(['creditPurchases', undefined]);
      queryClient.setQueryData(['creditPurchases', undefined], (old: any[]) =>
        old ? old.map(p => p.id === id ? { ...p, ...data } : p) : old
      );
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(['creditPurchases', undefined], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditPurchases'] });
    },
  });
}

export function useDeleteCreditPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => creditPurchasesApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['creditPurchases'] });
      const previous = queryClient.getQueryData(['creditPurchases', undefined]);
      queryClient.setQueryData(['creditPurchases', undefined], (old: any[]) =>
        old ? old.filter(p => p.id !== id) : old
      );
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(['creditPurchases', undefined], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditPurchases'] });
    },
  });
}

// ===== CREDIT PAYMENTS =====

export function useCreditPayments(cardId?: string) {
  return useQuery({
    queryKey: ['creditPayments', cardId],
    queryFn: () => creditPaymentsApi.list(cardId),
    enabled: !!getUserId(),
  });
}

export function useCreateCreditPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCreditPaymentInput) => creditPaymentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditPayments'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// ===== GOALS =====

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
    enabled: !!getUserId(),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalInput) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Goal> }) => 
      goalsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

// ===== INVESTMENTS =====

export function useInvestments() {
  return useQuery({
    queryKey: ['investments'],
    queryFn: investmentsApi.list,
    enabled: !!getUserId(),
  });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvestmentInput) => investmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });
}

export function useUpdateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Investment> }) => 
      investmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => investmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });
}

// ===== VEHICLES =====

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.list,
    enabled: !!getUserId(),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVehicleInput) => vehiclesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) => 
      vehiclesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehiclesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

// ===== SUBSCRIPTIONS =====

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: subscriptionsApi.list,
    enabled: !!getUserId(),
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSubscriptionInput) => subscriptionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Subscription> }) => 
      subscriptionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

// ===== SIMULATIONS =====

export function useSimulations() {
  return useQuery({
    queryKey: ['simulations'],
    queryFn: simulationsApi.list,
    enabled: !!getUserId(),
  });
}

export function useCreateSimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSimulationInput) => simulationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] });
    },
  });
}

export function useUpdateSimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Simulation> }) => 
      simulationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] });
    },
  });
}

export function useDeleteSimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => simulationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] });
    },
  });
}

// ===== CATEGORIES =====

export function useCategories(type?: string) {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: () => categoriesApi.list(type),
    enabled: !!getUserId(),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryInput) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ===== BUDGET =====

export function useBudget() {
  return useQuery({
    queryKey: ['budget'],
    queryFn: budgetApi.get,
    enabled: !!getUserId(),
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBudgetInput) => budgetApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
  });
}

// ===== BUSINESS PRODUCTS =====

export function useBusinessProducts() {
  return useQuery({
    queryKey: ['businessProducts'],
    queryFn: businessProductsApi.list,
    enabled: !!getUserId(),
  });
}

export function useCreateBusinessProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBusinessProductInput) => businessProductsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProducts'] });
    },
  });
}

export function useUpdateBusinessProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BusinessProduct> }) => 
      businessProductsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProducts'] });
    },
  });
}

export function useDeleteBusinessProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => businessProductsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProducts'] });
    },
  });
}

// ===== BUSINESS SETTINGS =====

export function useBusinessSettings() {
  return useQuery({
    queryKey: ['businessSettings'],
    queryFn: businessSettingsApi.get,
    enabled: !!getUserId(),
  });
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BusinessSettings) => businessSettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessSettings'] });
    },
  });
}

// ===== COMPUTED VALUES =====

export function useDashboardStats() {
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  
  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  const income = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    
  const expense = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
  
  return {
    totalBalance,
    monthlyIncome: income,
    monthlyExpense: expense,
    monthlyNet: income - expense,
  };
}

export function useAccountsWithBalance() {
  const { data: accounts = [], isSuccess, isLoading } = useAccounts();
  const { data: transactions = [] } = useTransactions();

  const accountsWithBalance = accounts.map(acc => {
    const initialBalance = parseFloat(String(acc.initialBalance || acc.balance || '0'));
    const accountIncome = transactions
      .filter(t => t.accountId === acc.id && t.type === 'income' && t.status === 'paid')
      .reduce((sum, t) => sum + parseFloat(String(t.amount || '0')), 0);
    const accountExpenses = transactions
      .filter(t => t.accountId === acc.id && t.type === 'expense' && t.status === 'paid')
      .reduce((sum, t) => sum + parseFloat(String(t.amount || '0')), 0);
    return {
      ...acc,
      balance: String(initialBalance + accountIncome - accountExpenses),
      dynamicBalance: initialBalance + accountIncome - accountExpenses,
    };
  });

  return { data: accountsWithBalance, isSuccess, isLoading };
}

// ===== BACKUPS =====

export function useBackups() {
  return useQuery({
    queryKey: ['backups'],
    queryFn: backupsApi.list,
    enabled: !!getUserId(),
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBackupInput) => backupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}

export function useDeleteBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}

// ===== REFERRALS =====

export function useReferrals() {
  return useQuery({
    queryKey: ['referrals'],
    queryFn: referralsApi.list,
    enabled: !!getUserId(),
  });
}

export function useCreateReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReferralInput) => referralsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
}

export function useUpdateReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReferralInput }) => referralsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
}

export function useDeleteReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => referralsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
}

// ===== CALENDAR SETTINGS =====

export function useCalendarSettings() {
  return useQuery({
    queryKey: ['calendarSettings'],
    queryFn: calendarSettingsApi.get,
    enabled: !!getUserId(),
  });
}

export function useUpdateCalendarSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertCalendarSettingsInput) => calendarSettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarSettings'] });
    },
  });
}

// ===== CREDIT PAYMENTS UPDATE/DELETE =====

export function useUpdateCreditPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCreditPaymentInput> }) => creditPaymentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditPayments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteCreditPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => creditPaymentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditPayments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
