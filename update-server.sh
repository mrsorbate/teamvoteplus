#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

error_exit() {
    echo -e "${RED}❌ Fehler: $1${NC}" >&2
    exit 1
}

ensure_env_key() {
    local key="$1"
    local value="$2"
    local file="$3"

    if grep -qE "^${key}=" "$file"; then
        sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file"
    else
        printf '\n%s=%s\n' "$key" "$value" >> "$file"
    fi
}

get_env_value() {
    local key="$1"
    local file="$2"

    grep -E "^${key}=" "$file" | tail -n 1 | sed -E "s/^${key}=//"
}

echo -e "${BLUE}🔄 teamvote+ - Server Update${NC}\n"

if [ ! -f "docker-compose.yml" ]; then
    error_exit "Bitte im Repository-Root ausführen."
fi

if [ "$(id -u)" -ne 0 ]; then
    error_exit "Bitte mit sudo oder als root ausführen."
fi

if [ ! -f ".env" ]; then
    error_exit ".env fehlt. Zuerst ./setup-server.sh ausführen."
fi

if [ "${COMPOSE_FILE}" = "docker-compose.yml" ] && [ -f "docker-compose.prod.yml" ]; then
    DOMAIN_VALUE="$(get_env_value "DOMAIN" ".env" || true)"
    if [ -n "$(echo "${DOMAIN_VALUE}" | tr -d '[:space:]')" ]; then
        COMPOSE_FILE="docker-compose.prod.yml"
        echo -e "${YELLOW}ℹ️  DOMAIN in .env erkannt - nutze automatisch ${COMPOSE_FILE}${NC}"
    fi
fi

echo -e "${BLUE}💾 Erstelle .env-Backup...${NC}"
cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}📥 Hole neue Version...${NC}"
git pull

if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    if command -v npm >/dev/null 2>&1; then
        echo -e "${BLUE}📝 Erzeuge Release-Notes...${NC}"
        (cd frontend && npm run release-notes)
    else
        echo -e "${YELLOW}⚠️  npm nicht gefunden - nutze vorhandene Release-Notes aus dem Build.${NC}"
    fi
fi

echo -e "${BLUE}🧩 Prüfe .env-Werte...${NC}"

echo -e "${BLUE}🐳 Baue und starte Container neu...${NC}"
docker compose --env-file .env -f "$COMPOSE_FILE" up -d --build --remove-orphans

echo -e "\n${GREEN}✅ Update erfolgreich${NC}\n"
docker compose --env-file .env -f "$COMPOSE_FILE" ps
echo -e "\n${YELLOW}Logs:${NC} docker compose --env-file .env -f ${COMPOSE_FILE} logs -f"
