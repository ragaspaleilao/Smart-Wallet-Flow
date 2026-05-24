import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { extractTransactionFromImage, extractMultipleTransactions, extractCreditCardInvoice, transcribeVoiceCommand, RateLimitError } from "./ocr";
import { processAiChat } from "./ai-chat";
import { checkConnection, getCalendarList, createAllDayEvent, listEvents, getUserEmail } from "./google-calendar";
import type { Transaction, CreditPurchase } from "@shared/schema";

// Helper function to sync a transaction to Google Calendar (fire-and-forget)
async function syncTransactionToCalendar(transaction: Transaction) {
  try {
    const isConnected = await checkConnection();
    if (!isConnected) return;
    
    const transactionDate = new Date(transaction.date);
    const now = new Date();
    
    // Only sync future transactions
    if (transactionDate >= now) {
      await createAllDayEvent('primary', {
        summary: `💰 ${transaction.type === 'expense' ? '📤' : '📥'} ${transaction.description}`,
        description: `Valor: R$ ${transaction.amount}\nCategoria: ${transaction.category}\nTipo: ${transaction.type === 'expense' ? 'Despesa' : 'Receita'}`,
        date: transactionDate,
        colorId: transaction.type === 'expense' ? '11' : '10',
      });
    }
  } catch (error) {
    // Silent fail - don't break the main operation
    console.log('Calendar sync skipped:', error);
  }
}

// Helper function to sync credit purchase to Google Calendar
async function syncCreditPurchaseToCalendar(purchase: CreditPurchase) {
  try {
    const isConnected = await checkConnection();
    if (!isConnected) return;
    
    const purchaseDate = new Date(purchase.purchaseDate);
    
    await createAllDayEvent('primary', {
      summary: `💳 ${purchase.description}`,
      description: `Valor: R$ ${purchase.totalAmount}\nCategoria: ${purchase.category}\nParcelas: ${purchase.installments}x`,
      date: purchaseDate,
      colorId: '6', // Orange for credit
    });
  } catch (error) {
    console.log('Calendar sync skipped:', error);
  }
}

import {
  insertAccountSchema,
  insertTransactionSchema,
  insertCreditCardSchema,
  insertCreditPurchaseSchema,
  insertCreditPaymentSchema,
  insertGoalSchema,
  insertInvestmentSchema,
  insertVehicleSchema,
  insertSubscriptionSchema,
  insertSimulationSchema,
  insertBusinessProductSchema,
  insertCategorySchema,
  insertBudgetSchema,
  insertBackupSchema,
  insertReferralSchema,
  updateReferralSchema,
  insertCalendarSettingsSchema,
  updateCreditPaymentSchema,
  updateAccountSchema,
  updateCreditCardSchema,
  updateGoalSchema,
  updateInvestmentSchema,
  updateVehicleSchema,
  updateSubscriptionSchema,
  updateSimulationSchema,
} from "@shared/schema";

interface AuthRequest extends Request {
  userId?: string;
}

async function authMiddleware(req: AuthRequest, res: Response, next: Function) {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.userId = userId;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ===== ACCOUNT ROUTES =====
  
  app.get('/api/accounts', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const accounts = await storage.getAccounts(req.userId!);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  });

  app.post('/api/accounts', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(req.userId!, data);
      res.status(201).json(account);
    } catch (error) {
      res.status(400).json({ error: 'Invalid account data' });
    }
  });

  app.patch('/api/accounts/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const data = updateAccountSchema.parse(req.body);
      const account = await storage.updateAccount(id, req.userId!, data);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json(account);
    } catch (error: any) {
      res.status(400).json({ error: 'Invalid account data', details: error?.message });
    }
  });

  app.delete('/api/accounts/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteAccount(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete account' });
    }
  });

  // ===== TRANSACTION ROUTES =====
  
  app.get('/api/transactions', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const filters: { accountId?: string; type?: string; startDate?: Date; endDate?: Date } = {
        accountId: req.query.accountId as string | undefined,
        type: req.query.type as string | undefined,
      };
      if (req.query.startDate) {
        const d = new Date(req.query.startDate as string);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'startDate inválido' });
        filters.startDate = d;
      }
      if (req.query.endDate) {
        const d = new Date(req.query.endDate as string);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'endDate inválido' });
        filters.endDate = d;
      }
      const transactions = await storage.getTransactions(req.userId!, filters);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/transactions', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(req.userId!, data);
      
      // Auto-sync to Google Calendar (fire-and-forget)
      syncTransactionToCalendar(transaction);
      
      res.status(201).json(transaction);
    } catch (error: any) {
      console.error('Transaction validation error:', error);
      res.status(400).json({ error: 'Invalid transaction data', details: error.message || error });
    }
  });

  app.patch('/api/transactions/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const body = req.body;
      const allowedFields = ['description', 'amount', 'category', 'type', 'accountId', 'date', 'status', 'paymentMethod', 'creditCardId', 'vehicleId', 'tags', 'notes', 'isPersonal'];
      const updates: Record<string, any> = {};
      for (const key of allowedFields) {
        if (body[key] !== undefined) {
          updates[key] = body[key];
        }
      }
      if (updates.date) {
        const parsed = new Date(updates.date);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ error: 'Invalid date format' });
        }
        updates.date = parsed;
      }
      if (updates.amount !== undefined) {
        updates.amount = String(updates.amount);
      }
      const transaction = await storage.updateTransaction(id, req.userId!, updates);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(transaction);
    } catch (error: any) {
      console.error('Transaction update error:', error);
      res.status(400).json({ error: 'Failed to update transaction' });
    }
  });

  app.delete('/api/transactions/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteTransaction(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete transaction' });
    }
  });

  // ===== TRANSFER ROUTE =====

  app.post('/api/transfers', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { fromAccountId, toAccountId, amount, description, date } = req.body;

      if (!fromAccountId || !toAccountId || !amount || !date) {
        return res.status(400).json({ error: 'fromAccountId, toAccountId, amount e date são obrigatórios' });
      }

      if (fromAccountId === toAccountId) {
        return res.status(400).json({ error: 'As contas de origem e destino devem ser diferentes' });
      }

      const [fromAccount, toAccount] = await Promise.all([
        storage.getAccount(fromAccountId, req.userId!),
        storage.getAccount(toAccountId, req.userId!),
      ]);
      if (!fromAccount) return res.status(400).json({ error: 'Conta de origem não encontrada' });
      if (!toAccount) return res.status(400).json({ error: 'Conta de destino não encontrada' });

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Data inválida' });
      }

      const desc = description || 'Transferência';

      const [outgoing, incoming] = await Promise.all([
        storage.createTransaction(req.userId!, {
          accountId: fromAccountId,
          amount: String(amount),
          type: 'expense',
          category: 'Transferência',
          description: `Transferência → ${desc}`,
          date: parsedDate,
          source: 'manual',
          isPersonal: true,
          status: 'paid',
          paymentMethod: 'transfer',
        }),
        storage.createTransaction(req.userId!, {
          accountId: toAccountId,
          amount: String(amount),
          type: 'income',
          category: 'Transferência',
          description: `Transferência ← ${desc}`,
          date: parsedDate,
          source: 'manual',
          isPersonal: true,
          status: 'paid',
          paymentMethod: 'transfer',
        }),
      ]);

      res.status(201).json({ outgoing, incoming });
    } catch (error: any) {
      console.error('Transfer error:', error);
      res.status(400).json({ error: 'Falha ao realizar transferência', details: error.message });
    }
  });

  // ===== CREDIT CARD ROUTES =====
  
  app.get('/api/credit-cards', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const cards = await storage.getCreditCards(req.userId!);
      res.json(cards);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch credit cards' });
    }
  });

  app.post('/api/credit-cards', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertCreditCardSchema.parse(req.body);
      const card = await storage.createCreditCard(req.userId!, data);
      res.status(201).json(card);
    } catch (error: any) {
      console.error('Error creating credit card:', error?.message || error);
      if (error?.errors) {
        console.error('Validation errors:', JSON.stringify(error.errors));
      }
      res.status(400).json({ error: 'Invalid credit card data', details: error?.message || String(error) });
    }
  });

  app.patch('/api/credit-cards/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const data = updateCreditCardSchema.parse(req.body);
      const card = await storage.updateCreditCard(id, req.userId!, data);
      if (!card) {
        return res.status(404).json({ error: 'Credit card not found' });
      }
      res.json(card);
    } catch (error: any) {
      res.status(400).json({ error: 'Invalid credit card data', details: error?.message });
    }
  });

  app.delete('/api/credit-cards/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteCreditCard(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Credit card not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete credit card' });
    }
  });

  // ===== CREDIT PURCHASE ROUTES =====
  
  app.get('/api/credit-purchases', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const cardId = req.query.cardId as string | undefined;
      const purchases = await storage.getCreditPurchases(req.userId!, cardId);
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch credit purchases' });
    }
  });

  app.post('/api/credit-purchases', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertCreditPurchaseSchema.parse(req.body);
      const purchase = await storage.createCreditPurchase(req.userId!, data);
      
      // Auto-sync to Google Calendar (fire-and-forget)
      syncCreditPurchaseToCalendar(purchase);
      
      res.status(201).json(purchase);
    } catch (error: any) {
      console.error('Create credit purchase error:', error);
      const message = error?.issues ? error.issues.map((i: any) => `${i.path?.join('.')}: ${i.message}`).join(', ') : (error?.message || 'Invalid credit purchase data');
      res.status(400).json({ error: message });
    }
  });

  app.patch('/api/credit-purchases/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      // Sanitize the input - remove fields that shouldn't be updated directly
      const { id: _id, userId: _userId, createdAt: _createdAt, updatedAt: _updatedAt, ...updates } = req.body;

      // Verify creditCardId ownership if provided
      if (updates.creditCardId) {
        const card = await storage.getCreditCard(updates.creditCardId, req.userId!);
        if (!card) return res.status(400).json({ error: 'Cartão não pertence ao usuário' });
      }

      // Ensure numeric fields are strings for decimal columns
      if (updates.totalAmount !== undefined) {
        updates.totalAmount = String(updates.totalAmount);
      }
      if (updates.installmentValue !== undefined) {
        updates.installmentValue = String(updates.installmentValue);
      }

      // Convert date string to Date object
      if (updates.purchaseDate !== undefined) {
        updates.purchaseDate = new Date(updates.purchaseDate);
      }

      const purchase = await storage.updateCreditPurchase(id, req.userId!, updates);
      if (!purchase) {
        return res.status(404).json({ error: 'Credit purchase not found' });
      }
      res.json(purchase);
    } catch (error: any) {
      console.error('Update credit purchase error:', error);
      res.status(400).json({ error: 'Failed to update credit purchase', details: error.message });
    }
  });

  app.delete('/api/credit-purchases/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteCreditPurchase(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Credit purchase not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete credit purchase' });
    }
  });

  // ===== CREDIT PAYMENT ROUTES =====
  
  app.get('/api/credit-payments', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const cardId = req.query.cardId as string | undefined;
      const payments = await storage.getCreditPayments(req.userId!, cardId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch credit payments' });
    }
  });

  app.post('/api/credit-payments', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertCreditPaymentSchema.parse(req.body);

      // Security: ensure the credit card and account belong to this user
      const card = await storage.getCreditCard(data.creditCardId, req.userId!);
      if (!card) {
        return res.status(400).json({ error: 'Cartão não pertence ao usuário' });
      }
      const account = await storage.getAccount(data.accountId, req.userId!);
      if (!account) {
        return res.status(400).json({ error: 'Conta não pertence ao usuário' });
      }

      const payment = await storage.createCreditPayment(req.userId!, data);

      const cardName = card?.name || 'Cartão';
      const paymentAmount = parseFloat(String(data.amount));
      if (paymentAmount > 0 && data.accountId) {
        try {
          await storage.createTransaction(req.userId!, {
            accountId: data.accountId,
            amount: String(paymentAmount),
            type: 'expense',
            category: 'Cartão de Crédito',
            description: `Pagamento fatura ${cardName} #${payment.id.slice(0, 8)}`,
            date: data.paymentDate,
            source: 'manual',
            isPersonal: true,
            status: 'paid',
            paymentMethod: 'transfer',
            creditCardId: data.creditCardId,
          });
        } catch (txError) {
          // Roll back the payment record so books stay consistent
          await storage.deleteCreditPayment(payment.id, req.userId!).catch(() => {});
          throw txError;
        }
      }

      res.status(201).json(payment);
    } catch (error: any) {
      console.error('Create credit payment error:', error);
      res.status(400).json({ error: 'Invalid credit payment data', details: error?.message });
    }
  });

  app.patch('/api/credit-payments/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const data = updateCreditPaymentSchema.parse(req.body);

      const existing = await storage.getCreditPayment(id, req.userId!);
      if (!existing) {
        return res.status(404).json({ error: 'Credit payment not found' });
      }

      // If accountId changes, validate ownership
      if (data.accountId && data.accountId !== existing.accountId) {
        const acc = await storage.getAccount(data.accountId, req.userId!);
        if (!acc) {
          return res.status(400).json({ error: 'Conta não pertence ao usuário' });
        }
      }

      const updated = await storage.updateCreditPayment(id, req.userId!, data as any);
      if (!updated) {
        return res.status(404).json({ error: 'Credit payment not found' });
      }

      // Sync the linked transaction (look up by description tag we set on create)
      const card = await storage.getCreditCard(existing.creditCardId, req.userId!);
      const cardName = card?.name || 'Cartão';
      const tag = `Pagamento fatura ${cardName} #${existing.id.slice(0, 8)}`;
      const userTransactions = await storage.getTransactions(req.userId!);
      const linked = userTransactions.find(t => t.description === tag);
      if (linked) {
        const txUpdates: Record<string, any> = {};
        if (data.amount !== undefined) txUpdates.amount = String(data.amount);
        if (data.paymentDate !== undefined) txUpdates.date = data.paymentDate;
        if (data.accountId !== undefined) txUpdates.accountId = data.accountId;
        if (Object.keys(txUpdates).length > 0) {
          await storage.updateTransaction(linked.id, req.userId!, txUpdates);
        }
      }

      res.json(updated);
    } catch (error: any) {
      console.error('Update credit payment error:', error);
      res.status(400).json({ error: 'Failed to update credit payment', details: error?.message });
    }
  });

  app.delete('/api/credit-payments/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const existing = await storage.getCreditPayment(id, req.userId!);
      if (!existing) {
        return res.status(404).json({ error: 'Credit payment not found' });
      }

      // Remove the linked transaction if it exists
      const card = await storage.getCreditCard(existing.creditCardId, req.userId!);
      const cardName = card?.name || 'Cartão';
      const tag = `Pagamento fatura ${cardName} #${existing.id.slice(0, 8)}`;
      const userTransactions = await storage.getTransactions(req.userId!);
      const linked = userTransactions.find(t => t.description === tag);
      if (linked) {
        await storage.deleteTransaction(linked.id, req.userId!);
      }

      const deleted = await storage.deleteCreditPayment(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Credit payment not found' });
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Delete credit payment error:', error);
      res.status(400).json({ error: 'Failed to delete credit payment' });
    }
  });

  // ===== GOAL ROUTES =====
  
  app.get('/api/goals', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const goals = await storage.getGoals(req.userId!);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch goals' });
    }
  });

  app.post('/api/goals', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertGoalSchema.parse(req.body);
      const goal = await storage.createGoal(req.userId!, data);
      res.status(201).json(goal);
    } catch (error) {
      res.status(400).json({ error: 'Invalid goal data' });
    }
  });

  app.patch('/api/goals/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const data = updateGoalSchema.parse(req.body);
      const goal = await storage.updateGoal(id, req.userId!, data);
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      res.json(goal);
    } catch (error: any) {
      res.status(400).json({ error: 'Invalid goal data', details: error?.message });
    }
  });

  app.delete('/api/goals/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteGoal(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete goal' });
    }
  });

  // ===== INVESTMENT ROUTES =====
  
  app.get('/api/investments', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const investments = await storage.getInvestments(req.userId!);
      res.json(investments);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch investments' });
    }
  });

  app.post('/api/investments', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertInvestmentSchema.parse(req.body);
      const investment = await storage.createInvestment(req.userId!, data);
      res.status(201).json(investment);
    } catch (error) {
      res.status(400).json({ error: 'Invalid investment data' });
    }
  });

  app.patch('/api/investments/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const data = updateInvestmentSchema.parse(req.body);
      const investment = await storage.updateInvestment(id, req.userId!, data);
      if (!investment) {
        return res.status(404).json({ error: 'Investment not found' });
      }
      res.json(investment);
    } catch (error: any) {
      res.status(400).json({ error: 'Invalid investment data', details: error?.message });
    }
  });

  app.delete('/api/investments/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteInvestment(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Investment not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete investment' });
    }
  });

  // ===== VEHICLE ROUTES =====
  
  app.get('/api/vehicles', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const vehicles = await storage.getVehicles(req.userId!);
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
  });

  app.post('/api/vehicles', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(req.userId!, data);
      res.status(201).json(vehicle);
    } catch (error) {
      res.status(400).json({ error: 'Invalid vehicle data' });
    }
  });

  app.patch('/api/vehicles/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const data = updateVehicleSchema.parse(req.body);
      const vehicle = await storage.updateVehicle(id, req.userId!, data);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error: any) {
      res.status(400).json({ error: 'Invalid vehicle data', details: error?.message });
    }
  });

  app.delete('/api/vehicles/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteVehicle(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete vehicle' });
    }
  });

  // ===== SUBSCRIPTION ROUTES =====
  
  app.get('/api/subscriptions', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const subscriptions = await storage.getSubscriptions(req.userId!);
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
  });

  app.post('/api/subscriptions', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertSubscriptionSchema.parse(req.body);
      const subscription = await storage.createSubscription(req.userId!, data);
      res.status(201).json(subscription);
    } catch (error) {
      res.status(400).json({ error: 'Invalid subscription data' });
    }
  });

  app.patch('/api/subscriptions/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const data = updateSubscriptionSchema.parse(req.body);
      const subscription = await storage.updateSubscription(id, req.userId!, data);
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      res.json(subscription);
    } catch (error: any) {
      res.status(400).json({ error: 'Invalid subscription data', details: error?.message });
    }
  });

  app.delete('/api/subscriptions/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteSubscription(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete subscription' });
    }
  });

  // ===== SIMULATION ROUTES =====
  
  app.get('/api/simulations', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const simulations = await storage.getSimulations(req.userId!);
      res.json(simulations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch simulations' });
    }
  });

  app.post('/api/simulations', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertSimulationSchema.parse(req.body);
      const simulation = await storage.createSimulation(req.userId!, data);
      res.status(201).json(simulation);
    } catch (error) {
      res.status(400).json({ error: 'Invalid simulation data' });
    }
  });

  app.patch('/api/simulations/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const data = updateSimulationSchema.parse(req.body);
      const simulation = await storage.updateSimulation(id, req.userId!, data);
      if (!simulation) {
        return res.status(404).json({ error: 'Simulation not found' });
      }
      res.json(simulation);
    } catch (error: any) {
      res.status(400).json({ error: 'Invalid simulation data', details: error?.message });
    }
  });

  app.delete('/api/simulations/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteSimulation(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Simulation not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete simulation' });
    }
  });

  // ===== BUSINESS PRODUCT ROUTES =====
  
  app.get('/api/business/products', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const products = await storage.getBusinessProducts(req.userId!);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch business products' });
    }
  });

  app.post('/api/business/products', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertBusinessProductSchema.parse(req.body);
      const product = await storage.createBusinessProduct(req.userId!, data);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: 'Invalid business product data' });
    }
  });

  app.patch('/api/business/products/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const allowed = ['name', 'category', 'sellingPrice', 'averageMonthlySales', 'directCosts'];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (updates.sellingPrice !== undefined) updates.sellingPrice = String(updates.sellingPrice);
      if (updates.averageMonthlySales !== undefined) updates.averageMonthlySales = String(updates.averageMonthlySales);
      const product = await storage.updateBusinessProduct(id, req.userId!, updates);
      if (!product) {
        return res.status(404).json({ error: 'Business product not found' });
      }
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update business product' });
    }
  });

  app.delete('/api/business/products/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteBusinessProduct(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Business product not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete business product' });
    }
  });

  // ===== BUSINESS SETTINGS ROUTES =====
  
  app.get('/api/business/settings', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const settings = await storage.getBusinessSettings(req.userId!);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch business settings' });
    }
  });

  app.put('/api/business/settings', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const allowed = ['monthlyFixedCosts', 'monthlyGoal', 'taxRate', 'fixedCosts'];
      const sanitized: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) sanitized[key] = req.body[key];
      }
      const settings = await storage.updateBusinessSettings(req.userId!, sanitized);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update business settings' });
    }
  });

  // ===== CATEGORY ROUTES =====
  
  app.get('/api/categories', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const type = req.query.type as string | undefined;
      const categories = await storage.getCategories(req.userId!, type);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  app.post('/api/categories', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(req.userId!, data);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ error: 'Invalid category data' });
    }
  });

  app.delete('/api/categories/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteCategory(id, req.userId!);
      if (!deleted) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete category' });
    }
  });

  // ===== BUDGET ROUTES =====
  
  app.get('/api/budget', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const budget = await storage.getBudget(req.userId!);
      res.json(budget || { income: 0, spendingLimit: 0, creditLimit: 0, alertThresholds: [70, 90] });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch budget' });
    }
  });

  app.put('/api/budget', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertBudgetSchema.parse(req.body);
      const budget = await storage.upsertBudget(req.userId!, data);
      res.json(budget);
    } catch (error) {
      res.status(400).json({ error: 'Invalid budget data' });
    }
  });

  // ===== AI ROUTES (OCR & VOICE) =====
  
  app.post('/api/ocr', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { image, mimeType } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: 'Image data is required' });
      }
      
      const result = await extractTransactionFromImage(image, mimeType || 'image/jpeg');
      res.json(result);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return res.status(429).json({ error: 'rate_limit', message: error.message });
      }
      console.error('OCR error:', error);
      res.status(500).json({ error: 'Failed to process image' });
    }
  });
  
  app.post('/api/ocr-batch', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { image, mimeType } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: 'Image data is required' });
      }
      
      const result = await extractMultipleTransactions(image, mimeType || 'image/jpeg');
      res.json(result);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return res.status(429).json({ error: 'rate_limit', message: error.message });
      }
      console.error('OCR batch error:', error);
      res.status(500).json({ error: 'Failed to process image' });
    }
  });

  app.post('/api/ocr-credit-invoice', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { image, mimeType } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: 'Image data is required' });
      }
      
      const result = await extractCreditCardInvoice(image, mimeType || 'image/jpeg');
      res.json(result);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return res.status(429).json({ error: 'rate_limit', message: error.message });
      }
      console.error('OCR credit invoice error:', error);
      res.status(500).json({ error: 'Failed to process image' });
    }
  });

  app.post('/api/voice', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { audio, mimeType } = req.body;
      
      if (!audio) {
        return res.status(400).json({ error: 'Audio data is required' });
      }
      
      const result = await transcribeVoiceCommand(audio, mimeType || 'audio/webm');
      res.json(result);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return res.status(429).json({ error: 'rate_limit', message: error.message });
      }
      console.error('Voice transcription error:', error);
      res.status(500).json({ error: 'Failed to process audio' });
    }
  });

  // AI Chat - Mentor Financeiro
  app.post('/api/ai-chat', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { message, history } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const response = await processAiChat(
        req.userId!,
        message,
        history || []
      );

      res.json({ response });
    } catch (error) {
      console.error('AI Chat error:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  });

  // Reset all user data
  app.post('/api/reset-data', authMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.resetAllData(req.userId!);
      res.json({ success: true, message: 'Todos os dados foram apagados' });
    } catch (error) {
      console.error('Reset data error:', error);
      res.status(500).json({ error: 'Failed to reset data' });
    }
  });

  // ===== GOOGLE CALENDAR ROUTES =====

  app.get('/api/calendar/status', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const isConnected = await checkConnection();
      const email = isConnected ? await getUserEmail() : null;
      res.json({ isConnected, email });
    } catch (error) {
      res.json({ isConnected: false, email: null });
    }
  });

  app.get('/api/calendar/calendars', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const calendars = await getCalendarList();
      res.json(calendars);
    } catch (error) {
      console.error('Calendar list error:', error);
      res.status(500).json({ error: 'Failed to fetch calendars' });
    }
  });

  app.get('/api/calendar/events', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { calendarId, timeMin, timeMax } = req.query;
      let parsedMin: Date | undefined;
      let parsedMax: Date | undefined;
      if (timeMin) {
        parsedMin = new Date(timeMin as string);
        if (isNaN(parsedMin.getTime())) return res.status(400).json({ error: 'timeMin inválido' });
      }
      if (timeMax) {
        parsedMax = new Date(timeMax as string);
        if (isNaN(parsedMax.getTime())) return res.status(400).json({ error: 'timeMax inválido' });
      }
      const events = await listEvents(
        calendarId as string || 'primary',
        parsedMin,
        parsedMax
      );
      res.json(events);
    } catch (error) {
      console.error('Calendar events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  app.post('/api/calendar/sync-transactions', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { calendarId, categories } = req.body;
      const transactions = await storage.getTransactions(req.userId!);
      
      const now = new Date();
      const futureTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date >= now && (categories?.length === 0 || categories?.includes(t.category));
      });

      const results = [];
      for (const t of futureTransactions) {
        try {
          const event = await createAllDayEvent(calendarId || 'primary', {
            summary: `💰 ${t.type === 'expense' ? '📤' : '📥'} ${t.description}`,
            description: `Valor: R$ ${t.amount}\nCategoria: ${t.category}\nTipo: ${t.type === 'expense' ? 'Despesa' : 'Receita'}`,
            date: new Date(t.date),
            colorId: t.type === 'expense' ? '11' : '10', // Red for expense, green for income
          });
          results.push({ transactionId: t.id, eventId: event.id, success: true });
        } catch (e: any) {
          results.push({ transactionId: t.id, success: false, error: e.message });
        }
      }

      res.json({ 
        synced: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      });
    } catch (error) {
      console.error('Sync transactions error:', error);
      res.status(500).json({ error: 'Failed to sync transactions' });
    }
  });

  app.post('/api/calendar/sync-credit-cards', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { calendarId } = req.body;
      const creditCards = await storage.getCreditCards(req.userId!);
      
      const results = [];
      const now = new Date();
      
      for (const card of creditCards) {
        for (let i = 0; i < 6; i++) {
          const dueDate = new Date(now.getFullYear(), now.getMonth() + i, card.dueDay);
          if (dueDate > now) {
            try {
              const event = await createAllDayEvent(calendarId || 'primary', {
                summary: `💳 Vencimento: ${card.name}`,
                description: `Cartão de crédito ${card.name}\nLimite: R$ ${card.creditLimit}`,
                date: dueDate,
                colorId: '6', // Orange
              });
              results.push({ cardId: card.id, month: i, eventId: event.id, success: true });
            } catch (e: any) {
              results.push({ cardId: card.id, month: i, success: false, error: e.message });
            }
          }
        }
      }

      res.json({ 
        synced: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      });
    } catch (error) {
      console.error('Sync credit cards error:', error);
      res.status(500).json({ error: 'Failed to sync credit cards' });
    }
  });

  // ===== BACKUPS =====

  app.get('/api/backups', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const backups = await storage.getBackups(req.userId!);
      res.json(backups);
    } catch (error) {
      console.error('Get backups error:', error);
      res.status(500).json({ error: 'Failed to fetch backups' });
    }
  });

  app.post('/api/backups', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertBackupSchema.parse(req.body);
      const backup = await storage.createBackup(req.userId!, {
        size: data.size,
        device: data.device,
        auto: data.auto ?? false,
        date: data.date ? new Date(data.date as any) : undefined,
      });
      res.status(201).json(backup);
    } catch (error: any) {
      console.error('Create backup error:', error);
      res.status(400).json({ error: 'Invalid backup data', details: error?.message });
    }
  });

  app.delete('/api/backups/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const ok = await storage.deleteBackup(String(req.params.id), req.userId!);
      if (!ok) return res.status(404).json({ error: 'Backup not found' });
      res.status(204).send();
    } catch (error) {
      console.error('Delete backup error:', error);
      res.status(400).json({ error: 'Failed to delete backup' });
    }
  });

  // ===== REFERRALS =====

  app.get('/api/referrals', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const referrals = await storage.getReferrals(req.userId!);
      res.json(referrals);
    } catch (error) {
      console.error('Get referrals error:', error);
      res.status(500).json({ error: 'Failed to fetch referrals' });
    }
  });

  app.post('/api/referrals', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertReferralSchema.parse(req.body);
      const referral = await storage.createReferral(req.userId!, {
        name: data.name,
        status: (data.status as 'pending' | 'confirmed') ?? 'pending',
      });
      res.status(201).json(referral);
    } catch (error: any) {
      console.error('Create referral error:', error);
      res.status(400).json({ error: 'Invalid referral data', details: error?.message });
    }
  });

  app.patch('/api/referrals/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = updateReferralSchema.parse(req.body);
      const updated = await storage.updateReferral(String(req.params.id), req.userId!, {
        name: data.name,
        status: data.status as 'pending' | 'confirmed' | undefined,
      });
      if (!updated) return res.status(404).json({ error: 'Referral not found' });
      res.json(updated);
    } catch (error: any) {
      console.error('Update referral error:', error);
      res.status(400).json({ error: 'Failed to update referral', details: error?.message });
    }
  });

  app.delete('/api/referrals/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const ok = await storage.deleteReferral(String(req.params.id), req.userId!);
      if (!ok) return res.status(404).json({ error: 'Referral not found' });
      res.status(204).send();
    } catch (error) {
      console.error('Delete referral error:', error);
      res.status(400).json({ error: 'Failed to delete referral' });
    }
  });

  // ===== CALENDAR SETTINGS =====

  app.get('/api/calendar-settings', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const settings = await storage.getCalendarSettings(req.userId!);
      res.json(settings ?? null);
    } catch (error) {
      console.error('Get calendar settings error:', error);
      res.status(500).json({ error: 'Failed to fetch calendar settings' });
    }
  });

  app.put('/api/calendar-settings', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertCalendarSettingsSchema.parse(req.body);
      const settings = await storage.upsertCalendarSettings(req.userId!, data as any);
      res.json(settings);
    } catch (error: any) {
      console.error('Upsert calendar settings error:', error);
      res.status(400).json({ error: 'Invalid calendar settings', details: error?.message });
    }
  });

  return httpServer;
}
