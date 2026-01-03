# Crypto Portfolio Manager

A full-stack web application to manage your cryptocurrency portfolio with real-time price tracking and P&L calculations.

## Features

- 💰 **Capital Management**: Track your initial capital and monthly DCA contributions
- 📊 **Portfolio Overview**: See your total portfolio value, P&L, and allocation at a glance
- 🔄 **Trading**: Buy and sell crypto assets (BTC, ETH, SOL, ONDO, LINK) with USDT
- 💹 **Real-time Prices**: Integration with CoinMarketCap API for live prices
- 📈 **P&L Tracking**: Track profit/loss for each asset and overall portfolio
- 📋 **Transaction History**: View all capital contributions and trading orders
- 🎯 **Custom Pricing**: Option to use custom prices when executing trades

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Go with Gin framework
- **Database**: PostgreSQL

## Prerequisites

- Node.js 18+
- Go 1.21+
- Docker & Docker Compose (for PostgreSQL)
- CoinMarketCap API Key (optional - uses mock prices without it)

## Quick Start

### 1. Start PostgreSQL Database

```bash
docker-compose up -d
```

### 2. Start Backend

```bash
cd backend

# Copy environment file and update with your settings
cp .env.example .env
# Edit .env to add your CMC_API_KEY if you have one

# Install dependencies and run
go mod download
go run main.go
```

The backend will start at http://localhost:8080

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at http://localhost:3000

## Configuration

### Environment Variables (Backend)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/portfolio_manager?sslmode=disable` |
| `CMC_API_KEY` | CoinMarketCap API key (optional) | - |
| `PORT` | Server port | `8080` |

## API Endpoints

### Capital Management
- `GET /api/capitals` - List all capital entries
- `POST /api/capitals` - Add new capital
- `DELETE /api/capitals/:id` - Delete capital entry

### Orders
- `GET /api/orders` - List all orders (optional `?asset=BTC` filter)
- `POST /api/orders` - Create new order
- `DELETE /api/orders/:id` - Delete order

### Portfolio
- `GET /api/portfolio` - Get portfolio overview with P&L
- `GET /api/holdings` - Get current holdings

### Prices
- `GET /api/prices` - Get all crypto prices
- `GET /api/prices/:symbol` - Get specific asset price

### Assets
- `GET /api/assets/:symbol` - Get detailed asset info with orders

## Usage Guide

1. **Add Capital**: Click "Add Capital" to add your initial investment or monthly DCA
2. **Trade**: Click "Trade" to convert USDT to crypto assets
3. **View Holdings**: Click on any holding card to see detailed P&L and order history
4. **Custom Prices**: When trading, check "Use custom price" to enter your own execution price

## Screenshots

The dashboard provides:
- Real-time market prices ticker
- Portfolio stats cards (Total Capital, Available USDT, Portfolio Value, P&L)
- Visual portfolio allocation chart
- Individual holding cards with P&L
- Transaction history panel

## License

MIT

