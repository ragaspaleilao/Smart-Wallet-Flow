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

### AI Integration (Planned/Partial)
- **Google Generative AI** (`@google/genai`): Used for OCR, voice processing, and financial insights
- The app includes AI helper files (`financial-ai.ts`, `business-ai.ts`) for generating insights

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