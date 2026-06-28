import type { Summary } from '@/types/api'

export type JuliusContext =
  | 'variable_expense'
  | 'budget_danger'
  | 'budget_warning'
  | 'installment_high'
  | 'second_job'
  | 'extra_income'
  | 'budget_ok'

const QUOTES: Record<JuliusContext, string[]> = {
  variable_expense: [
    'Se você não comprar, o desconto é maior!',
    'Isso vai sair do seu bolso — e não vai voltar.',
    'Tira o pé do chão, tá gastando o chinelo!',
    'Cada real tem um endereço. Esse acabou de mudar de dono.',
    'Anotei. Não ia conseguir dormir sem saber.',
  ],
  budget_danger: [
    'Sabe quanto custou isso que você tá jogando fora?!',
    'Resta um dólar e trinta e nove centavos de leite... no chão.',
    'Quando o saldo fica negativo, sou eu quem chora.',
    'Isso não é crise financeira, é um aviso. Urgente.',
    'Com esse saldo, até o desconto custa caro.',
  ],
  budget_warning: [
    'Tira o pé do chão, tá gastando o chinelo!',
    'Mais de 70% comprometido. O outro 30% já tá nervoso.',
    'Com essa taxa, a matemática não fecha no fim do mês.',
    'Dinheiro comprometido é dinheiro que já foi. Cuidado.',
  ],
  installment_high: [
    'Todo mês, a mesma parcela. Sabe de onde sai? Do meu bolso.',
    'Parcelou, pagou. Parcelou de novo, pagou de novo. Quando acaba?',
    'Cada parcela é uma fatia da sua liberdade.',
    'A parcela é pequena. O total assusta. Mas eu conto.',
  ],
  second_job: [
    'Muito bem! Agora você tem dois empregos!',
    'Duas fontes de renda. Isso é o que eu chamo de planejamento.',
    'Segundo emprego? Continue assim. Terceiro? Ainda melhor.',
  ],
  extra_income: [
    'Renda extra entra, renda extra fica guardada. Esse é o plano.',
    'Dinheiro inesperado tem nome: reserva de emergência.',
    'Recebeu extra? Guarda metade. Julius garante.',
    'Ótimo. Não conte pra ninguém ou vão pedir emprestado.',
  ],
  budget_ok: [
    'Aprovado. Agora não gaste mais.',
    'Isso é o que acontece quando você segue o plano.',
    'Continue assim e em breve vai comprar algo... com desconto.',
    'Um dia você vai me agradecer por isso.',
  ],
}

export function getJuliusQuote(context: JuliusContext): string {
  const list = QUOTES[context]
  return list[Math.floor(Math.random() * list.length)]
}

export function getSummaryContext(s: Summary): JuliusContext | null {
  const income  = s.income_total_cents
  if (income <= 0) return null

  const committed    = s.debt_commitment_cents + s.installment_commitment_cents
  const installRatio = s.installment_commitment_cents / income
  const commitRatio  = committed / income

  if (s.balance_cents < 0) return 'budget_danger'
  if (commitRatio  > 0.60) return 'budget_warning'
  if (installRatio > 0.25) return 'installment_high'
  return 'budget_ok' // sempre aparece quando há renda configurada
}
