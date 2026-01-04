/**
 * MoveSim API Server
 * RESTful API server for the MoveSim web UI
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { WebSocket, WebSocketServer } from "ws";
import { createServer } from "http";
import { MoveSimulator, createSimulator } from "../core/simulator";
import { ConflictAnalyzer } from "../core/analyzer";
import { NetworkType, TransactionPayload, SimulationResult, Invariant } from "../types";

// ============================================================================
// Types
// ============================================================================

interface SimulateRequest extends TransactionPayload {
  network?: NetworkType;
  rpcUrl?: string;
}

interface CheckRequest extends SimulateRequest {
  invariants: Invariant[];
}

interface BatchRequest {
  payloads: TransactionPayload[];
  network?: NetworkType;
  rpcUrl?: string;
}

interface WebSocketMessage {
  type: "simulate" | "subscribe" | "unsubscribe";
  payload: unknown;
  id?: string;
}

// ============================================================================
// Server State
// ============================================================================

let simulator: MoveSimulator;
const simulationHistory: SimulationResult[] = [];
const MAX_HISTORY = 100;

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// API Routes
// ============================================================================

/**
 * Health check endpoint
 */
app.get("/health", (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      version: "1.0.0",
      network: simulator.getNetwork(),
    },
    timestamp: Date.now(),
  });
});

/**
 * Get current configuration
 */
app.get("/api/config", (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      network: simulator.getNetwork(),
      networks: ["mainnet", "testnet", "devnet", "local"],
    },
    timestamp: Date.now(),
  });
});

/**
 * Switch network
 */
app.post("/api/network", async (req: Request, res: Response): Promise<void> => {
  try {
    const { network, rpcUrl } = req.body;

    if (!network) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Network is required",
        },
        timestamp: Date.now(),
      });
      return;
    }

    await simulator.switchNetwork(network as NetworkType, rpcUrl);

    res.json({
      success: true,
      data: {
        network: simulator.getNetwork(),
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "NETWORK_SWITCH_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: Date.now(),
    });
  }
});

/**
 * Simulate a transaction
 */
app.post(
  "/api/simulate",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const payload: SimulateRequest = req.body;

      // Validate required fields
      if (!payload.sender || !payload.function) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Sender and function are required",
          },
          timestamp: Date.now(),
        });
        return;
      }

      // Switch network if specified
      if (payload.network && payload.network !== simulator.getNetwork()) {
        await simulator.switchNetwork(payload.network, payload.rpcUrl);
      }

      // Run simulation
      const result = await simulator.simulate({
        sender: payload.sender,
        function: payload.function,
        typeArgs: payload.typeArgs || [],
        args: payload.args || [],
        maxGasAmount: payload.maxGasAmount,
        gasUnitPrice: payload.gasUnitPrice,
        expirationSeconds: payload.expirationSeconds,
      });

      // Analyze conflicts
      const conflictReport = ConflictAnalyzer.analyze(result);

      // Add to history
      addToHistory(result);

      res.json({
        success: true,
        data: {
          ...result,
          conflictReport
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: "SIMULATION_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: Date.now(),
      });
    }
  },
);

/**
 * Get state diff for a transaction
 */
app.post("/api/diff", async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: SimulateRequest = req.body;

    if (!payload.sender || !payload.function) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Sender and function are required",
        },
        timestamp: Date.now(),
      });
      return;
    }

    const diff = await simulator.getStateDiff({
      sender: payload.sender,
      function: payload.function,
      typeArgs: payload.typeArgs || [],
      args: payload.args || [],
    });

    res.json({
      success: true,
      data: diff,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "DIFF_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: Date.now(),
    });
  }
});

/**
 * Analyze gas usage
 */
app.post("/api/gas", async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: SimulateRequest = req.body;

    if (!payload.sender || !payload.function) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Sender and function are required",
        },
        timestamp: Date.now(),
      });
      return;
    }

    const report = await simulator.analyzeGas({
      sender: payload.sender,
      function: payload.function,
      typeArgs: payload.typeArgs || [],
      args: payload.args || [],
    });

    res.json({
      success: true,
      data: report,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "GAS_ANALYSIS_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: Date.now(),
    });
  }
});

/**
 * Get execution trace
 */
app.post("/api/trace", async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: SimulateRequest = req.body;

    if (!payload.sender || !payload.function) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Sender and function are required",
        },
        timestamp: Date.now(),
      });
      return;
    }

    const trace = await simulator.trace({
      sender: payload.sender,
      function: payload.function,
      typeArgs: payload.typeArgs || [],
      args: payload.args || [],
    });

    res.json({
      success: true,
      data: trace,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "TRACE_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: Date.now(),
    });
  }
});

/**
 * Get module information
 */
app.get(
  "/api/module/:address/:name",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { address, name } = req.params;

      const moduleInfo = await simulator.getModule(address, name);

      res.json({
        success: true,
        data: moduleInfo,
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: "MODULE_FETCH_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: Date.now(),
      });
    }
  },
);

/**
 * Get account information
 */
app.get(
  "/api/account/:address",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { address } = req.params;

      const accountInfo = await simulator.getAccountInfo(address);

      res.json({
        success: true,
        data: accountInfo,
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: "ACCOUNT_FETCH_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: Date.now(),
      });
    }
  },
);

/**
 * Get simulation history
 */
app.get("/api/history", (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      transactions: simulationHistory,
      total: simulationHistory.length,
    },
    timestamp: Date.now(),
  });
});

/**
 * Clear simulation history
 */
app.delete("/api/history", (_req: Request, res: Response): void => {
  simulationHistory.length = 0;
  res.json({
    success: true,
    data: {
      message: "History cleared",
    },
    timestamp: Date.now(),
  });
});

/**
 * Check invariants
 */
app.post("/api/check", async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: CheckRequest = req.body;

    if (!payload.sender || !payload.function || !payload.invariants) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Sender, function, and invariants are required",
        },
        timestamp: Date.now(),
      });
      return;
    }

    if (payload.network && payload.network !== simulator.getNetwork()) {
      await simulator.switchNetwork(payload.network, payload.rpcUrl);
    }

    const result = await simulator.simulate({
      sender: payload.sender,
      function: payload.function,
      typeArgs: payload.typeArgs || [],
      args: payload.args || [],
    });

    const violations = simulator.checkInvariants(result, payload.invariants);

    res.json({
      success: true,
      data: {
        result,
        violations,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "CHECK_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: Date.now(),
    });
  }
});

/**
 * Simulate batch
 */
app.post("/api/batch", async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: BatchRequest = req.body;

    if (!payload.payloads || !Array.isArray(payload.payloads)) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Payloads array is required",
        },
        timestamp: Date.now(),
      });
      return;
    }

    if (payload.network && payload.network !== simulator.getNetwork()) {
      await simulator.switchNetwork(payload.network, payload.rpcUrl);
    }

    const results = await simulator.simulateBatch(payload.payloads);

    res.json({
      success: true,
      data: results,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "BATCH_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// Error Handler
// ============================================================================

app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("Server error:", err);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err.message || "Internal server error",
      },
      timestamp: Date.now(),
    });
  },
);

// 404 Handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Endpoint not found",
    },
    timestamp: Date.now(),
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function addToHistory(result: SimulationResult): void {
  simulationHistory.unshift(result);
  if (simulationHistory.length > MAX_HISTORY) {
    simulationHistory.pop();
  }
}

// ============================================================================
// WebSocket Server
// ============================================================================

function setupWebSocket(server: ReturnType<typeof createServer>): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    ws.on("message", async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "simulate":
            const payload = message.payload as SimulateRequest;
            const result = await simulator.simulate({
              sender: payload.sender,
              function: payload.function,
              typeArgs: payload.typeArgs || [],
              args: payload.args || [],
            });
            addToHistory(result);
            ws.send(
              JSON.stringify({
                type: "simulation_result",
                id: message.id,
                data: result,
              }),
            );
            break;

          default:
            ws.send(
              JSON.stringify({
                type: "error",
                id: message.id,
                error: "Unknown message type",
              }),
            );
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error: Error) => {
      console.error("WebSocket error:", error);
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "connected",
        data: {
          message: "Connected to MoveSim WebSocket server",
          network: simulator.getNetwork(),
        },
      }),
    );
  });
}

// ============================================================================
// Server Start Function
// ============================================================================

export async function startServer(
  port: number = 3000,
  network: NetworkType = "testnet",
  rpcUrl?: string,
): Promise<void> {
  // Initialize simulator
  simulator = createSimulator({
    network,
    rpcUrl,
  });

  // Create HTTP server
  const server = createServer(app);

  // Setup WebSocket
  setupWebSocket(server);

  // Start listening
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🚀  MoveSim API Server Started  🚀                      ║
  ║                                                           ║
  ║   HTTP:      http://localhost:${port}                       ║
  ║   WebSocket: ws://localhost:${port}/ws                      ║
  ║   Network:   ${network.padEnd(41)}║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
      `);
      resolve();
    });

    server.on("error", (error: Error) => {
      console.error("Server error:", error);
      reject(error);
    });
  });
}

// Export for use as module
export { app };
export default startServer;
