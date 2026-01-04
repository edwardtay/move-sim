/**
 * MoveSim - Core Simulation Engine
 * Handles transaction simulation, state diffing, and execution tracing
 */

import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import {
  TransactionPayload,
  SimulationResult,
  SimulationError,
  StateChange,
  StateDiff,
  MoveEvent,
  ExecutionStep,
  ExecutionTrace,
  GasReport,
  GasBreakdown,
  GasOptimization,
  MoveSimConfig,
  NetworkType,
  NETWORK_CONFIGS,
  MoveSimError,
  NetworkError,
  ModuleInfo,
  AccountInfo,
  Invariant,
  InvariantViolation,
} from "../types";
import { InvariantChecker } from "./invariants";

/**
 * Main simulation engine for Movement Network transactions
 */
export class MoveSimulator {
  private client: Aptos;
  private config: MoveSimConfig;
  private cache: Map<string, unknown> = new Map();

  constructor(config: MoveSimConfig = {}) {
    this.config = {
      network: config.network || "testnet",
      rpcUrl: config.rpcUrl,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      cache: config.cache ?? true,
    };

    // Initialize Aptos client
    const networkConfig = NETWORK_CONFIGS[this.config.network || "testnet"];
    const rpcUrl = this.config.rpcUrl || networkConfig.rpcUrl;

    const aptosConfig = new AptosConfig({
      fullnode: rpcUrl,
    });

    this.client = new Aptos(aptosConfig);
  }

  /**
   * Simulate a transaction and return detailed results
   */
  async simulate(payload: TransactionPayload): Promise<SimulationResult> {
    const startTime = Date.now();

    try {
      // Validate payload
      this.validatePayload(payload);

      // Get account info for sequence number
      const accountInfo = await this.getAccountInfo(payload.sender);

      // Build the transaction
      const transaction = await this.buildTransaction(payload, accountInfo);

      // Simulate using the Aptos SDK
      const [simulationResponse] =
        await this.client.transaction.simulate.simple({
          signerPublicKey: await this.getPublicKeyForAddress(payload.sender),
          transaction,
          options: {
            ledgerVersion: payload.ledgerVersion,
          } as any,
        });

      // Parse simulation result
      const success = simulationResponse.success;
      const gasUsed = parseInt(simulationResponse.gas_used, 10);
      const gasUnitPrice = parseInt(simulationResponse.gas_unit_price, 10);

      // Extract events
      const events = this.parseEvents(simulationResponse.events || []);

      // Extract state changes
      const stateChanges = this.parseStateChanges(
        simulationResponse.changes || [],
      );

      // Build result
      const result: SimulationResult = {
        success,
        vmStatus: simulationResponse.vm_status,
        gasUsed,
        gasUnitPrice,
        totalGasCost: (gasUsed * gasUnitPrice).toString(),
        events,
        stateChanges,
        timestamp: Date.now(),
        hash: simulationResponse.hash,
      };

      // Add error details if failed
      if (!success) {
        result.error = this.parseVMError(simulationResponse.vm_status);
        result.suggestion = this.generateSuggestion(result.error);
      }

      return result;
    } catch (error) {
      return this.handleSimulationError(error, startTime);
    }
  }

  /**
   * Simulate a batch of transactions sequentially
   */
  async simulateBatch(payloads: TransactionPayload[]): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];

    // Note: In a real environment, we would need to maintain state between simulations.
    // Since Aptos SDK doesn't support stateful simulation sessions easily,
    // we simulate each independently but return them as a batch result.
    // For a production implementation, we would need to use a local node/fork 
    // or chain the state changes (if supported by full node simulation endpoint).

    for (const payload of payloads) {
      // In a real implementation, we would update sequence numbers and potentially
      // input state here based on previous results.
      const result = await this.simulate(payload);
      results.push(result);

      if (!result.success) {
        break; // Stop execution on failure
      }
    }

    return results;
  }

  /**
   * Get a detailed state diff for a transaction
   */
  async getStateDiff(payload: TransactionPayload): Promise<StateDiff> {
    const result = await this.simulate(payload);

    const created = result.stateChanges.filter((c) => c.type === "created");
    const modified = result.stateChanges.filter((c) => c.type === "modified");
    const deleted = result.stateChanges.filter((c) => c.type === "deleted");

    const resourceTypes = [
      ...new Set(result.stateChanges.map((c) => c.resource)),
    ];

    return {
      created,
      modified,
      deleted,
      summary: {
        totalChanges: result.stateChanges.length,
        resourceTypes,
      },
    };
  }

  /**
   * Analyze gas usage and provide optimization suggestions
   */
  async analyzeGas(payload: TransactionPayload): Promise<GasReport> {
    const result = await this.simulate(payload);

    const breakdown = this.calculateGasBreakdown(result);
    const suggestions = this.generateGasOptimizations(result, breakdown);

    return {
      totalGas: result.gasUsed,
      gasUnitPrice: result.gasUnitPrice,
      totalCost: result.totalGasCost,
      breakdown,
      suggestions,
    };
  }

  /**
   * Get execution trace for a transaction
   */
  async trace(payload: TransactionPayload): Promise<ExecutionTrace> {
    const result = await this.simulate({ ...payload });

    // Note: Full execution tracing requires Move VM instrumentation
    // This provides a high-level trace based on available data
    const steps = this.generateExecutionSteps(result);

    return {
      steps,
      totalSteps: steps.length,
      totalGas: result.gasUsed,
      callStack: [],
    };
  }

  /**
   * Get module information
   */
  async getModule(address: string, moduleName: string): Promise<ModuleInfo> {
    const cacheKey = `module:${address}:${moduleName}`;
    if (this.config.cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as ModuleInfo;
    }

    try {
      const module = await this.client.getAccountModule({
        accountAddress: address,
        moduleName,
      });

      const moduleInfo: ModuleInfo = {
        address,
        name: moduleName,
        functions:
          module.abi?.exposed_functions?.map((f) => ({
            name: f.name,
            visibility: f.visibility as
              | "public"
              | "private"
              | "friend"
              | "entry",
            isEntry: f.is_entry,
            genericTypeParams:
              f.generic_type_params?.map((g) => ({
                constraints: g.constraints || [],
              })) || [],
            params: f.params?.map((p) => ({ type: p })) || [],
            returnType: f.return?.map((r) => ({ type: r })) || [],
          })) || [],
        structs:
          module.abi?.structs?.map((s) => ({
            name: s.name,
            abilities: s.abilities || [],
            genericTypeParams:
              s.generic_type_params?.map((g) => ({
                constraints: g.constraints || [],
              })) || [],
            fields:
              s.fields?.map((f) => ({
                name: f.name,
                type: { type: f.type },
              })) || [],
          })) || [],
        bytecode: module.bytecode,
        abi: module.abi,
      };

      if (this.config.cache) {
        this.cache.set(cacheKey, moduleInfo);
      }

      return moduleInfo;
    } catch (error) {
      throw new MoveSimError(
        `Failed to get module ${address}::${moduleName}`,
        "MODULE_NOT_FOUND",
        { address, moduleName },
      );
    }
  }

  /**
   * Get module source code (compressed hex) from PackageRegistry
   */
  async getModuleSource(address: string, moduleName: string): Promise<string | null> {
    try {
      // 1. Get PackageRegistry resource
      const resources = await this.client.getAccountResources({
        accountAddress: address,
      });

      const registry = resources.find(r => r.type === "0x1::code::PackageRegistry");
      if (!registry) return null;

      // 2. Find the module in packages
      const packages = (registry.data as any).packages as any[];
      for (const pkg of packages) {
        const modules = pkg.modules as any[];
        const targetModule = modules.find((m: any) => m.name === moduleName);

        if (targetModule && targetModule.source) {
          return targetModule.source;
        }
      }

      return null;
    } catch (error) {
      console.warn(`Failed to fetch source for ${address}::${moduleName}`, error);
      return null;
    }
  }

  /**
   * Get account information including resources
   */
  async getAccountInfo(address: string): Promise<AccountInfo> {
    try {
      const account = await this.client.getAccountInfo({
        accountAddress: address,
      });
      const resources = await this.client.getAccountResources({
        accountAddress: address,
      });

      return {
        address,
        sequenceNumber: account.sequence_number,
        authenticationKey: account.authentication_key,
        resources: resources.map((r) => ({
          type: r.type,
          data: r.data as Record<string, unknown>,
        })),
        modules: [],
      };
    } catch (error) {
      throw new NetworkError(`Failed to get account info for ${address}`);
    }
  }

  /**
   * Validate transaction payload
   */
  private validatePayload(payload: TransactionPayload): void {
    if (!payload.sender) {
      throw new MoveSimError("Sender address is required", "INVALID_INPUT", {
        field: "sender",
      });
    }

    if (!payload.function) {
      throw new MoveSimError("Function is required", "INVALID_INPUT", {
        field: "function",
      });
    }

    // Validate function format (address::module::function)
    const functionParts = payload.function.split("::");
    if (functionParts.length !== 3) {
      throw new MoveSimError(
        "Function must be in format address::module::function",
        "INVALID_INPUT",
        { field: "function" },
      );
    }
  }

  /**
   * Build a transaction for simulation
   */
  private async buildTransaction(
    payload: TransactionPayload,
    _accountInfo: AccountInfo,
  ) {
    const functionParts = payload.function.split("::");
    const moduleAddress = functionParts[0];
    const moduleName = functionParts[1];
    const functionName = functionParts[2];

    // Convert arguments to proper format
    const args = this.parseArguments(payload.args || []);

    const transaction = await this.client.transaction.build.simple({
      sender: payload.sender,
      data: {
        function: `${moduleAddress}::${moduleName}::${functionName}`,
        typeArguments: payload.typeArgs || [],
        functionArguments: args as any[],
      },
      options: {
        maxGasAmount: payload.maxGasAmount || 200000,
        gasUnitPrice: payload.gasUnitPrice || 100,
        expireTimestamp:
          Math.floor(Date.now() / 1000) + (payload.expirationSeconds || 600),
      },
    });

    return transaction;
  }

  /**
   * Parse string arguments to proper types
   */
  private parseArguments(
    args: (string | number | boolean | string[])[],
  ): unknown[] {
    return args.map((arg) => {
      if (typeof arg === "string") {
        // Check for typed arguments (e.g., "address:0x123", "u64:1000")
        if (arg.includes(":")) {
          const [type, value] = arg.split(":");
          switch (type.toLowerCase()) {
            case "address":
              return value;
            case "u8":
            case "u16":
            case "u32":
            case "u64":
            case "u128":
            case "u256":
              return parseInt(value, 10);
            case "bool":
              return value.toLowerCase() === "true";
            case "string":
              return value;
            case "vector":
              return JSON.parse(value);
            default:
              return value;
          }
        }
        return arg;
      }
      return arg;
    });
  }

  /**
   * Get public key for an address (simplified - in real impl would need wallet integration)
   */
  private async getPublicKeyForAddress(address: string) {
    // For simulation, we use a dummy public key since we don't need to actually sign
    // The SDK handles this for simulation purposes
    const account = await this.client.getAccountInfo({
      accountAddress: address,
    });
    return {
      publicKey: account.authentication_key,
    } as any;
  }

  /**
   * Parse events from simulation response
   */
  private parseEvents(events: any[]): MoveEvent[] {
    return events.map((event) => ({
      guid: event.guid,
      sequence_number: event.sequence_number,
      type: event.type,
      data: event.data,
    }));
  }

  /**
   * Parse state changes from simulation response
   */
  private parseStateChanges(changes: any[]): StateChange[] {
    return changes
      .filter(
        (change) =>
          change.type === "write_resource" || change.type === "delete_resource",
      )
      .map((change) => {
        const isDelete = change.type === "delete_resource";
        return {
          type: isDelete
            ? "deleted"
            : ("modified" as "created" | "modified" | "deleted"),
          address: change.address,
          resource: change.data?.type || "unknown",
          data: isDelete ? undefined : change.data,
          previousData: undefined, // Would need pre-state to determine
        };
      });
  }

  /**
   * Parse VM error into structured error object
   */
  private parseVMError(vmStatus: string): SimulationError {
    // Parse common Move VM errors
    const abortMatch = vmStatus.match(/Move abort.*code (\d+)/i);
    const outOfGasMatch = vmStatus.match(/OUT_OF_GAS/i);
    const moduleNotFound = vmStatus.match(/LINKER_ERROR.*Module.*not found/i);
    const functionNotFound = vmStatus.match(/FUNCTION_RESOLUTION_FAILURE/i);
    const typeError = vmStatus.match(/TYPE_MISMATCH/i);

    let code = "UNKNOWN_ERROR";
    let message = vmStatus;

    if (abortMatch) {
      code = "MOVE_ABORT";
      message = `Transaction aborted with code ${abortMatch[1]}`;
    } else if (outOfGasMatch) {
      code = "OUT_OF_GAS";
      message = "Transaction ran out of gas";
    } else if (moduleNotFound) {
      code = "MODULE_NOT_FOUND";
      message = "Referenced module was not found on-chain";
    } else if (functionNotFound) {
      code = "FUNCTION_NOT_FOUND";
      message = "Function could not be resolved";
    } else if (typeError) {
      code = "TYPE_MISMATCH";
      message = "Type mismatch in function arguments";
    }

    return {
      code,
      message,
      vmError: vmStatus,
      moveAbortCode: abortMatch?.[1],
    };
  }

  /**
   * Generate suggestions for fixing errors
   */
  private generateSuggestion(error: SimulationError): string {
    const suggestions: Record<string, string> = {
      OUT_OF_GAS:
        "Try increasing maxGasAmount. Current transaction requires more gas than allocated.",
      MODULE_NOT_FOUND:
        "Ensure the module is deployed to the network. Check the module address and name.",
      FUNCTION_NOT_FOUND:
        "Verify the function name and that it is marked as an entry function.",
      TYPE_MISMATCH:
        "Check your type arguments and function arguments match the expected types.",
      MOVE_ABORT:
        "The Move function aborted. Check the abort code against the module source for details.",
    };

    return (
      suggestions[error.code] ||
      "Review the transaction parameters and try again."
    );
  }

  /**
   * Calculate gas breakdown by category
   */
  private calculateGasBreakdown(result: SimulationResult): GasBreakdown[] {
    const totalGas = result.gasUsed;
    if (totalGas === 0) return [];

    // Estimate breakdown based on typical patterns
    // In a full implementation, this would use detailed VM metrics
    const storageWrites = result.stateChanges.length;
    const eventCount = result.events.length;

    const storageWriteGas = storageWrites * 1000; // Estimate
    const eventGas = eventCount * 100; // Estimate
    const executionGas = Math.max(
      0,
      totalGas - storageWriteGas - eventGas - 100,
    );
    const intrinsicGas = 100;

    const breakdown: GasBreakdown[] = [
      {
        category: "intrinsic",
        amount: intrinsicGas,
        percentage: (intrinsicGas / totalGas) * 100,
        description: "Base transaction cost",
      },
      {
        category: "execution",
        amount: executionGas,
        percentage: (executionGas / totalGas) * 100,
        description: "Bytecode execution",
      },
      {
        category: "storage_write",
        amount: storageWriteGas,
        percentage: (storageWriteGas / totalGas) * 100,
        description: "Writing to global storage",
      },
      {
        category: "event_emission",
        amount: eventGas,
        percentage: (eventGas / totalGas) * 100,
        description: "Emitting events",
      },
    ];

    return breakdown.filter((b) => b.amount > 0);
  }

  /**
   * Generate gas optimization suggestions
   */
  private generateGasOptimizations(
    result: SimulationResult,
    breakdown: GasBreakdown[],
  ): GasOptimization[] {
    const suggestions: GasOptimization[] = [];

    // Check for high storage costs
    const storageBreakdown = breakdown.find(
      (b) => b.category === "storage_write",
    );
    if (storageBreakdown && storageBreakdown.percentage > 50) {
      suggestions.push({
        type: "suggestion",
        message:
          "Storage writes account for over 50% of gas. Consider batching operations or reducing stored data.",
        potentialSavings: Math.floor(storageBreakdown.amount * 0.2),
      });
    }

    // Check for high event costs
    const eventBreakdown = breakdown.find(
      (b) => b.category === "event_emission",
    );
    if (eventBreakdown && result.events.length > 5) {
      suggestions.push({
        type: "info",
        message: `Transaction emits ${result.events.length} events. Consider consolidating events if possible.`,
      });
    }

    // General optimization tips
    if (result.gasUsed > 50000) {
      suggestions.push({
        type: "info",
        message:
          "This is a relatively expensive transaction. Review the function logic for optimization opportunities.",
      });
    }

    return suggestions;
  }

  /**
   * Generate execution steps for tracing
   */
  private generateExecutionSteps(result: SimulationResult): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    let cumulativeGas = 0;

    // Add initial step
    steps.push({
      index: 0,
      instruction: "TRANSACTION_START",
      gasUsed: 100,
      cumulativeGas: 100,
    });
    cumulativeGas += 100;

    // Add steps for state changes
    result.stateChanges.forEach((change, i) => {
      const gasUsed = 1000;
      cumulativeGas += gasUsed;
      steps.push({
        index: steps.length,
        instruction: `STORE_${change.type.toUpperCase()}`,
        gasUsed,
        cumulativeGas,
        location: {
          module: change.resource.split("::")[1] || "unknown",
          function: "storage_operation",
          offset: i,
        },
      });
    });

    // Add steps for events
    result.events.forEach((event, i) => {
      const gasUsed = 100;
      cumulativeGas += gasUsed;
      steps.push({
        index: steps.length,
        instruction: "EMIT_EVENT",
        gasUsed,
        cumulativeGas,
        location: {
          module: event.type.split("::")[1] || "unknown",
          function: "event_emission",
          offset: i,
        },
      });
    });

    // Add final step
    steps.push({
      index: steps.length,
      instruction: result.success ? "TRANSACTION_SUCCESS" : "TRANSACTION_ABORT",
      gasUsed: 0,
      cumulativeGas,
    });

    return steps;
  }

  /**
   * Handle simulation errors
   */
  private handleSimulationError(
    error: unknown,
    _startTime: number,
  ): SimulationResult {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      vmStatus: "SIMULATION_ERROR",
      gasUsed: 0,
      gasUnitPrice: 0,
      totalGasCost: "0",
      events: [],
      stateChanges: [],
      timestamp: Date.now(),
      error: {
        code: "SIMULATION_ERROR",
        message: errorMessage,
      },
      suggestion: "Check your network connection and transaction parameters.",
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current network configuration
   */
  getNetwork(): NetworkType {
    return this.config.network || "testnet";
  }

  /**
   * Check invariants against a simulation result
   */
  checkInvariants(result: SimulationResult, invariants: Invariant[]): InvariantViolation[] {
    return InvariantChecker.check(result, invariants);
  }

  /**
   * Switch network
   */
  async switchNetwork(network: NetworkType, rpcUrl?: string): Promise<void> {
    this.config.network = network;
    this.config.rpcUrl = rpcUrl;

    const networkConfig = NETWORK_CONFIGS[network];
    const url = rpcUrl || networkConfig.rpcUrl;

    const aptosConfig = new AptosConfig({
      fullnode: url,
    });

    this.client = new Aptos(aptosConfig);
    this.clearCache();
  }
}

// Export a default instance
export const createSimulator = (config?: MoveSimConfig): MoveSimulator => {
  return new MoveSimulator(config);
};

export default MoveSimulator;
