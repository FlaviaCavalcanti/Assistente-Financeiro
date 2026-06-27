package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

type summaryService struct {
	incomeRepo      repository.IncomeSourceRepository
	expenseRepo     repository.ExpenseRepository
	debtRepo        repository.DebtRepository
	installmentRepo repository.InstallmentPlanRepository
	transactionRepo repository.TransactionRepository
	categoryRepo    repository.CategoryRepository
}

func NewSummaryService(
	incomeRepo repository.IncomeSourceRepository,
	expenseRepo repository.ExpenseRepository,
	debtRepo repository.DebtRepository,
	installmentRepo repository.InstallmentPlanRepository,
	transactionRepo repository.TransactionRepository,
	categoryRepo repository.CategoryRepository,
) SummaryService {
	return &summaryService{
		incomeRepo:      incomeRepo,
		expenseRepo:     expenseRepo,
		debtRepo:        debtRepo,
		installmentRepo: installmentRepo,
		transactionRepo: transactionRepo,
		categoryRepo:    categoryRepo,
	}
}

// GetMonthly calcula o saldo do mês. Toda aritmética é feita em Go — nunca no banco.
func (s *summaryService) GetMonthly(ctx context.Context, month string) (entity.Summary, error) {
	year, m, err := parseMonth(month)
	if err != nil {
		return entity.Summary{}, err
	}

	from := time.Date(year, time.Month(m), 1, 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 1, -1) // último dia do mês

	// 1. Renda: soma net_cents das fontes ativas
	sources, err := s.incomeRepo.FindAll(ctx, true)
	if err != nil {
		return entity.Summary{}, err
	}
	var incomeTotal entity.Money
	for _, src := range sources {
		if src.Kind == entity.IncomeKindRecurring {
			incomeTotal = incomeTotal.Add(src.NetCents)
		} else if src.Kind == entity.IncomeKindOneTime && src.AppliesToMonth(month) {
			incomeTotal = incomeTotal.Add(src.NetCents)
		}
	}
	// Créditos avulsos do mês (renda extra lançada como transação)
	extraIncome, err := s.transactionRepo.SumByDirection(ctx, entity.DirectionCredit, from, to)
	if err != nil {
		return entity.Summary{}, err
	}
	incomeTotal = incomeTotal.Add(extraIncome)

	// 2. Gastos fixos ativos
	fixedKind := entity.ExpenseKindFixed
	fixedExpenses, err := s.expenseRepo.FindAll(ctx, repository.ExpenseFilter{Kind: &fixedKind, OnlyActive: true})
	if err != nil {
		return entity.Summary{}, err
	}
	var fixedTotal entity.Money
	for _, e := range fixedExpenses {
		fixedTotal = fixedTotal.Add(e.AmountCents)
	}

	// 3. Gastos variáveis: soma debits do mês nas transações
	variableTotal, err := s.transactionRepo.SumByDirection(ctx, entity.DirectionDebit, from, to)
	if err != nil {
		return entity.Summary{}, err
	}

	// 4. Compromisso mensal de dívidas ativas
	debts, err := s.debtRepo.FindAll(ctx, repository.DebtFilter{OnlyActive: true})
	if err != nil {
		return entity.Summary{}, err
	}
	var debtCommitment entity.Money
	for _, d := range debts {
		debtCommitment = debtCommitment.Add(d.MonthlyCommitment())
	}

	// 5. Parcelas com vencimento no mês
	plans, err := s.installmentRepo.FindActiveDueInMonth(ctx, year, m)
	if err != nil {
		return entity.Summary{}, err
	}
	var installmentCommitment entity.Money
	for _, p := range plans {
		installmentCommitment = installmentCommitment.Add(p.InstallmentAmountCents)
	}

	// 6. Saldo
	balance := entity.Money(
		incomeTotal.Int64() -
			fixedTotal.Int64() -
			variableTotal.Int64() -
			debtCommitment.Int64() -
			installmentCommitment.Int64(),
	)

	// 7. Breakdown por categoria (transações variáveis + gastos fixos ativos)
	catSums, err := s.transactionRepo.SumByCategory(ctx, from, to)
	if err != nil {
		return entity.Summary{}, err
	}
	breakdown, err := s.buildBreakdown(ctx, catSums, fixedExpenses, fixedTotal.Add(variableTotal))
	if err != nil {
		return entity.Summary{}, err
	}

	return entity.Summary{
		Month:                     month,
		IncomeTotalCents:          incomeTotal,
		FixedExpenseCents:         fixedTotal,
		VariableExpenseCents:      variableTotal,
		ExpenseTotalCents:         fixedTotal.Add(variableTotal),
		DebtCommitmentCents:       debtCommitment,
		InstallmentCommitmentCents: installmentCommitment,
		BalanceCents:              balance,
		ByCategory:                breakdown,
	}, nil
}

func (s *summaryService) buildBreakdown(ctx context.Context, sums []repository.CategorySum, fixedExpenses []entity.Expense, total entity.Money) ([]entity.CategoryBreakdown, error) {
	if total.IsZero() {
		return nil, nil
	}

	// Agrupa transações variáveis por categoria
	merged := make(map[string]entity.Money)
	for _, cs := range sums {
		merged[cs.CategoryID] = merged[cs.CategoryID].Add(cs.TotalCents)
	}
	// Inclui gastos fixos ativos por categoria
	for _, e := range fixedExpenses {
		if e.CategoryID != "" {
			merged[e.CategoryID] = merged[e.CategoryID].Add(e.AmountCents)
		}
	}

	if len(merged) == 0 {
		return nil, nil
	}

	categories, err := s.categoryRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	catByID := make(map[string]entity.Category, len(categories))
	for _, c := range categories {
		catByID[c.ID] = c
	}

	breakdown := make([]entity.CategoryBreakdown, 0, len(merged))
	for catID, amount := range merged {
		cat := catByID[catID]
		shareBps := entity.BasisPoints(amount.Int64() * 10000 / total.Int64())
		breakdown = append(breakdown, entity.CategoryBreakdown{
			CategoryID:   catID,
			CategoryName: cat.Name,
			TotalCents:   amount,
			ShareBps:     shareBps,
		})
	}
	return breakdown, nil
}

func parseMonth(month string) (int, int, error) {
	var year, m int
	if _, err := fmt.Sscanf(month, "%d-%d", &year, &m); err != nil {
		return 0, 0, errors.New("month inválido: use formato YYYY-MM")
	}
	if m < 1 || m > 12 {
		return 0, 0, errors.New("mês deve estar entre 01 e 12")
	}
	return year, m, nil
}
