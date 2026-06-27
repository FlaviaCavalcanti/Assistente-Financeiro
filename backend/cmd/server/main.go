package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/go-kit/log"
	"github.com/maya/financeiro/endpoint"
	"github.com/maya/financeiro/llm"
	"github.com/maya/financeiro/repository/sqlite"
	"github.com/maya/financeiro/service"
	transport "github.com/maya/financeiro/transport/http"
)

func main() {
	logger := log.NewLogfmtLogger(os.Stdout)
	logger = log.With(logger, "ts", log.DefaultTimestampUTC, "caller", log.DefaultCaller)

	dbPath := getenv("DB_PATH", "./data/finance.db")
	port := getenv("PORT", "8080")

	if err := os.MkdirAll("./data", 0755); err != nil {
		logger.Log("msg", "erro ao criar diretório de dados", "err", err)
		os.Exit(1)
	}

	// --- Repositórios (camada 2) ---
	db, err := sqlite.New(dbPath)
	if err != nil {
		logger.Log("msg", "erro ao abrir banco de dados", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	categoryRepo    := sqlite.NewCategoryRepository(db)
	incomeRepo      := sqlite.NewIncomeSourceRepository(db)
	expenseRepo     := sqlite.NewExpenseRepository(db)
	debtRepo        := sqlite.NewDebtRepository(db)
	installmentRepo := sqlite.NewInstallmentPlanRepository(db)
	transactionRepo := sqlite.NewTransactionRepository(db)
	goalRepo        := sqlite.NewGoalRepository(db)

	// --- Ollama (LLM local) ---
	ollamaURL   := getenv("OLLAMA_URL", llm.DefaultURL)
	ollamaModel := getenv("OLLAMA_MODEL", llm.DefaultModel)
	ollamaClient := llm.NewClient(ollamaURL, ollamaModel)
	go func() {
		if err := llm.EnsureRunning(); err != nil {
			logger.Log("msg", "ollama não pôde ser iniciado automaticamente", "err", err)
		} else {
			logger.Log("msg", "ollama disponível", "model", ollamaModel)
		}
	}()

	// --- Serviços (camada 3) ---
	categorySvc    := service.NewCategoryService(categoryRepo)
	incomeSvc      := service.NewIncomeSourceService(incomeRepo)
	expenseSvc     := service.NewExpenseService(expenseRepo, transactionRepo)
	debtSvc        := service.NewDebtService(debtRepo)
	installmentSvc := service.NewInstallmentPlanService(installmentRepo)
	transactionSvc := service.NewTransactionService(transactionRepo)
	goalSvc        := service.NewGoalService(goalRepo)
	chatSvc        := service.NewChatService(ollamaClient, categorySvc, transactionSvc)
	summarySvc     := service.NewSummaryService(
		incomeRepo, expenseRepo, debtRepo, installmentRepo, transactionRepo, categoryRepo,
	)

	// --- Endpoints (camada 4) ---
	categoryEp    := endpoint.MakeCategoryEndpoints(categorySvc)
	incomeEp      := endpoint.MakeIncomeSourceEndpoints(incomeSvc)
	expenseEp     := endpoint.MakeExpenseEndpoints(expenseSvc)
	debtEp        := endpoint.MakeDebtEndpoints(debtSvc)
	installmentEp := endpoint.MakeInstallmentPlanEndpoints(installmentSvc)
	transactionEp := endpoint.MakeTransactionEndpoints(transactionSvc)
	summaryEp     := endpoint.MakeSummaryEndpoints(summarySvc)
	goalEp        := endpoint.MakeGoalEndpoints(goalSvc)
	chatEp        := endpoint.MakeChatEndpoints(chatSvc)

	// --- Transport / Router (camada 5) ---
	router := transport.NewRouter(
		categoryEp, incomeEp, expenseEp, debtEp,
		installmentEp, transactionEp, summaryEp, goalEp, chatEp,
		logger,
	)

	addr := fmt.Sprintf("127.0.0.1:%s", port)
	logger.Log("msg", "servidor iniciado", "addr", addr)

	if err := http.ListenAndServe(addr, router); err != nil {
		logger.Log("msg", "servidor encerrado", "err", err)
		os.Exit(1)
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
