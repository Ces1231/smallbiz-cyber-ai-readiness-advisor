COMPOSE = docker compose --env-file .env.docker

.PHONY: up down logs reset ports open shell-db shell-backend test build

up:
	$(COMPOSE) up -d
	@echo ""
	@echo "Stack is starting. Run 'make ports' once containers are healthy (~30s)."

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d --build

## Show auto-assigned host ports for user-accessible services
ports:
	@FRONTEND=$$($(COMPOSE) port frontend 80 2>/dev/null | awk -F: '{print $$NF}'); \
	DB=$$($(COMPOSE) port db 5432 2>/dev/null | awk -F: '{print $$NF}'); \
	echo ""; \
	echo "  Frontend:      http://localhost:$$FRONTEND"; \
	echo "  API docs:      http://localhost:$$FRONTEND/api/docs"; \
	echo "  Postgres:      localhost:$$DB  (user: postgres)"; \
	echo ""

## Open the frontend in the default browser (Linux: xdg-open, macOS: open)
open:
	@PORT=$$($(COMPOSE) port frontend 80 2>/dev/null | awk -F: '{print $$NF}'); \
	URL="http://localhost:$$PORT"; \
	echo "Opening $$URL"; \
	xdg-open "$$URL" 2>/dev/null || open "$$URL" 2>/dev/null || echo "Visit: $$URL"

shell-db:
	$(COMPOSE) exec db psql -U postgres -d postgres

shell-backend:
	$(COMPOSE) exec backend bash

## Run backend unit tests (mocked — no Docker needed)
test:
	cd backend && python -m pytest tests/ -v

build:
	$(COMPOSE) build backend
