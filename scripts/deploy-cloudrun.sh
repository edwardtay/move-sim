#!/bin/bash

# Deploy to Google Cloud Run
# This script automates the process of building and deploying the MoveSim backend to Cloud Run.

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 MoveSim Cloud Run Deployment Script${NC}"
echo "========================================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed.${NC}"
    echo "Please install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get Project ID
echo -e "${YELLOW}Enter your Google Cloud Project ID:${NC}"
read PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID is required.${NC}"
    exit 1
fi

# Set Project
echo "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Get Region
echo -e "${YELLOW}Enter Region (default: us-central1):${NC}"
read REGION
REGION=${REGION:-us-central1}

# Service Name
SERVICE_NAME="movesim-backend"

echo -e "${GREEN}Preparing to deploy $SERVICE_NAME to $REGION in project $PROJECT_ID...${NC}"

# Enable necessary services
echo "Enabling Cloud Build and Cloud Run APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

# Build and Submit Container
echo -e "${YELLOW}Building container image...${NC}"
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars NETWORK=testnet

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "Your service URL should be listed above."
