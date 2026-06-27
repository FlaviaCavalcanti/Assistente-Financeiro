package endpoint

import (
	"context"

	"github.com/go-kit/kit/endpoint"
	"github.com/maya/financeiro/service"
)

type ChatEndpoints struct {
	Status      endpoint.Endpoint
	SendMessage endpoint.Endpoint
}

func MakeChatEndpoints(svc service.ChatService) ChatEndpoints {
	return ChatEndpoints{
		Status:      makeChatStatusEndpoint(svc),
		SendMessage: makeSendMessageEndpoint(svc),
	}
}

// --- Status ---

type ChatStatusResponse struct {
	Available bool   `json:"available"`
	HasModel  bool   `json:"has_model"`
	Model     string `json:"model"`
	Err       error  `json:"-"`
}

func (r ChatStatusResponse) Failed() error { return r.Err }

// --- SendMessage ---

type SendMessageRequest struct {
	Text string `json:"text"`
	Date string `json:"date"`
}

type SendMessageResponse struct {
	service.ChatResponse
	Err error `json:"-"`
}

func (r SendMessageResponse) Failed() error { return r.Err }

// --- makers ---

func makeChatStatusEndpoint(svc service.ChatService) endpoint.Endpoint {
	return func(ctx context.Context, _ interface{}) (interface{}, error) {
		available, hasModel := svc.Status(ctx)
		return ChatStatusResponse{Available: available, HasModel: hasModel, Model: "qwen2.5:3b"}, nil
	}
}

func makeSendMessageEndpoint(svc service.ChatService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(SendMessageRequest)
		resp, err := svc.SendMessage(ctx, service.SendMessageInput{
			Text: req.Text,
			Date: req.Date,
		})
		return SendMessageResponse{ChatResponse: resp, Err: err}, nil
	}
}
