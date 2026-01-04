#!/bin/bash

# ============================================================================
# MoveSim Setup Script
# Automated installation and setup for the Movement Transaction Simulator
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                               ║"
echo "║   🚀  MoveSim - Transaction Simulator for Movement Network  🚀               ║"
echo "║                                                                               ║"
echo "║   Setting up your development environment...                                  ║"
echo "║                                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for required tools
echo -e "${CYAN}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ is required. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"

# Check for optional tools
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
    echo -e "${GREEN}✅ pnpm $(pnpm -v) detected (will use pnpm)${NC}"
elif command -v yarn &> /dev/null; then
    PACKAGE_MANAGER="yarn"
    echo -e "${GREEN}✅ yarn $(yarn -v) detected (will use yarn)${NC}"
else
    PACKAGE_MANAGER="npm"
    echo -e "${YELLOW}ℹ️  Using npm (consider installing pnpm for faster installs)${NC}"
fi

echo ""
echo -e "${CYAN}Installing dependencies...${NC}"

# Install main project dependencies
echo -e "${BLUE}📦 Installing core dependencies...${NC}"
$PACKAGE_MANAGER install

# Install web UI dependencies
echo -e "${BLUE}📦 Installing web UI dependencies...${NC}"
cd web
$PACKAGE_MANAGER install
cd ..

echo ""
echo -e "${CYAN}Building project...${NC}"

# Build the TypeScript project
echo -e "${BLUE}🔨 Compiling TypeScript...${NC}"
$PACKAGE_MANAGER run build

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                               ║${NC}"
echo -e "${GREEN}║   ✨  Setup Complete!                                                         ║${NC}"
echo -e "${GREEN}║                                                                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Quick Start Commands:${NC}"
echo ""
echo -e "  ${YELLOW}Run the demo:${NC}"
echo "    $PACKAGE_MANAGER run demo"
echo ""
echo -e "  ${YELLOW}Start the CLI:${NC}"
echo "    $PACKAGE_MANAGER run cli -- simulate --help"
echo ""
echo -e "  ${YELLOW}Start the API server:${NC}"
echo "    $PACKAGE_MANAGER run cli -- ui"
echo ""
echo -e "  ${YELLOW}Start the Web UI:${NC}"
echo "    $PACKAGE_MANAGER run ui"
echo ""
echo -e "  ${YELLOW}Simulate a transaction:${NC}"
echo "    $PACKAGE_MANAGER run cli -- simulate \\"
echo "      --function 0x1::coin::transfer \\"
echo "      --type-args 0x1::aptos_coin::AptosCoin \\"
echo "      --args address:0x2 u64:1000000 \\"
echo "      --sender 0x1"
echo ""
echo -e "${PURPLE}Happy building! 🚀${NC}"
