#!/bin/bash

# InVideo Backend Start Script
# This script loads environment variables from .env and starts the Phoenix server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting InVideo Backend...${NC}"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: .env file not found at $ENV_FILE${NC}"
    echo -e "${YELLOW}Please create a .env file with the following variables:${NC}"
    echo "  GEMINI_API_KEY=your_key"
    echo "  DATABASE_URL=postgres://..."
    echo "  DATABASE_PREPARE=unnamed"
    echo "  CORS_ORIGINS=http://localhost:5173"
    echo ""
    echo -e "${YELLOW}You can copy from env.example:${NC}"
    echo "  cp ../env.example .env"
    exit 1
fi

# Load environment variables from .env file
echo -e "${GREEN}📦 Loading environment from .env...${NC}"
set -a  # automatically export all variables
source "$ENV_FILE"
set +a

# Verify required variables
MISSING_VARS=0
for var in GEMINI_API_KEY DATABASE_URL; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Missing required variable: $var${NC}"
        MISSING_VARS=1
    fi
done

if [ $MISSING_VARS -eq 1 ]; then
    echo -e "${RED}Please set all required variables in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment loaded successfully${NC}"
echo -e "${GREEN}📡 Database: ${DATABASE_URL:0:50}...${NC}"
echo -e "${GREEN}🌐 CORS Origins: $CORS_ORIGINS${NC}"
echo ""

# Start the Phoenix server
echo -e "${GREEN}🔥 Starting Phoenix server on http://localhost:${PORT:-4000}${NC}"
echo ""

exec mix phx.server
