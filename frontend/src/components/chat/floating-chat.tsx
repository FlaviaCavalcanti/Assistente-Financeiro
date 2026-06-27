import { useState, useRef, useEffect } from 'react'
import {
  MessageCircle, X, Send, Bot, User,
  AlertTriangle, Loader2, Sparkles,
} from 'lucide-react'
import { useChatStatus, useSendMessage } from '@/hooks/use-chat'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChatMessageResponse } from '@/hooks/use-chat'

interface Message {
  id:       number
  role:     'user' | 'assistant'
  text:     string
  response?: ChatMessageResponse
}

function ActionCard({ response }: { response: ChatMessageResponse }) {
  const tx = response.action?.transaction
  if (!tx) return null
  const isDebit = tx.direction === 'debit'
  return (
    <div className="mt-2 rounded-xl border border-border/60 bg-ground px-3 py-2 text-xs space-y-0.5">
      <p className="text-text-muted uppercase tracking-wider text-[10px] font-semibold">Registrado</p>
      <p className="font-semibold text-text-strong">{tx.description}</p>
      <p className={cn('font-medium', isDebit ? 'text-negative' : 'text-positive')}>
        {isDebit ? '−' : '+'}{formatMoney(tx.amount_cents)}
      </p>
      {tx.date && <p className="text-text-muted">{String(tx.date).slice(0, 10)}</p>}
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}>
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5',
        isUser ? 'bg-brand/20' : 'bg-ground-raised',
      )}>
        {isUser
          ? <User className="h-3.5 w-3.5 text-brand" />
          : <Bot  className="h-3.5 w-3.5 text-text-muted" />
        }
      </div>
      <div className={cn('max-w-[78%] flex flex-col space-y-1', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
          isUser
            ? 'rounded-tr-sm bg-brand text-white'
            : 'rounded-tl-sm bg-ground-raised text-text',
        )}>
          {msg.text}
        </div>
        {msg.response && <ActionCard response={msg.response} />}
      </div>
    </div>
  )
}

export function FloatingChat() {
  const [isOpen, setIsOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id:   0,
      role: 'assistant',
      text: 'Olá! Me diga o que gastou ou recebeu e eu registro para você. Ex.: "gastei 50 reais no mercado hoje".',
    },
  ])
  const [input, setInput] = useState('')
  const bottomRef         = useRef<HTMLDivElement>(null)

  const { data: status } = useChatStatus()
  const sendMessage      = useSendMessage()
  const chatReady        = status?.available && status?.has_model

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [messages, isOpen])

  async function handleSend() {
    const text = input.trim()
    if (!text || sendMessage.isPending) return

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text }])
    setInput('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const resp  = await sendMessage.mutateAsync({ text, date: today })
      setMessages(prev => [...prev, {
        id:       Date.now() + 1,
        role:     'assistant',
        text:     resp.reply ?? 'Entendido.',
        response: resp,
      }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao processar. Tente novamente.'
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: msg }])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* ── Painel ───────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-[88px] right-6 z-50 flex w-[360px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-border bg-ground-surface shadow-modal overflow-hidden animate-fade-slide-up"
          style={{ height: 'min(520px, calc(100vh - 7rem))' }}
        >
          {/* Cabeçalho */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border bg-ground-raised px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20">
              <Sparkles className="h-4 w-4 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-strong leading-none">Assistente IA</p>
              {status && (
                <p className={cn('text-xs mt-0.5', status.available && status.has_model ? 'text-positive' : 'text-warning')}>
                  {status.available && status.has_model
                    ? `● Pronto · ${status.model}`
                    : '● Ollama indisponível'
                  }
                </p>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-ground transition-colors"
              aria-label="Fechar assistente"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Banner de aviso */}
          {status && (!status.available || !status.has_model) && (
            <div className="flex shrink-0 items-start gap-2 border-b border-warning/20 bg-warning/5 px-4 py-2.5 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {!status.available
                  ? <>Instale o Ollama em <strong>ollama.com</strong> e execute{' '}
                      <code className="rounded bg-warning/15 px-1">ollama pull {status.model}</code></>
                  : <>Execute <code className="rounded bg-warning/15 px-1">ollama pull {status.model}</code> no terminal</>
                }
              </span>
            </div>
          )}

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {sendMessage.isPending && (
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ground-raised">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-ground-raised px-3.5 py-2 text-sm text-text-muted">
                  Processando…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Campo de entrada */}
          <div className="flex shrink-0 gap-2 border-t border-border bg-ground-surface p-3">
            <input
              className="flex-1 rounded-xl border border-border bg-ground px-3.5 py-2 text-sm outline-none transition-colors placeholder:text-text-muted/60 focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-40"
              placeholder={chatReady ? 'Registre um lançamento…' : 'Aguardando Ollama…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!chatReady || sendMessage.isPending}
            />
            <button
              onClick={handleSend}
              disabled={!chatReady || !input.trim() || sendMessage.isPending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Botão flutuante (FAB) ────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200',
          isOpen
            ? 'scale-95 border border-border bg-ground-raised text-text hover:bg-ground-raised'
            : [
                'bg-brand text-white hover:bg-brand-hover hover:scale-105',
                chatReady && 'ring-4 ring-brand/20',
              ],
        )}
        aria-label={isOpen ? 'Fechar assistente' : 'Abrir assistente IA'}
      >
        <span className={cn('transition-transform duration-200', isOpen && 'rotate-90')}>
          {isOpen
            ? <X className="h-5 w-5" />
            : <MessageCircle className="h-6 w-6" />
          }
        </span>
      </button>
    </>
  )
}
