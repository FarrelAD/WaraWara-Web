package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/config"
	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/handlers"
)

// corsMiddleware enables cross-origin requests for testing and integration.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	cfg := config.LoadConfig()
	cfg.Validate()

	mux := http.NewServeMux()

	// API Routes
	mux.HandleFunc("GET /api/vapid-public-key", handlers.HandleVapidPublicKey)
	mux.HandleFunc("POST /api/subscribe", handlers.HandleSubscribe)
	mux.HandleFunc("POST /api/send-notification", handlers.HandleSendNotification)

	// Static Files (Frontend UI & Service Worker)
	fs := http.FileServer(http.Dir("./public"))
	mux.Handle("/", fs)

	addr := fmt.Sprintf(":%s", cfg.Port)
	server := &http.Server{
		Addr:         addr,
		Handler:      corsMiddleware(mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Channel to catch OS interrupt signals
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Println("==================================================")
		log.Printf("? WaraWara Web Push Server (Golang) running!\n")
		log.Printf("?? URL: http://localhost:%s\n", cfg.Port)
		log.Printf("?? Public Key Loaded: %t\n", cfg.VapidPublicKey != "")
		log.Println("==================================================")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	<-stop
	log.Println("\nShutting down server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited cleanly.")
}
