export type Cents = number

export type IncomeKind     = 'recurring' | 'one_time'
export type RecurrenceKind = 'monthly' | 'weekly' | 'biweekly' | 'none'
export type ExpenseKind    = 'fixed' | 'variable'
export type DebtKind       = 'credit_card' | 'loan'
export type Direction      = 'credit' | 'debit'
export type SourceKind     = 'income' | 'expense' | 'debt_payment' | 'installment'

export interface Category {
  id:         string
  name:       string
  color:      string
  icon:       string
  is_system:  boolean
  created_at: string
}

export interface IncomeSource {
  id:           string
  name:         string
  kind:         IncomeKind
  gross_cents:  Cents
  net_cents:    Cents
  recurrence:   RecurrenceKind
  day_of_month: number
  first_month:  string // YYYY-MM — início do período (renda avulsa)
  last_month:   string // YYYY-MM — fim do período (vazio = só um mês)
  active:       boolean
  created_at:   string
  updated_at:   string
}

export interface Expense {
  id:           string
  description:  string
  amount_cents: Cents
  kind:         ExpenseKind
  category_id:  string
  recurrence:   RecurrenceKind
  day_of_month: number
  active:       boolean
  created_at:   string
  updated_at:   string
}

export interface Debt {
  id:   string
  name: string
  kind: DebtKind
  limit_cents:             Cents
  current_balance_cents:   Cents
  minimum_payment_cents:   Cents
  closing_day:             number
  principal_cents:         Cents
  remaining_balance_cents: Cents
  monthly_payment_cents:   Cents
  total_installments:      number
  paid_installments:       number
  interest_rate_bps:       number
  due_day:                 number
  active:                  boolean
  created_at:              string
  updated_at:              string
}

export interface InstallmentPlan {
  id:                       string
  description:              string
  debt_id:                  string
  category_id:              string
  total_cents:              Cents
  installment_amount_cents: Cents
  total_installments:       number
  paid_installments:        number
  first_due_date:           string
  active:                   boolean
  created_at:               string
  updated_at:               string
}

export interface Transaction {
  id:           string
  date:         string
  description:  string
  amount_cents: Cents
  direction:    Direction
  category_id:  string
  source_kind:  SourceKind
  source_id:    string
  note:         string
  created_at:   string
  updated_at:   string
}

export interface CategoryBreakdown {
  category_id:   string
  category_name: string
  total_cents:   Cents
  share_bps:     number
}

export interface Summary {
  month:                        string
  income_total_cents:           Cents
  fixed_expense_cents:          Cents
  variable_expense_cents:       Cents
  expense_total_cents:          Cents
  debt_commitment_cents:        Cents
  installment_commitment_cents: Cents
  balance_cents:                Cents
  by_category:                  CategoryBreakdown[]
}

export interface Pagination {
  page:  number
  limit: number
  total: number
}

export interface TransactionListResponse {
  items:      Transaction[]
  pagination: Pagination
}

export type GoalKind = 'emergency_fund' | 'purchase'

export interface Goal {
  id:            string
  name:          string
  kind:          GoalKind
  target_cents:  Cents
  target_months: number
  current_cents: Cents
  deadline:      string // YYYY-MM or ''
  icon:          string
  color:         string
  active:        boolean
  created_at:    string
  updated_at:    string
}

export interface ApiErrorBody {
  error: {
    code:    'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR'
    message: string
  }
}
