package entity

import (
	"errors"
	"time"
)

type GoalKind string

const (
	GoalKindEmergencyFund GoalKind = "emergency_fund"
	GoalKindPurchase      GoalKind = "purchase"
)

type Goal struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Kind         GoalKind  `json:"kind"`
	TargetCents  Money     `json:"target_cents"`  // valor alvo em centavos
	TargetMonths int       `json:"target_months"` // para reserva: quantos meses de despesa
	CurrentCents Money     `json:"current_cents"` // quanto já foi guardado
	Deadline     string    `json:"deadline"`      // YYYY-MM, opcional
	Icon         string    `json:"icon"`
	Color        string    `json:"color"`
	Active       bool      `json:"active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (g Goal) Validate() error {
	if g.Name == "" {
		return errors.New("nome da meta é obrigatório")
	}
	if g.Kind != GoalKindEmergencyFund && g.Kind != GoalKindPurchase {
		return errors.New("tipo de meta inválido")
	}
	if g.Kind == GoalKindPurchase && !g.TargetCents.IsValid() {
		return errors.New("valor alvo deve ser maior que zero para compra planejada")
	}
	if g.Kind == GoalKindEmergencyFund && g.TargetMonths <= 0 {
		return errors.New("número de meses deve ser maior que zero para reserva de emergência")
	}
	if g.CurrentCents < 0 {
		return errors.New("valor atual não pode ser negativo")
	}
	return nil
}

func (g Goal) RemainingCents() Money {
	if g.CurrentCents >= g.TargetCents {
		return 0
	}
	return g.TargetCents - g.CurrentCents
}

func (g Goal) ProgressBPS() int {
	if g.TargetCents <= 0 {
		return 0
	}
	bps := int(g.CurrentCents.Int64() * 10000 / g.TargetCents.Int64())
	if bps > 10000 {
		return 10000
	}
	return bps
}

func (g Goal) IsComplete() bool {
	return g.TargetCents > 0 && g.CurrentCents >= g.TargetCents
}
