# Splitwise App

A peer-to-peer expense sharing application built with React, Node.js, Express, and PostgreSQL.

## Features
- User authentication
- Group management
- Expense logging with various split types
- Balance tracking and debt simplification
- Settlement recording

## Setup

### Backend
1. Install dependencies: `npm install`
2. Set up database: Update `.env` with your PostgreSQL URL
3. Run migrations: `npm run db:push`
4. Start server: `npm run dev`

### Frontend
1. cd client
2. Install dependencies: `npm install`
3. Start app: `npm start`

## Deployment
- Backend: Deploy to Vercel or Railway
- Frontend: Deploy to Vercel
- Database: Use Supabase for free PostgreSQL

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/groups
- POST /api/expenses
- POST /api/settlements
- POST /api/simplify-debts