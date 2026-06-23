package http

import (
	"net/http"

	"github.com/go-kit/log"
	"github.com/gorilla/mux"
	"github.com/maya/financeiro/endpoint"
)

func NewRouter(
	categoryEp    endpoint.CategoryEndpoints,
	incomeEp      endpoint.IncomeSourceEndpoints,
	expenseEp     endpoint.ExpenseEndpoints,
	debtEp        endpoint.DebtEndpoints,
	installmentEp endpoint.InstallmentPlanEndpoints,
	transactionEp endpoint.TransactionEndpoints,
	summaryEp     endpoint.SummaryEndpoints,
	logger        log.Logger,
) http.Handler {
	r := mux.NewRouter()
	r.Use(LoggingMiddleware(logger))

	RegisterSummaryRoutes(r, summaryEp, logger)
	RegisterCategoryRoutes(r, categoryEp, logger)
	RegisterIncomeSourceRoutes(r, incomeEp, logger)
	RegisterExpenseRoutes(r, expenseEp, logger)
	RegisterDebtRoutes(r, debtEp, logger)
	RegisterInstallmentPlanRoutes(r, installmentEp, logger)
	RegisterTransactionRoutes(r, transactionEp, logger)

	return r
}
