# Xô Preguiça - Personal Finance App

## Overview

Xô Preguiça is a personal finance management application designed for mobile-first usage. The app allows users to track expenses and income through multiple input methods: manual entry, voice commands, photo scanning (OCR), and automatic notification reading. It targets both personal finances and small business (MEI) accounting needs, with features including credit card management, budgeting, goals tracking, investments, and AI-powered financial insights.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: Zustand with persist middleware for local storage
- **Data Fetching**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Charts**: Recharts for data visualization
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **API Style**: RESTful endpoints under `/api` prefix
- **Authentication**: Simple user ID header-based auth (`x-user-id`)

### Data Storage
- **Primary Database**: PostgreSQL (configured via DATABASE_URL)
- **Schema Location**: `shared/schema.ts` using Drizzle table definitions
- **Migrations**: Drizzle Kit with output to `./migrations`
- **Client-side Persistence**: Zustand persist middleware using localStorage as fallback

### Key Data Models
- Users with referral system and premium subscriptions
- Accounts (bank, wallet, cash, investment types)
- Transactions (income/expense with categories, tags, payment methods)
- Credit Cards with purchases, installments, and payments
- Goals, Investments, Vehicles, Subscriptions
- Business products and settings for MEI users
- Budgets and custom categories

### Application Structure
```
client/src/
├── components/     # Reusable UI components
├── contexts/       # React context providers (auth)
├── hooks/          # Custom hooks (API, toast, mobile)
├── lib/            # Utilities, store, API client, AI helpers
├── pages/          # Route components
└── assets/         # Static assets

server/
├── index.ts        # Express server entry
├── routes.ts       # API route definitions
├── storage.ts      # Database operations layer
├── static.ts       # Production static file serving
└── vite.ts         # Development Vite middleware

shared/
└── schema.ts       # Drizzle database schema (shared types)
```

### Design Patterns
- **Monorepo Structure**: Client, server, and shared code in single repository
- **API Layer Abstraction**: `storage.ts` provides interface for all database operations
- **Hybrid State**: Zustand for local-first experience, React Query for server sync
- **Component Composition**: shadcn/ui pattern with slot-based customization

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connected via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### UI Libraries
- **Radix UI**: Full suite of accessible primitives (dialog, dropdown, tabs, etc.)
- **Recharts**: Charts and data visualization
- **Lucide React**: Icon library
- **date-fns**: Date manipulation and formatting

### AI Integration (Implemented)
- **Google Generative AI** (`@google/genai`): Powers OCR and voice processing features
- **Photo OCR**: Extracts transaction data from receipt photos using Gemini vision
- **Voice Commands**: Processes spoken expense/income commands via Gemini
- Components: `client/src/components/photo-scanner.tsx`, `client/src/components/voice-recorder.tsx`
- Server endpoints: `server/ocr.ts` for image processing
- AI helper files: `financial-ai.ts`, `business-ai.ts` for generating insights

### Development Tools
- **Vite**: Development server with HMR and production builds
- **TypeScript**: Full type coverage across client and server
- **esbuild**: Server bundling for production
- **Replit Plugins**: Dev banner, error overlay, cartographer for Replit environment

### Session Management
- **connect-pg-simple**: PostgreSQL session storage (configured but sessions not actively used)
- **memorystore**: Alternative session storage option

### File Processing
- **multer**: File upload handling
- **xlsx**: Excel file import/export for spreadsheet view feature

## Recent Changes (Feb 2026)

### Authentication with Replit Auth (OAuth)
- Replaced manual username/password login with Replit Auth (OpenID Connect)
- Supports OAuth providers: Google, GitHub, Apple, and email/password
- User info stored: firstName, lastName, email, profileImageUrl
- Sessions stored in PostgreSQL via sessions table
- Authentication middleware uses `req.user.claims.sub` for userId

### Landing Page
- Created beautiful landing page at `/` for non-authenticated users
- Shows features: Voice commands, Photo OCR, AI Mentor, Credit Cards, Goals, Multi-device
- "Entrar" and "Começar Grátis" buttons redirect to `/api/login`
- Once logged in, users see the Dashboard instead

### Frontend-API Integration
- Connected Dashboard, Accounts, Transactions, and Credit Cards pages to PostgreSQL backend
- Implemented React Query hooks in `client/src/hooks/use-api.ts` for data fetching with automatic caching
- Created API client in `client/src/lib/api.ts` with authentication headers
- useAuth hook from `client/src/hooks/use-auth.ts` for Replit Auth session
- Data type transformations handle API decimal strings to frontend number types

### API Endpoints Active
- GET/POST /api/accounts - Account CRUD operations
- GET/POST /api/transactions - Transaction CRUD operations  
- GET/POST /api/credit-cards - Credit card CRUD operations
- GET/POST /api/credit-purchases - Credit card purchase tracking
- GET/POST /api/credit-payments - Invoice payment tracking
- GET /api/auth/user - Get current authenticated user
- GET /api/login - OAuth login redirect
- GET /api/callback - OAuth callback handler
- GET /api/logout - Logout and clear session
- POST /api/ocr - Process receipt photos with Gemini AI (extracts amount, merchant, date, category)
- POST /api/voice - Process voice commands with Gemini AI (transcribes and extracts transaction data)
- POST /api/ocr-batch - Process bank statement photos to extract multiple transactions at once
- POST /api/ai/chat - AI Mentor chat using Gemini 2.5 Flash

### Recent Bug Fixes (Feb 4, 2026)
- **Dashboard Balance**: Now calculates dynamically from initialBalance + income - expenses
- **Analytics Page**: Uses API hooks (useTransactions, useCreditPurchases, etc.) instead of empty Zustand store
- **Credit Card Purchases**: Photo/voice scanner now saves to credit_purchases table (uses `creditCardId` field)
- **Credit Card Forms**: Manual purchase form, delete, and update operations all use API mutations
- **Credit Payments**: Month field uses 0-11 range to match database schema
- **Credit Card Creation**: Fixed schema to make status field optional (defaults to 'active')
- **Category Validation**: Added 'Outros' fallback for credit purchase category field
- **LinkedAccountId**: Credit card creation no longer sends undefined linkedAccountId
- **Credit Card Toggle in Scanners**: Photo and voice input methods now support toggle between Conta (debit/account) and Crédito (credit card), eliminating need for separate credit card buttons
- **Category Synchronization**: Categories are shared between photo scanner, voice recorder, and manual entry through Zustand store
- **Investments Page**: Migrated from Zustand localStorage to PostgreSQL API (useInvestments, useCreateInvestment, useUpdateInvestment, useDeleteInvestment hooks)
- **Subscriptions Page**: Migrated from Zustand localStorage to PostgreSQL API (useSubscriptions, useUpdateSubscription, useDeleteSubscription hooks)
- **Vehicles Page**: Migrated from Zustand localStorage to PostgreSQL API
- **Goals Page**: Migrated from Zustand localStorage to PostgreSQL API

### API Migration Status
- **Completed**: Dashboard, Accounts, Transactions, Credit Cards, Credit Purchases, Credit Payments, Investments, Subscriptions, Vehicles, Goals, Budget, Simulator, Business, Photo-entry, Voice-entry, Manual-entry, Add-subscription
- **Pending**: Calendar Integration, Backup (still using localStorage via Zustand store)