export const queryKeys = {
  summary:          (month: string) => ['summary', month] as const,
  categories:       () => ['categories'] as const,
  incomeSources:    (onlyActive: boolean) => ['income-sources', { onlyActive }] as const,
  expenses:         (filter: { kind?: string; onlyActive?: boolean }) => ['expenses', filter] as const,
  debts:            (filter: { onlyActive?: boolean }) => ['debts', filter] as const,
  installmentPlans: (onlyActive: boolean) => ['installment-plans', { onlyActive }] as const,
  transactions:     (filter: { from?: string; to?: string; category_id?: string; direction?: string; page?: number; limit?: number }) => ['transactions', filter] as const,
  transaction:      (id: string) => ['transactions', id] as const,
}
