package entity

import "errors"

var (
	ErrNotFound        = errors.New("not found")
	ErrInvalidMoney    = errors.New("valor monetário deve ser maior que zero")
	ErrInvalidDay      = errors.New("dia deve estar entre 1 e 31")
	ErrConflict        = errors.New("operação viola uma regra de negócio")
	ErrSystemCategory  = errors.New("categorias do sistema não podem ser removidas")
	ErrHasDependencies = errors.New("entidade possui dependências ativas")
)
