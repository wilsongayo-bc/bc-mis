#!/usr/bin/env bash
set -euo pipefail

REPO_DIR_DEFAULT="/opt/bc-mis"
if [ ! -d "$REPO_DIR_DEFAULT" ]; then
  # Fallback to current directory if default path doesn't exist
  # This allows running locally or in different environments
  REPO_DIR_DEFAULT="$(pwd)"
fi
DOMAIN_DEFAULT="api.benedictcollege.com"
BRANCH_DEFAULT="main"
SERVICE_DEFAULT="api"
COMPOSE_FILE="docker-compose.prod.yml"
API_CONTAINER_DEFAULT="bc-api"
SERVICE=""
API_CONTAINER=""
RELOAD_NGINX=false
DEBUG_LOGS=false
IMPORT_SUBJECTS=false
SEED_DATABASE=false
CONFIRM_IMPORT=false
REMOVE_ORPHANS=false
REMOTE_URL=""
GIT_USER=""
GIT_TOKEN=""
INSECURE_CURL=false
BRANCH=""

# Detect docker-compose command
DOCKER_COMPOSE="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        echo "Error: docker-compose or docker compose not found."
        exit 1
    fi
fi

POS=()
for ARG in "$@"; do
  case "$ARG" in
    --reload-nginx) RELOAD_NGINX=true ;;
    --debug-logs) DEBUG_LOGS=true ;;
    --import-subjects) IMPORT_SUBJECTS=true ;;
    --seed) SEED_DATABASE=true ;;
    --confirm-import) CONFIRM_IMPORT=true ;;
    --remove-orphans) REMOVE_ORPHANS=true ;;
    --insecure) INSECURE_CURL=true ;;
    --remote-url=*) REMOTE_URL="${ARG#*=}" ;;
    --user=*) GIT_USER="${ARG#*=}" ;;
    --token=*) GIT_TOKEN="${ARG#*=}" ;;
    --branch=*) BRANCH="${ARG#*=}" ;;
    --service=*) SERVICE="${ARG#*=}" ;;
    --container=*) API_CONTAINER="${ARG#*=}" ;;
    *) POS+=("$ARG") ;;
  esac
done

REPO_DIR="${POS[0]:-$REPO_DIR_DEFAULT}"
DOMAIN="${POS[1]:-$DOMAIN_DEFAULT}"
BRANCH="${BRANCH:-$BRANCH_DEFAULT}"
SERVICE="${SERVICE:-$SERVICE_DEFAULT}"

if [ "$SERVICE" = "api_uat" ]; then
  echo "Error: api_uat is not configured in docker-compose.prod.yml."
  exit 1
fi

if [ -z "$API_CONTAINER" ]; then
  if [ "$SERVICE" = "api_uat" ]; then
    API_CONTAINER="bc-api-uat"
  else
    API_CONTAINER="$API_CONTAINER_DEFAULT"
  fi
fi

cd "$REPO_DIR"

if [ -z "$GIT_TOKEN" ] && [ -n "${GITHUB_TOKEN:-}" ]; then
  GIT_TOKEN="$GITHUB_TOKEN"
fi

if [ -n "$REMOTE_URL" ]; then
  git remote set-url origin "$REMOTE_URL"
elif [ -n "$GIT_USER" ] && [ -n "$GIT_TOKEN" ]; then
  CURRENT_URL=$(git remote get-url origin)
  if echo "$CURRENT_URL" | grep -qE '^https://github.com/'; then
    OWNER_REPO=$(echo "$CURRENT_URL" | sed -E 's#https://github.com/##')
    git remote set-url origin "https://$GIT_USER:$GIT_TOKEN@github.com/$OWNER_REPO"
  fi
elif [ -n "$GIT_TOKEN" ]; then
  CURRENT_URL=$(git remote get-url origin)
  if echo "$CURRENT_URL" | grep -qE '^https://([^@]+@)?github.com/'; then
    OWNER_REPO=$(echo "$CURRENT_URL" | sed -E 's#https://([^@]+@)?github.com/##')
    git remote set-url origin "https://x-access-token:$GIT_TOKEN@github.com/$OWNER_REPO"
  elif echo "$CURRENT_URL" | grep -qE '^git@github.com:'; then
    OWNER_REPO=$(echo "$CURRENT_URL" | sed -E 's#git@github.com:##')
    git remote set-url origin "https://x-access-token:$GIT_TOKEN@github.com/$OWNER_REPO"
  fi
fi

if [ -n "$GIT_TOKEN" ]; then
  git config --local url."https://x-access-token:$GIT_TOKEN@github.com/".insteadOf https://github.com/
fi

git remote -v | sed -E 's#https://[^@]+@github.com/#https://github.com/#g'

git fetch --all
git reset --hard "origin/$BRANCH"

$DOCKER_COMPOSE -f "$COMPOSE_FILE" build "$SERVICE"

# Ensure old container is removed to avoid conflicts
echo "Stopping and removing old api container if exists..."
docker stop "$API_CONTAINER" || true
docker rm -f "$API_CONTAINER" || true

if [ "$REMOVE_ORPHANS" = true ]; then
  $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d --remove-orphans "$SERVICE"
else
  $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d "$SERVICE"
fi

ATTEMPTS=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$API_CONTAINER")" = "healthy" ] || [ $ATTEMPTS -ge 20 ]; do
  ATTEMPTS=$((ATTEMPTS+1))
  sleep 3
done

if [ "$(docker inspect -f '{{.State.Health.Status}}' "$API_CONTAINER")" != "healthy" ]; then
  if [ "$DEBUG_LOGS" = true ]; then
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=200 "$SERVICE" || true
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=200 nginx || true
  fi
  exit 1
fi

if ! $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T "$SERVICE" sh -c "if [ -f api/dist/scripts/run-migrations.js ]; then echo 'Running migrations from api/dist...'; node api/dist/scripts/run-migrations.js; elif [ -f dist/scripts/run-migrations.js ]; then echo 'Running migrations from dist...'; node dist/scripts/run-migrations.js; else echo 'Migration script not found in expected paths'; exit 2; fi"; then
  echo "Primary migration command failed. Trying npm script..."
  if ! $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T "$SERVICE" sh -c "npm run migrate:prod"; then
    echo "Migration failed using npm script as well.";
    if [ "$DEBUG_LOGS" = true ]; then
      $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=200 "$SERVICE" || true
    fi
    exit 1
  fi
fi

if [ "$SEED_DATABASE" = true ]; then
  echo "Seeding database..."
  if ! $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T "$SERVICE" sh -c "npm run seed"; then
    echo "Seeding failed.";
    if [ "$DEBUG_LOGS" = true ]; then
      $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=200 "$SERVICE" || true
    fi
    exit 1
  fi
fi

if [ "$IMPORT_SUBJECTS" = true ]; then
  if [ "$CONFIRM_IMPORT" != true ]; then
    echo "Subject import requested but not confirmed. Skipping import and continuing deployment.";
  else
    echo "Importing subjects from templates..."
    if ! $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T "$SERVICE" sh -c "cd api && npm run import-subjects:prod"; then
      echo "Subject import failed.";
      if [ "$DEBUG_LOGS" = true ]; then
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=200 "$SERVICE" || true
      fi
      exit 1
    fi
  fi
fi

if [ "$RELOAD_NGINX" = true ]; then
  echo "Reloading Nginx..."
  if ! docker ps --format '{{.Names}}' | grep -qx 'bc-nginx'; then
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d nginx
  fi

  NGINX_CONTAINER_ID="$($DOCKER_COMPOSE -f "$COMPOSE_FILE" ps -q nginx 2>/dev/null || true)"
  ATTEMPTS=0
  until [ -z "$NGINX_CONTAINER_ID" ] || [ "$(docker inspect -f '{{.State.Status}}' "$NGINX_CONTAINER_ID" 2>/dev/null || true)" = "running" ]; do
    ATTEMPTS=$((ATTEMPTS+1))
    if [ $ATTEMPTS -ge 20 ]; then
      echo "Nginx container is not running (status: $(docker inspect -f '{{.State.Status}}' "$NGINX_CONTAINER_ID" 2>/dev/null || echo 'unknown'))."
      if [ "$DEBUG_LOGS" = true ]; then
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=200 nginx || true
      fi
      exit 1
    fi
    sleep 2
  done

  $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T nginx nginx -s reload
fi

echo "Deployment successful!"
