# MoveSim Cloud Run Deployment Guide

This guide describes how to deploy the MoveSim backend to Google Cloud Run.

## Prerequisites

1.  **Google Cloud SDK (`gcloud`)**: Install and authenticate.
    ```bash
    gcloud auth login
    ```
2.  **Google Cloud Project**: Create a new project with billing enabled.

## Automatic Deployment

We have provided a script to automate the deployment process.

1.  Run the deployment script:
    ```bash
    ./scripts/deploy-cloudrun.sh
    ```
2.  Follow the prompts:
    - Enter your **Project ID**.
    - Enter the **Region** (e.g., `us-central1`).

The script will:
- Build the Docker container.
- Push it to Google Container Registry (GCR).
- Deploy it to Cloud Run.
- Allow unauthenticated invocations (public access).
- Set the `NETWORK` environment variable to `testnet` (default).

## Manual Deployment

If you prefer to deploy manually:

1.  **Build the container:**
    ```bash
    gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/movesim-backend
    ```

2.  **Deploy to Cloud Run:**
    ```bash
    gcloud run deploy movesim-backend \
      --image gcr.io/YOUR_PROJECT_ID/movesim-backend \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --port 8080 \
      --set-env-vars NETWORK=testnet
    ```

## Environment Variables

- `PORT`: The port the server listens on (Cloud Run sets this automatically to 8080).
- `NETWORK`: The default network to connect to (`testnet`, `mainnet`, `devnet`, `local`). Default is `testnet`.
