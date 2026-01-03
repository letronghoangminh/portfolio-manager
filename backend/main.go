package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/shopspring/decimal"
)

var db *sql.DB

// Models
type Capital struct {
	ID          int             `json:"id"`
	Amount      decimal.Decimal `json:"amount"`
	Type        string          `json:"type"` // "initial", "dca", "withdraw", or "realized_loss"
	Description string          `json:"description"`
	CreatedAt   time.Time       `json:"created_at"`
}

type Order struct {
	ID            int             `json:"id"`
	Asset         string          `json:"asset"`
	Type          string          `json:"type"` // "buy" or "sell"
	Amount        decimal.Decimal `json:"amount"`
	Price         decimal.Decimal `json:"price"`
	TotalUSDT     decimal.Decimal `json:"total_usdt"`
	IsCustomPrice bool            `json:"is_custom_price"`
	CreatedAt     time.Time       `json:"created_at"`
}

type Holding struct {
	Asset        string          `json:"asset"`
	Amount       decimal.Decimal `json:"amount"`
	AveragePrice decimal.Decimal `json:"average_price"`
	TotalCost    decimal.Decimal `json:"total_cost"`
}

type PriceData struct {
	Symbol           string          `json:"symbol"`
	Price            decimal.Decimal `json:"price"`
	Change1h         decimal.Decimal `json:"change_1h"`
	PercentChange1h  decimal.Decimal `json:"percent_change_1h"`
	Change24h        decimal.Decimal `json:"change_24h"`
	PercentChange24h decimal.Decimal `json:"percent_change_24h"`
	Change7d         decimal.Decimal `json:"change_7d"`
	PercentChange7d  decimal.Decimal `json:"percent_change_7d"`
	Change30d        decimal.Decimal `json:"change_30d"`
	PercentChange30d decimal.Decimal `json:"percent_change_30d"`
}

type PortfolioOverview struct {
	TotalCapital    decimal.Decimal `json:"total_capital"`
	AvailableUSDT   decimal.Decimal `json:"available_usdt"`
	TotalInvested   decimal.Decimal `json:"total_invested"`
	CurrentValue    decimal.Decimal `json:"current_value"`
	UnrealizedPnL   decimal.Decimal `json:"unrealized_pnl"`
	RealizedLoss    decimal.Decimal `json:"realized_loss"`
	TotalPnL        decimal.Decimal `json:"total_pnl"`
	TotalPnLPercent decimal.Decimal `json:"total_pnl_percent"`
	Holdings        []HoldingDetail `json:"holdings"`
}

type HoldingDetail struct {
	Asset            string          `json:"asset"`
	Amount           decimal.Decimal `json:"amount"`
	AveragePrice     decimal.Decimal `json:"average_price"`
	CurrentPrice     decimal.Decimal `json:"current_price"`
	TotalCost        decimal.Decimal `json:"total_cost"`
	CurrentValue     decimal.Decimal `json:"current_value"`
	PnL              decimal.Decimal `json:"pnl"`
	PnLPercent       decimal.Decimal `json:"pnl_percent"`
	PercentOfCapital decimal.Decimal `json:"percent_of_capital"`
}

// CMC API Response structures
type CMCQuoteResponse struct {
	Data map[string]CMCAsset `json:"data"`
}

type CMCAsset struct {
	Symbol string   `json:"symbol"`
	Quote  CMCQuote `json:"quote"`
}

type CMCQuote struct {
	USD CMCPrice `json:"USD"`
}

type CMCPrice struct {
	Price            float64 `json:"price"`
	PercentChange1h  float64 `json:"percent_change_1h"`
	PercentChange24h float64 `json:"percent_change_24h"`
	PercentChange7d  float64 `json:"percent_change_7d"`
	PercentChange30d float64 `json:"percent_change_30d"`
}

// CMC Listings response
type CMCListingsResponse struct {
	Data []CMCCoinData `json:"data"`
}

type CMCCoinData struct {
	ID     int      `json:"id"`
	Symbol string   `json:"symbol"`
	Name   string   `json:"name"`
	Quote  CMCQuote `json:"quote"`
}

// Watchlist item
type WatchlistItem struct {
	Symbol  string    `json:"symbol"`
	Name    string    `json:"name"`
	AddedAt time.Time `json:"added_at"`
}

// Coin info for trading
type CoinInfo struct {
	Symbol string          `json:"symbol"`
	Name   string          `json:"name"`
	Price  decimal.Decimal `json:"price"`
	Rank   int             `json:"rank"`
}

func main() {
	// Load environment variables
	godotenv.Load()

	// Database connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/portfolio_manager?sslmode=disable"
	}

	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Test connection
	if err = db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}
	log.Println("Connected to database successfully")

	// Initialize database schema
	initDB()

	// Setup Gin router
	r := gin.Default()

	// CORS configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// API routes
	api := r.Group("/api")
	{
		// Capital management
		api.GET("/capitals", getCapitals)
		api.POST("/capitals", addCapital)
		api.DELETE("/capitals/:id", deleteCapital)
		api.POST("/withdraw", withdrawCapital)
		api.POST("/realized-loss", addRealizedLoss)

		// Orders
		api.GET("/orders", getOrders)
		api.POST("/orders", createOrder)
		api.DELETE("/orders/:id", deleteOrder)

		// Holdings
		api.GET("/holdings", getHoldings)

		// Portfolio overview
		api.GET("/portfolio", getPortfolioOverview)

		// Prices
		api.GET("/prices", getPrices)
		api.GET("/prices/:symbol", getPrice)

		// Asset detail
		api.GET("/assets/:symbol", getAssetDetail)

		// Top coins from CMC
		api.GET("/coins/top", getTopCoins)
		api.GET("/coins/top20", getTop20Coins)

		// Watchlist
		api.GET("/watchlist", getWatchlist)
		api.POST("/watchlist", addToWatchlist)
		api.DELETE("/watchlist/:symbol", removeFromWatchlist)
		api.GET("/watchlist/prices", getWatchlistPrices)

		// Reset all data
		api.POST("/reset", resetAllData)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}

func initDB() {
	schema := `
	CREATE TABLE IF NOT EXISTS capitals (
		id SERIAL PRIMARY KEY,
		amount DECIMAL(20, 8) NOT NULL,
		type VARCHAR(20) NOT NULL DEFAULT 'dca',
		description TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS orders (
		id SERIAL PRIMARY KEY,
		asset VARCHAR(10) NOT NULL,
		type VARCHAR(10) NOT NULL,
		amount DECIMAL(20, 8) NOT NULL,
		price DECIMAL(20, 8) NOT NULL,
		total_usdt DECIMAL(20, 8) NOT NULL,
		is_custom_price BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS holdings (
		asset VARCHAR(10) PRIMARY KEY,
		amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
		average_price DECIMAL(20, 8) NOT NULL DEFAULT 0,
		total_cost DECIMAL(20, 8) NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS watchlist (
		symbol VARCHAR(20) PRIMARY KEY,
		name VARCHAR(100),
		added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- Initialize USDT holding if not exists
	INSERT INTO holdings (asset, amount, average_price, total_cost)
	VALUES ('USDT', 0, 1, 0)
	ON CONFLICT (asset) DO NOTHING;
	`

	_, err := db.Exec(schema)
	if err != nil {
		log.Fatal("Failed to initialize database schema:", err)
	}
	log.Println("Database schema initialized")
}

// Capital handlers
func getCapitals(c *gin.Context) {
	rows, err := db.Query("SELECT id, amount, type, COALESCE(description, ''), created_at FROM capitals ORDER BY created_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var capitals []Capital
	for rows.Next() {
		var cap Capital
		var amount string
		if err := rows.Scan(&cap.ID, &amount, &cap.Type, &cap.Description, &cap.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		cap.Amount, _ = decimal.NewFromString(amount)
		capitals = append(capitals, cap)
	}

	if capitals == nil {
		capitals = []Capital{}
	}

	c.JSON(http.StatusOK, capitals)
}

func addCapital(c *gin.Context) {
	var input struct {
		Amount      string `json:"amount" binding:"required"`
		Type        string `json:"type" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	amount, err := decimal.NewFromString(input.Amount)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid amount"})
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	// Insert capital record
	var capitalID int
	err = tx.QueryRow(
		"INSERT INTO capitals (amount, type, description) VALUES ($1, $2, $3) RETURNING id",
		amount.String(), input.Type, input.Description,
	).Scan(&capitalID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update USDT holding
	_, err = tx.Exec(`
		INSERT INTO holdings (asset, amount, average_price, total_cost)
		VALUES ('USDT', $1, 1, $1)
		ON CONFLICT (asset) DO UPDATE SET
			amount = holdings.amount + $1,
			total_cost = holdings.total_cost + $1
	`, amount.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": capitalID, "message": "Capital added successfully"})
}

func deleteCapital(c *gin.Context) {
	id := c.Param("id")

	// Get the capital amount first
	var amount string
	err := db.QueryRow("SELECT amount FROM capitals WHERE id = $1", id).Scan(&amount)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Capital not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	// Delete capital record
	_, err = tx.Exec("DELETE FROM capitals WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update USDT holding
	_, err = tx.Exec(`
		UPDATE holdings SET
			amount = amount - $1,
			total_cost = total_cost - $1
		WHERE asset = 'USDT'
	`, amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Capital deleted successfully"})
}

func withdrawCapital(c *gin.Context) {
	var input struct {
		Amount      string `json:"amount" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	amount, err := decimal.NewFromString(input.Amount)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid amount"})
		return
	}

	if amount.LessThanOrEqual(decimal.Zero) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be positive"})
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	// Check USDT balance
	var usdtBalance string
	err = tx.QueryRow("SELECT amount FROM holdings WHERE asset = 'USDT'").Scan(&usdtBalance)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	balance, _ := decimal.NewFromString(usdtBalance)
	if balance.LessThan(amount) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient USDT balance"})
		return
	}

	// Insert withdrawal record (negative amount to indicate withdrawal)
	var capitalID int
	err = tx.QueryRow(
		"INSERT INTO capitals (amount, type, description) VALUES ($1, $2, $3) RETURNING id",
		amount.Neg().String(), "withdraw", input.Description,
	).Scan(&capitalID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update USDT holding
	_, err = tx.Exec(`
		UPDATE holdings SET
			amount = amount - $1,
			total_cost = total_cost - $1
		WHERE asset = 'USDT'
	`, amount.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": capitalID, "message": "Withdrawal successful"})
}

func addRealizedLoss(c *gin.Context) {
	var input struct {
		Amount      string `json:"amount" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	amount, err := decimal.NewFromString(input.Amount)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid amount"})
		return
	}

	if amount.LessThanOrEqual(decimal.Zero) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be positive"})
		return
	}

	// Insert realized loss record (stored as negative to represent loss)
	var capitalID int
	err = db.QueryRow(
		"INSERT INTO capitals (amount, type, description) VALUES ($1, $2, $3) RETURNING id",
		amount.Neg().String(), "realized_loss", input.Description,
	).Scan(&capitalID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": capitalID, "message": "Realized loss recorded successfully"})
}

// Order handlers
func getOrders(c *gin.Context) {
	asset := c.Query("asset")

	var rows *sql.Rows
	var err error

	if asset != "" {
		rows, err = db.Query(`
			SELECT id, asset, type, amount, price, total_usdt, is_custom_price, created_at 
			FROM orders 
			WHERE asset = $1
			ORDER BY created_at DESC
		`, asset)
	} else {
		rows, err = db.Query(`
			SELECT id, asset, type, amount, price, total_usdt, is_custom_price, created_at 
			FROM orders 
			ORDER BY created_at DESC
		`)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var orders []Order
	for rows.Next() {
		var order Order
		var amount, price, totalUSDT string
		if err := rows.Scan(&order.ID, &order.Asset, &order.Type, &amount, &price, &totalUSDT, &order.IsCustomPrice, &order.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		order.Amount, _ = decimal.NewFromString(amount)
		order.Price, _ = decimal.NewFromString(price)
		order.TotalUSDT, _ = decimal.NewFromString(totalUSDT)
		orders = append(orders, order)
	}

	if orders == nil {
		orders = []Order{}
	}

	c.JSON(http.StatusOK, orders)
}

func createOrder(c *gin.Context) {
	var input struct {
		Asset         string `json:"asset" binding:"required"`
		Type          string `json:"type" binding:"required"`
		Amount        string `json:"amount"`
		TotalUSDT     string `json:"total_usdt"`
		Price         string `json:"price"`
		IsCustomPrice bool   `json:"is_custom_price"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get price (either custom or from API)
	var price decimal.Decimal
	var err error
	if input.Price != "" {
		price, err = decimal.NewFromString(input.Price)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid price"})
			return
		}
	} else {
		// Fetch price from CMC API
		priceData, err := fetchPrice(input.Asset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch price: " + err.Error()})
			return
		}
		price = priceData.Price
	}

	// Calculate amount and total
	var amount, totalUSDT decimal.Decimal
	if input.Amount != "" {
		amount, _ = decimal.NewFromString(input.Amount)
		totalUSDT = amount.Mul(price)
	} else if input.TotalUSDT != "" {
		totalUSDT, _ = decimal.NewFromString(input.TotalUSDT)
		amount = totalUSDT.Div(price)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Either amount or total_usdt is required"})
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	if input.Type == "buy" {
		// Check USDT balance
		var usdtBalance string
		err = tx.QueryRow("SELECT amount FROM holdings WHERE asset = 'USDT'").Scan(&usdtBalance)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		balance, _ := decimal.NewFromString(usdtBalance)
		if balance.LessThan(totalUSDT) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient USDT balance"})
			return
		}

		// Deduct USDT
		_, err = tx.Exec(`
			UPDATE holdings SET
				amount = amount - $1,
				total_cost = total_cost - $1
			WHERE asset = 'USDT'
		`, totalUSDT.String())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Update or insert holding for the asset
		_, err = tx.Exec(`
			INSERT INTO holdings (asset, amount, average_price, total_cost)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (asset) DO UPDATE SET
				average_price = (holdings.total_cost + $4) / (holdings.amount + $2),
				amount = holdings.amount + $2,
				total_cost = holdings.total_cost + $4
		`, input.Asset, amount.String(), price.String(), totalUSDT.String())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else if input.Type == "sell" {
		// Check asset balance
		var assetBalance string
		err = tx.QueryRow("SELECT amount FROM holdings WHERE asset = $1", input.Asset).Scan(&assetBalance)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusBadRequest, gin.H{"error": "No holdings for this asset"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		balance, _ := decimal.NewFromString(assetBalance)
		if balance.LessThan(amount) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient asset balance"})
			return
		}

		// Get current average price and total cost
		var avgPriceStr, totalCostStr string
		err = tx.QueryRow("SELECT average_price, total_cost FROM holdings WHERE asset = $1", input.Asset).Scan(&avgPriceStr, &totalCostStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		currentTotalCost, _ := decimal.NewFromString(totalCostStr)
		currentBalance, _ := decimal.NewFromString(assetBalance)

		// Calculate cost to deduct proportionally
		costToDeduct := currentTotalCost.Mul(amount).Div(currentBalance)

		// Deduct from asset holding
		_, err = tx.Exec(`
			UPDATE holdings SET
				amount = amount - $1,
				total_cost = total_cost - $2
			WHERE asset = $3
		`, amount.String(), costToDeduct.String(), input.Asset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Add USDT
		_, err = tx.Exec(`
			UPDATE holdings SET
				amount = amount + $1,
				total_cost = total_cost + $1
			WHERE asset = 'USDT'
		`, totalUSDT.String())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Insert order record
	var orderID int
	err = tx.QueryRow(`
		INSERT INTO orders (asset, type, amount, price, total_usdt, is_custom_price)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, input.Asset, input.Type, amount.String(), price.String(), totalUSDT.String(), input.IsCustomPrice).Scan(&orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":      orderID,
		"asset":   input.Asset,
		"type":    input.Type,
		"amount":  amount.String(),
		"price":   price.String(),
		"total":   totalUSDT.String(),
		"message": "Order executed successfully",
	})
}

func deleteOrder(c *gin.Context) {
	id := c.Param("id")

	_, err := db.Exec("DELETE FROM orders WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order deleted successfully"})
}

// Holdings handlers
func getHoldings(c *gin.Context) {
	rows, err := db.Query("SELECT asset, amount, average_price, total_cost FROM holdings WHERE amount > 0")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var holdings []Holding
	for rows.Next() {
		var h Holding
		var amount, avgPrice, totalCost string
		if err := rows.Scan(&h.Asset, &amount, &avgPrice, &totalCost); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		h.Amount, _ = decimal.NewFromString(amount)
		h.AveragePrice, _ = decimal.NewFromString(avgPrice)
		h.TotalCost, _ = decimal.NewFromString(totalCost)
		holdings = append(holdings, h)
	}

	if holdings == nil {
		holdings = []Holding{}
	}

	c.JSON(http.StatusOK, holdings)
}

// Portfolio overview
func getPortfolioOverview(c *gin.Context) {
	// Get total deposits (initial + dca)
	var totalDepositsStr sql.NullString
	err := db.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM capitals WHERE type IN ('initial', 'dca')").Scan(&totalDepositsStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	totalDeposits, _ := decimal.NewFromString(totalDepositsStr.String)

	// Get total withdrawals
	var totalWithdrawalsStr sql.NullString
	err = db.QueryRow("SELECT COALESCE(SUM(ABS(amount)), 0) FROM capitals WHERE type = 'withdraw'").Scan(&totalWithdrawalsStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	totalWithdrawals, _ := decimal.NewFromString(totalWithdrawalsStr.String)

	// Get realized losses (stored as negative, so we use ABS)
	var realizedLossStr sql.NullString
	err = db.QueryRow("SELECT COALESCE(SUM(ABS(amount)), 0) FROM capitals WHERE type = 'realized_loss'").Scan(&realizedLossStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	realizedLoss, _ := decimal.NewFromString(realizedLossStr.String)

	// Total capital = deposits - withdrawals (includes realized loss in deposits for tracking total invested)
	totalCapital := totalDeposits.Sub(totalWithdrawals)

	// Get all holdings
	rows, err := db.Query("SELECT asset, amount, average_price, total_cost FROM holdings WHERE amount > 0")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var holdings []HoldingDetail
	var totalInvested, currentValue, availableUSDT decimal.Decimal

	// Fetch current prices
	prices, _ := fetchAllPrices()

	for rows.Next() {
		var asset string
		var amountStr, avgPriceStr, totalCostStr string
		if err := rows.Scan(&asset, &amountStr, &avgPriceStr, &totalCostStr); err != nil {
			continue
		}

		amount, _ := decimal.NewFromString(amountStr)
		avgPrice, _ := decimal.NewFromString(avgPriceStr)
		totalCost, _ := decimal.NewFromString(totalCostStr)

		if asset == "USDT" {
			availableUSDT = amount
			continue
		}

		currentPrice := decimal.NewFromFloat(1)
		if p, ok := prices[asset]; ok {
			currentPrice = p.Price
		}

		holdingValue := amount.Mul(currentPrice)
		pnl := holdingValue.Sub(totalCost)
		pnlPercent := decimal.Zero
		if !totalCost.IsZero() {
			pnlPercent = pnl.Div(totalCost).Mul(decimal.NewFromInt(100))
		}

		percentOfCapital := decimal.Zero
		if !totalCapital.IsZero() {
			percentOfCapital = totalCost.Div(totalCapital).Mul(decimal.NewFromInt(100))
		}

		holdings = append(holdings, HoldingDetail{
			Asset:            asset,
			Amount:           amount,
			AveragePrice:     avgPrice,
			CurrentPrice:     currentPrice,
			TotalCost:        totalCost,
			CurrentValue:     holdingValue,
			PnL:              pnl,
			PnLPercent:       pnlPercent,
			PercentOfCapital: percentOfCapital,
		})

		totalInvested = totalInvested.Add(totalCost)
		currentValue = currentValue.Add(holdingValue)
	}

	// Calculate unrealized PnL from current holdings
	unrealizedPnL := currentValue.Sub(totalInvested)

	// Total PnL includes both unrealized and realized losses
	totalPnL := unrealizedPnL.Sub(realizedLoss)

	// For percentage calculation, use total capital (deposits) as the base
	totalPnLPercent := decimal.Zero
	if !totalCapital.IsZero() {
		totalPnLPercent = totalPnL.Div(totalCapital).Mul(decimal.NewFromInt(100))
	}

	if holdings == nil {
		holdings = []HoldingDetail{}
	}

	c.JSON(http.StatusOK, PortfolioOverview{
		TotalCapital:    totalCapital.Add(realizedLoss), // Include realized loss in total capital for display
		AvailableUSDT:   availableUSDT,
		TotalInvested:   totalInvested,
		CurrentValue:    currentValue,
		UnrealizedPnL:   unrealizedPnL,
		RealizedLoss:    realizedLoss,
		TotalPnL:        totalPnL,
		TotalPnLPercent: totalPnLPercent,
		Holdings:        holdings,
	})
}

// Price handlers
func getPrices(c *gin.Context) {
	prices, err := fetchAllPrices()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	priceList := make([]PriceData, 0, len(prices))
	for _, p := range prices {
		priceList = append(priceList, p)
	}

	c.JSON(http.StatusOK, priceList)
}

func getPrice(c *gin.Context) {
	symbol := c.Param("symbol")
	price, err := fetchPrice(symbol)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, price)
}

func getAssetDetail(c *gin.Context) {
	symbol := c.Param("symbol")

	// Get holding data
	var amountStr, avgPriceStr, totalCostStr string
	err := db.QueryRow("SELECT amount, average_price, total_cost FROM holdings WHERE asset = $1", symbol).Scan(&amountStr, &avgPriceStr, &totalCostStr)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "No holdings for this asset"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	amount, _ := decimal.NewFromString(amountStr)
	avgPrice, _ := decimal.NewFromString(avgPriceStr)
	totalCost, _ := decimal.NewFromString(totalCostStr)

	// Get current price
	priceData, err := fetchPrice(symbol)
	currentPrice := avgPrice
	var change24h, percentChange24h decimal.Decimal
	if err == nil {
		currentPrice = priceData.Price
		change24h = priceData.Change24h
		percentChange24h = priceData.PercentChange24h
	}

	currentValue := amount.Mul(currentPrice)
	pnl := currentValue.Sub(totalCost)
	pnlPercent := decimal.Zero
	if !totalCost.IsZero() {
		pnlPercent = pnl.Div(totalCost).Mul(decimal.NewFromInt(100))
	}

	// Get total capital for percentage calculation
	var totalCapitalStr sql.NullString
	db.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM capitals").Scan(&totalCapitalStr)
	totalCapital, _ := decimal.NewFromString(totalCapitalStr.String)

	percentOfCapital := decimal.Zero
	if !totalCapital.IsZero() {
		percentOfCapital = totalCost.Div(totalCapital).Mul(decimal.NewFromInt(100))
	}

	// Get orders for this asset
	orderRows, err := db.Query(`
		SELECT id, asset, type, amount, price, total_usdt, is_custom_price, created_at 
		FROM orders 
		WHERE asset = $1
		ORDER BY created_at DESC
	`, symbol)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer orderRows.Close()

	var orders []Order
	for orderRows.Next() {
		var order Order
		var oAmount, oPrice, oTotalUSDT string
		if err := orderRows.Scan(&order.ID, &order.Asset, &order.Type, &oAmount, &oPrice, &oTotalUSDT, &order.IsCustomPrice, &order.CreatedAt); err != nil {
			continue
		}
		order.Amount, _ = decimal.NewFromString(oAmount)
		order.Price, _ = decimal.NewFromString(oPrice)
		order.TotalUSDT, _ = decimal.NewFromString(oTotalUSDT)
		orders = append(orders, order)
	}

	if orders == nil {
		orders = []Order{}
	}

	c.JSON(http.StatusOK, gin.H{
		"asset":              symbol,
		"amount":             amount,
		"average_price":      avgPrice,
		"current_price":      currentPrice,
		"total_cost":         totalCost,
		"current_value":      currentValue,
		"pnl":                pnl,
		"pnl_percent":        pnlPercent,
		"percent_of_capital": percentOfCapital,
		"change_24h":         change24h,
		"percent_change_24h": percentChange24h,
		"orders":             orders,
	})
}

// Top coins handlers
func getTopCoins(c *gin.Context) {
	limit := c.DefaultQuery("limit", "100")
	coins, err := fetchTopCoins(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, coins)
}

func getTop20Coins(c *gin.Context) {
	coins, err := fetchTopCoinsWithPrices("20")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, coins)
}

func fetchTopCoins(limit string) ([]CoinInfo, error) {
	apiKey := os.Getenv("CMC_API_KEY")
	if apiKey == "" {
		return getDefaultCoins(), nil
	}

	url := fmt.Sprintf("https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=%s&convert=USD", limit)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Add("X-CMC_PRO_API_KEY", apiKey)
	req.Header.Add("Accept", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return getDefaultCoins(), nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var cmcResp CMCListingsResponse
	if err := json.Unmarshal(body, &cmcResp); err != nil {
		return getDefaultCoins(), nil
	}

	coins := make([]CoinInfo, 0, len(cmcResp.Data))
	for i, coin := range cmcResp.Data {
		coins = append(coins, CoinInfo{
			Symbol: coin.Symbol,
			Name:   coin.Name,
			Price:  decimal.NewFromFloat(coin.Quote.USD.Price),
			Rank:   i + 1,
		})
	}

	return coins, nil
}

func fetchTopCoinsWithPrices(limit string) ([]PriceData, error) {
	apiKey := os.Getenv("CMC_API_KEY")
	if apiKey == "" {
		return getDefaultPrices(), nil
	}

	url := fmt.Sprintf("https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=%s&convert=USD", limit)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Add("X-CMC_PRO_API_KEY", apiKey)
	req.Header.Add("Accept", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return getDefaultPrices(), nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var cmcResp CMCListingsResponse
	if err := json.Unmarshal(body, &cmcResp); err != nil {
		return getDefaultPrices(), nil
	}

	prices := make([]PriceData, 0, len(cmcResp.Data))
	for _, coin := range cmcResp.Data {
		prices = append(prices, buildPriceData(coin.Symbol, coin.Quote.USD))
	}

	return prices, nil
}

func getDefaultCoins() []CoinInfo {
	return []CoinInfo{
		{Symbol: "BTC", Name: "Bitcoin", Price: decimal.NewFromFloat(89000), Rank: 1},
		{Symbol: "ETH", Name: "Ethereum", Price: decimal.NewFromFloat(3100), Rank: 2},
		{Symbol: "USDT", Name: "Tether", Price: decimal.NewFromFloat(1), Rank: 3},
		{Symbol: "BNB", Name: "BNB", Price: decimal.NewFromFloat(600), Rank: 4},
		{Symbol: "SOL", Name: "Solana", Price: decimal.NewFromFloat(130), Rank: 5},
		{Symbol: "XRP", Name: "XRP", Price: decimal.NewFromFloat(2.2), Rank: 6},
		{Symbol: "USDC", Name: "USD Coin", Price: decimal.NewFromFloat(1), Rank: 7},
		{Symbol: "ADA", Name: "Cardano", Price: decimal.NewFromFloat(0.9), Rank: 8},
		{Symbol: "AVAX", Name: "Avalanche", Price: decimal.NewFromFloat(35), Rank: 9},
		{Symbol: "DOGE", Name: "Dogecoin", Price: decimal.NewFromFloat(0.32), Rank: 10},
		{Symbol: "DOT", Name: "Polkadot", Price: decimal.NewFromFloat(7), Rank: 11},
		{Symbol: "TRX", Name: "TRON", Price: decimal.NewFromFloat(0.25), Rank: 12},
		{Symbol: "LINK", Name: "Chainlink", Price: decimal.NewFromFloat(13), Rank: 13},
		{Symbol: "MATIC", Name: "Polygon", Price: decimal.NewFromFloat(0.5), Rank: 14},
		{Symbol: "SHIB", Name: "Shiba Inu", Price: decimal.NewFromFloat(0.000022), Rank: 15},
		{Symbol: "LTC", Name: "Litecoin", Price: decimal.NewFromFloat(100), Rank: 16},
		{Symbol: "BCH", Name: "Bitcoin Cash", Price: decimal.NewFromFloat(450), Rank: 17},
		{Symbol: "ATOM", Name: "Cosmos", Price: decimal.NewFromFloat(9), Rank: 18},
		{Symbol: "UNI", Name: "Uniswap", Price: decimal.NewFromFloat(12), Rank: 19},
		{Symbol: "XLM", Name: "Stellar", Price: decimal.NewFromFloat(0.4), Rank: 20},
		{Symbol: "ONDO", Name: "Ondo", Price: decimal.NewFromFloat(1.35), Rank: 50},
	}
}

func getDefaultPrices() []PriceData {
	coins := getDefaultCoins()
	prices := make([]PriceData, 0, len(coins))
	for _, coin := range coins[:20] {
		prices = append(prices, PriceData{
			Symbol:           coin.Symbol,
			Price:            coin.Price,
			Change1h:         coin.Price.Mul(decimal.NewFromFloat(0.005)),
			PercentChange1h:  decimal.NewFromFloat(0.5),
			Change24h:        coin.Price.Mul(decimal.NewFromFloat(0.02)),
			PercentChange24h: decimal.NewFromFloat(2.0),
			Change7d:         coin.Price.Mul(decimal.NewFromFloat(0.05)),
			PercentChange7d:  decimal.NewFromFloat(5.0),
			Change30d:        coin.Price.Mul(decimal.NewFromFloat(0.1)),
			PercentChange30d: decimal.NewFromFloat(10.0),
		})
	}
	return prices
}

// Watchlist handlers
func getWatchlist(c *gin.Context) {
	rows, err := db.Query("SELECT symbol, name, added_at FROM watchlist ORDER BY added_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var items []WatchlistItem
	for rows.Next() {
		var item WatchlistItem
		if err := rows.Scan(&item.Symbol, &item.Name, &item.AddedAt); err != nil {
			continue
		}
		items = append(items, item)
	}

	if items == nil {
		items = []WatchlistItem{}
	}

	c.JSON(http.StatusOK, items)
}

func addToWatchlist(c *gin.Context) {
	var input struct {
		Symbol string `json:"symbol" binding:"required"`
		Name   string `json:"name"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := db.Exec(
		"INSERT INTO watchlist (symbol, name) VALUES ($1, $2) ON CONFLICT (symbol) DO UPDATE SET name = $2",
		input.Symbol, input.Name,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Added to watchlist"})
}

func removeFromWatchlist(c *gin.Context) {
	symbol := c.Param("symbol")

	_, err := db.Exec("DELETE FROM watchlist WHERE symbol = $1", symbol)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Removed from watchlist"})
}

func getWatchlistPrices(c *gin.Context) {
	rows, err := db.Query("SELECT symbol FROM watchlist")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var symbols []string
	for rows.Next() {
		var symbol string
		if err := rows.Scan(&symbol); err != nil {
			continue
		}
		symbols = append(symbols, symbol)
	}

	if len(symbols) == 0 {
		c.JSON(http.StatusOK, []PriceData{})
		return
	}

	prices := make([]PriceData, 0, len(symbols))
	for _, symbol := range symbols {
		price, err := fetchPrice(symbol)
		if err == nil {
			prices = append(prices, price)
		}
	}

	c.JSON(http.StatusOK, prices)
}

// Reset all data handler
func resetAllData(c *gin.Context) {
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	// Delete all orders
	_, err = tx.Exec("DELETE FROM orders")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Delete all capitals
	_, err = tx.Exec("DELETE FROM capitals")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Reset holdings (keep USDT but set to 0)
	_, err = tx.Exec("DELETE FROM holdings WHERE asset != 'USDT'")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = tx.Exec("UPDATE holdings SET amount = 0, total_cost = 0 WHERE asset = 'USDT'")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All data has been reset successfully"})
}

// CMC API functions
func fetchPrice(symbol string) (PriceData, error) {
	apiKey := os.Getenv("CMC_API_KEY")
	if apiKey == "" {
		// Return mock price if no API key
		return getMockPrice(symbol), nil
	}

	url := fmt.Sprintf("https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=%s", symbol)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Add("X-CMC_PRO_API_KEY", apiKey)
	req.Header.Add("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return getMockPrice(symbol), nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var cmcResp CMCQuoteResponse
	if err := json.Unmarshal(body, &cmcResp); err != nil {
		return getMockPrice(symbol), nil
	}

	if asset, ok := cmcResp.Data[symbol]; ok {
		return buildPriceData(symbol, asset.Quote.USD), nil
	}

	return getMockPrice(symbol), nil
}

func buildPriceData(symbol string, quote CMCPrice) PriceData {
	price := decimal.NewFromFloat(quote.Price)
	pct1h := decimal.NewFromFloat(quote.PercentChange1h)
	pct24h := decimal.NewFromFloat(quote.PercentChange24h)
	pct7d := decimal.NewFromFloat(quote.PercentChange7d)
	pct30d := decimal.NewFromFloat(quote.PercentChange30d)

	return PriceData{
		Symbol:           symbol,
		Price:            price,
		Change1h:         price.Mul(pct1h).Div(decimal.NewFromInt(100)),
		PercentChange1h:  pct1h,
		Change24h:        price.Mul(pct24h).Div(decimal.NewFromInt(100)),
		PercentChange24h: pct24h,
		Change7d:         price.Mul(pct7d).Div(decimal.NewFromInt(100)),
		PercentChange7d:  pct7d,
		Change30d:        price.Mul(pct30d).Div(decimal.NewFromInt(100)),
		PercentChange30d: pct30d,
	}
}

func fetchAllPrices() (map[string]PriceData, error) {
	symbols := []string{"BTC", "ETH", "SOL", "ONDO", "LINK"}
	prices := make(map[string]PriceData)

	apiKey := os.Getenv("CMC_API_KEY")
	if apiKey == "" {
		// Return mock prices if no API key
		for _, s := range symbols {
			prices[s] = getMockPrice(s)
		}
		return prices, nil
	}

	symbolStr := "BTC,ETH,SOL,ONDO,LINK"
	url := fmt.Sprintf("https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=%s", symbolStr)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Add("X-CMC_PRO_API_KEY", apiKey)
	req.Header.Add("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		for _, s := range symbols {
			prices[s] = getMockPrice(s)
		}
		return prices, nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var cmcResp CMCQuoteResponse
	if err := json.Unmarshal(body, &cmcResp); err != nil {
		for _, s := range symbols {
			prices[s] = getMockPrice(s)
		}
		return prices, nil
	}

	for symbol, asset := range cmcResp.Data {
		prices[symbol] = buildPriceData(symbol, asset.Quote.USD)
	}

	// Fill in any missing with mock prices
	for _, s := range symbols {
		if _, ok := prices[s]; !ok {
			prices[s] = getMockPrice(s)
		}
	}

	return prices, nil
}

func getMockPrice(symbol string) PriceData {
	mockPrices := map[string]float64{
		"BTC":  97000,
		"ETH":  3400,
		"SOL":  190,
		"ONDO": 1.35,
		"LINK": 23,
	}

	// Mock percentage changes for different time periods
	mockChanges := map[string]struct {
		pct1h, pct24h, pct7d, pct30d float64
	}{
		"BTC":  {0.3, 2.1, 5.2, 12.5},
		"ETH":  {0.5, 3.2, 8.1, 18.3},
		"SOL":  {1.2, 5.5, 15.3, 35.2},
		"ONDO": {0.8, 4.2, 12.1, 28.5},
		"LINK": {0.6, 3.8, 9.5, 22.1},
	}

	price := mockPrices[symbol]
	if price == 0 {
		price = 1
	}

	changes := mockChanges[symbol]
	if changes.pct24h == 0 {
		changes = struct{ pct1h, pct24h, pct7d, pct30d float64 }{0.5, 2.0, 5.0, 10.0}
	}

	priceD := decimal.NewFromFloat(price)
	pct1h := decimal.NewFromFloat(changes.pct1h)
	pct24h := decimal.NewFromFloat(changes.pct24h)
	pct7d := decimal.NewFromFloat(changes.pct7d)
	pct30d := decimal.NewFromFloat(changes.pct30d)

	return PriceData{
		Symbol:           symbol,
		Price:            priceD,
		Change1h:         priceD.Mul(pct1h).Div(decimal.NewFromInt(100)),
		PercentChange1h:  pct1h,
		Change24h:        priceD.Mul(pct24h).Div(decimal.NewFromInt(100)),
		PercentChange24h: pct24h,
		Change7d:         priceD.Mul(pct7d).Div(decimal.NewFromInt(100)),
		PercentChange7d:  pct7d,
		Change30d:        priceD.Mul(pct30d).Div(decimal.NewFromInt(100)),
		PercentChange30d: pct30d,
	}
}

// Helper function for parsing decimal query params
func parseDecimalParam(value string) decimal.Decimal {
	if value == "" {
		return decimal.Zero
	}
	d, _ := decimal.NewFromString(value)
	return d
}

func init() {
	// Suppress unused variable warning
	_ = parseDecimalParam
	_ = strconv.Atoi
}
