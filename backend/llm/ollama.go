package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

const (
	DefaultURL   = "http://localhost:11434"
	DefaultModel = "qwen2.5:3b"
)

type Client struct {
	baseURL string
	Model   string
	http    *http.Client
}

func NewClient(baseURL, model string) *Client {
	if baseURL == "" {
		baseURL = DefaultURL
	}
	if model == "" {
		model = DefaultModel
	}
	return &Client{
		baseURL: baseURL,
		Model:   model,
		http:    &http.Client{Timeout: 120 * time.Second},
	}
}

func (c *Client) IsAvailable(ctx context.Context) bool {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/tags", nil)
	if err != nil {
		return false
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func (c *Client) HasModel(ctx context.Context) bool {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/tags", nil)
	if err != nil {
		return false
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	var tags struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tags); err != nil {
		return false
	}
	for _, m := range tags.Models {
		if strings.HasPrefix(m.Name, c.Model) {
			return true
		}
	}
	return false
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
	Stream   bool          `json:"stream"`
	Format   string        `json:"format"`
}

type chatResponse struct {
	Message chatMessage `json:"message"`
}

func (c *Client) Generate(ctx context.Context, systemPrompt, userMsg string) (string, error) {
	body, err := json.Marshal(chatRequest{
		Model: c.Model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userMsg},
		},
		Stream: false,
		Format: "json",
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/chat", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("ollama indisponível: %w", err)
	}
	defer resp.Body.Close()

	var result chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("resposta inválida do ollama: %w", err)
	}
	return result.Message.Content, nil
}

// EnsureRunning verifica se o Ollama está rodando e tenta iniciá-lo se necessário.
func EnsureRunning() error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	c := NewClient("", "")
	if c.IsAvailable(ctx) {
		return nil
	}

	cmd := exec.Command("ollama", "serve")
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("não foi possível iniciar o ollama: %w", err)
	}

	for i := 0; i < 15; i++ {
		time.Sleep(time.Second)
		ctx2, cancel2 := context.WithTimeout(context.Background(), 2*time.Second)
		ok := c.IsAvailable(ctx2)
		cancel2()
		if ok {
			return nil
		}
	}
	return fmt.Errorf("ollama não respondeu após 15s")
}
