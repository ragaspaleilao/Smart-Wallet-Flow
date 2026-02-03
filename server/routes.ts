import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { extractTransactionFromImage, transcribeVoiceCommand } from "./ocr";
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
} from "@shared/schema";

interface AuthRequest extends Request {
  userId?: string;
}

async function authMiddleware(req: AuthRequest, res: Response, next: Function) {
  const userId = req.headers['x-user-id'] as string;
  
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
      const account = await storage.updateAccount(id, req.userId!, req.body);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json(account);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update account' });
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
      const filters = {
        accountId: req.query.accountId as string | undefined,
        type: req.query.type as string | undefined,
      };
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
      res.status(201).json(transaction);
    } catch (error: any) {
      console.error('Transaction validation error:', error);
      res.status(400).json({ error: 'Invalid transaction data', details: error.message || error });
    }
  });

  app.patch('/api/transactions/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const transaction = await storage.updateTransaction(id, req.userId!, req.body);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(transaction);
    } catch (error) {
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
    } catch (error) {
      res.status(400).json({ error: 'Invalid credit card data' });
    }
  });

  app.patch('/api/credit-cards/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const card = await storage.updateCreditCard(id, req.userId!, req.body);
      if (!card) {
        return res.status(404).json({ error: 'Credit card not found' });
      }
      res.json(card);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update credit card' });
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
      res.status(201).json(purchase);
    } catch (error) {
      res.status(400).json({ error: 'Invalid credit purchase data' });
    }
  });

  app.patch('/api/credit-purchases/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const purchase = await storage.updateCreditPurchase(id, req.userId!, req.body);
      if (!purchase) {
        return res.status(404).json({ error: 'Credit purchase not found' });
      }
      res.json(purchase);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update credit purchase' });
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
      const payment = await storage.createCreditPayment(req.userId!, data);
      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({ error: 'Invalid credit payment data' });
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
      const goal = await storage.updateGoal(id, req.userId!, req.body);
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      res.json(goal);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update goal' });
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
      const investment = await storage.updateInvestment(id, req.userId!, req.body);
      if (!investment) {
        return res.status(404).json({ error: 'Investment not found' });
      }
      res.json(investment);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update investment' });
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
      const vehicle = await storage.updateVehicle(id, req.userId!, req.body);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update vehicle' });
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
      const subscription = await storage.updateSubscription(id, req.userId!, req.body);
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      res.json(subscription);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update subscription' });
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
      const simulation = await storage.updateSimulation(id, req.userId!, req.body);
      if (!simulation) {
        return res.status(404).json({ error: 'Simulation not found' });
      }
      res.json(simulation);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update simulation' });
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
      const product = await storage.updateBusinessProduct(id, req.userId!, req.body);
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
      const settings = await storage.updateBusinessSettings(req.userId!, req.body);
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
      console.error('OCR error:', error);
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
      console.error('Voice transcription error:', error);
      res.status(500).json({ error: 'Failed to process audio' });
    }
  });

  return httpServer;
}
