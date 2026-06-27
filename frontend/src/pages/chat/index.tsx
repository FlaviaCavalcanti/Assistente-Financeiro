import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { useChatStatus, useSendMessage } from '@/hooks/use-chat'
import { formatMoney } from '@/lib/format'
import type { ChatMessageResponse } from '@/hooks/use-chat'

// ─── tipos locais ────────────────────────────────────────────────────────────

interface Message {
  id:       number
  role:     'user' | 'assistant'
  text:     string
  response?: ChatMessageResponse
}

// ─── StatusBanner ─────────────────────────────────────────────────────────────

function StatusBanner({ available, hasModel, model }: { available: boolean; hasModel: boolean; model: string }) {
  if (!available) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Ollama não encontrado. Instale em <strong>ollama.com</strong> e execute{' '}
          <code className="rounded bg-warning/20 px-1">ollama pull {model}</code>.
        </span>
      </div>
    )
  }
  if (!hasModel) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Modelo não encontrado. Execute{' '}
          <code className="rounded bg-warning/20 px-1">ollama pull {model}</code> no terminal.
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-positive/30 bg-positive/10 px-3 py-2 text-xs text-positive">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      <span>Assistente pronto · {model}</span>
    </div>
  )
}

// ─── ActionCard ───────────────────────────────────────────────────────────────

function ActionCard({ response }: { response: ChatMessageResponse }) {
  const tx = response.action?.transaction
  if (!tx) return null

  const isDebit = tx.direction === 'debit'
  return (
    <div className="mt-2 rounded-lg border border-border bg-ground-raised px-3 py-2 text-xs space-y-0.5">
      <p className="font-medium text-subtle uppercase tracking-wide">Lançamento registrado</p>
      <p className="font-semibold">{tx.description}</p>
      <p className={isDebit ? 'text-negative' : 'text-positive'}>
        {isDebit ? '−' : '+'}{formatMoney(tx.amount_cents)}
      </p>
      <p className="text-subtle">{tx.date ? String(tx.date).slice(0, 10) : ''}</p>
    </div>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-brand/20' : 'bg-ground-raised'}`}>
        {isUser
          ? <User className="h-4 w-4 text-brand" />
          : <Bot  className="h-4 w-4 text-subtle" />
        }
      </div>
      <div className={`max-w-[75%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-tr-sm bg-brand text-white'
            : 'rounded-tl-sm bg-ground-raised text-text'
        }`}>
          {msg.text}
        </div>
        {msg.response && <ActionCard response={msg.response} />}
      </div>
    </div>
  )
}

// ─── ChatPage ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id:   0,
      role: 'assistant',
      text: 'Olá! Pode me dizer o que gastou ou recebeu, e eu registro para você. Exemplo: "gastei 50 reais no mercado hoje".',
    },
  ])
  const [input, setInput]   = useState('')
  const bottomRef           = useRef<HTMLDivElement>(null)

  const { data: status }    = useChatStatus()
  const sendMessage         = useSendMessage()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sendMessage.isPending) return

    const userMsg: Message = { id: Date.now(), role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const resp  = await sendMessage.mutateAsync({ text, date: today })
      const assistantMsg: Message = {
        id:       Date.now() + 1,
        role:     'assistant',
        text:     resp.reply ?? 'Entendido.',
        response: resp,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e: any) {
      const errMsg: Message = {
        id:   Date.now() + 1,
        role: 'assistant',
        text: e?.message ?? 'Erro ao processar a mensagem. Tente novamente.',
      }
      setMessages(prev => [...prev, errMsg])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const chatReady = status?.available && status?.has_model

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-4">
      <PageHeader title="Assistente" description="Registre lançamentos por linguagem natural" />

      {status && (
        <StatusBanner
          available={status.available}
          hasModel={status.has_model}
          model={status.model}
        />
      )}

      {/* Histórico */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-ground-surface p-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {sendMessage.isPending && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ground-raised">
              <Loader2 className="h-4 w-4 animate-spin text-subtle" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-ground-raised px-4 py-2.5 text-sm text-subtle">
              Processando…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-border bg-ground-surface px-4 py-3 text-sm outline-none placeholder:text-subtle focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50"
          placeholder={chatReady ? 'Ex.: gastei 45 reais no almoço hoje…' : 'Aguardando Ollama…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!chatReady || sendMessage.isPending}
        />
        <Button
          onClick={handleSend}
          disabled={!chatReady || !input.trim() || sendMessage.isPending}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
