package entity

// Money representa valor monetário em centavos. Nunca float.
type Money int64

func (m Money) IsValid() bool      { return m > 0 }
func (m Money) IsZero() bool       { return m == 0 }
func (m Money) Add(o Money) Money  { return m + o }
func (m Money) Sub(o Money) Money  { return m - o }
func (m Money) Int64() int64       { return int64(m) }

// BasisPoints representa percentual em pontos base. 1% = 100 bps.
type BasisPoints int64
