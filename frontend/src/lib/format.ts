import { format, parseISO, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

export function formatMoneyRaw(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function floatToCents(value: number): number {
  return Math.round(value * 100)
}

export function centsToFloat(cents: number): number {
  return cents / 100
}

export function formatDate(isoDate: string, fmt = 'dd/MM/yyyy'): string {
  try {
    return format(parseISO(isoDate), fmt, { locale: ptBR })
  } catch {
    return isoDate
  }
}

export function formatMonth(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  const result = format(d, 'MMMM yyyy', { locale: ptBR })
  return result.charAt(0).toUpperCase() + result.slice(1)
}

export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

export function prevMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-')
  return format(subMonths(new Date(Number(y), Number(m) - 1), 1), 'yyyy-MM')
}

export function nextMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-')
  return format(addMonths(new Date(Number(y), Number(m) - 1), 1), 'yyyy-MM')
}

export function formatBPS(bps: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:                 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(bps / 10000)
}

