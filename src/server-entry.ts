/**
 * Cloud Run Entry Point
 * 
 * This file serves as the entry point for the containerized application.
 * It reads the PORT environment variable (automatically set by Cloud Run)
 * and starts the API server.
 */

import { startServer } from "./api/server";

// Cloud Run sets the PORT environment variable. Default to 8080 if not set.
const PORT = parseInt(process.env.PORT || "8080", 10);
const NETWORK = process.env.NETWORK || "testnet";

console.log(`Starting MoveSim Server...`);
console.log(`Port: ${PORT}`);
console.log(`Network: ${NETWORK}`);

startServer(PORT, NETWORK as any)
    .then(() => {
        console.log("Server started successfully");
    })
    .catch((error) => {
        console.error("Failed to start server:", error);
        process.exit(1);
    });
