package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/llm"
)

const systemPromptTpl = `Você é um extrator de dados financeiros pessoais. Analise a mensagem do usuário e retorne SOMENTE JSON válido.

SCHEMA OBRIGATÓRIO (todos os campos obrigatórios):
{
  "intent": "create_expense" | "create_income" | "unknown",
  "amount_cents": integer,
  "description": string,
  "category_id": string,
  "date": "YYYY-MM-DD",
  "reply": string
}

REGRAS:
- "gastei", "comprei", "paguei", "saiu" → intent = "create_expense"
- "recebi", "ganhei", "entrou", "caiu" → intent = "create_income"
- Sem valor monetário claro → intent = "unknown", amount_cents = 0
- amount_cents é inteiro em centavos: R$1,00 = 100, R$50,00 = 5000
- date: use a data mencionada ou "%s" (hoje) se não informada
- category_id: escolha o ID mais adequado da lista abaixo; use "" se nenhuma servir
- reply: mensagem curta e amigável em português confirmando o que foi entendido

CATEGORIAS DISPONÍVEIS:
%s

Responda APENAS com o JSON, sem explicações, sem markdown.`

type chatIntent struct {
	Intent      string `json:"intent"`
	AmountCents int64  `json:"amount_cents"`
	Description string `json:"description"`
	CategoryID  string `json:"category_id"`
	Date        string `json:"date"`
	Reply       string `json:"reply"`
}

type ChatAction struct {
	Type        string               `json:"type"`
	Transaction *entity.Transaction  `json:"transaction,omitempty"`
}

type ChatResponse struct {
	Reply  string      `json:"reply"`
	Action *ChatAction `json:"action,omitempty"`
}

type SendMessageInput struct {
	Text string
	Date string // YYYY-MM-DD; usa hoje se vazio
}

type chatService struct {
	ollama      *llm.Client
	categorySvc CategoryService
	txSvc       TransactionService
}

func NewChatService(ollama *llm.Client, categorySvc CategoryService, txSvc TransactionService) ChatService {
	return &chatService{
		ollama:      ollama,
		categorySvc: categorySvc,
		txSvc:       txSvc,
	}
}

func (s *chatService) Status(ctx context.Context) (bool, bool) {
	available := s.ollama.IsAvailable(ctx)
	if !available {
		return false, false
	}
	hasModel := s.ollama.HasModel(ctx)
	return true, hasModel
}

func (s *chatService) SendMessage(ctx context.Context, input SendMessageInput) (ChatResponse, error) {
	ctxCheck, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if !s.ollama.IsAvailable(ctxCheck) {
		return ChatResponse{}, errors.New("ollama não está disponível — verifique se ele está instalado e rodando")
	}

	today := input.Date
	if today == "" {
		today = time.Now().Format("2006-01-02")
	}

	// Monta lista de categorias para o prompt
	cats, err := s.categorySvc.List(ctx)
	if err != nil {
		cats = nil
	}
	var catLines strings.Builder
	for _, c := range cats {
		fmt.Fprintf(&catLines, "- ID: %s, Nome: %s\n", c.ID, c.Name)
	}

	systemPrompt := fmt.Sprintf(systemPromptTpl, today, catLines.String())

	ctxLLM, cancelLLM := context.WithTimeout(ctx, 90*time.Second)
	defer cancelLLM()

	raw, err := s.ollama.Generate(ctxLLM, systemPrompt, input.Text)
	if err != nil {
		return ChatResponse{}, fmt.Errorf("erro ao consultar ollama: %w", err)
	}

	var intent chatIntent
	if err := json.Unmarshal([]byte(raw), &intent); err != nil {
		// fallback: retorna a resposta bruta se o JSON não parsear
		return ChatResponse{Reply: "Não consegui entender. Pode reformular?"}, nil
	}

	reply := intent.Reply
	if reply == "" {
		reply = "Entendido."
	}

	switch intent.Intent {
	case "create_expense":
		if intent.AmountCents <= 0 {
			return ChatResponse{Reply: "Não identifiquei o valor. Quanto foi?"}, nil
		}
		desc := intent.Description
		if desc == "" {
			desc = "Gasto via chat"
		}
		tx, err := s.txSvc.Create(ctx, CreateTransactionInput{
			Date:        intent.Date,
			Description: desc,
			AmountCents: entity.Money(intent.AmountCents),
			Direction:   entity.DirectionDebit,
			CategoryID:  intent.CategoryID,
			Note:        "criado via chat",
		})
		if err != nil {
			return ChatResponse{}, fmt.Errorf("erro ao registrar lançamento: %w", err)
		}
		return ChatResponse{
			Reply:  reply,
			Action: &ChatAction{Type: "created_transaction", Transaction: &tx},
		}, nil

	case "create_income":
		if intent.AmountCents <= 0 {
			return ChatResponse{Reply: "Não identifiquei o valor. Quanto foi?"}, nil
		}
		desc := intent.Description
		if desc == "" {
			desc = "Receita via chat"
		}
		tx, err := s.txSvc.Create(ctx, CreateTransactionInput{
			Date:        intent.Date,
			Description: desc,
			AmountCents: entity.Money(intent.AmountCents),
			Direction:   entity.DirectionCredit,
			CategoryID:  intent.CategoryID,
			Note:        "criado via chat",
		})
		if err != nil {
			return ChatResponse{}, fmt.Errorf("erro ao registrar lançamento: %w", err)
		}
		return ChatResponse{
			Reply:  reply,
			Action: &ChatAction{Type: "created_transaction", Transaction: &tx},
		}, nil

	default:
		return ChatResponse{Reply: reply}, nil
	}
}
