/**
 * MoveSim - Movement Transaction Simulator SDK
 *
 * A Tenderly-like transaction simulation and debugging tool for the Movement Network.
 * Simulate, analyze, and debug Move transactions before executing them on-chain.
 *
 * @packageDocumentation
 */

// Core exports
export { MoveSimulator, createSimulator } from "./core/simulator";

// Type exports
export {
  // Network types
  NetworkType,
  NetworkConfig,
  NETWORK_CONFIGS,

  // Transaction types
  TransactionPayload,
  RawTransaction,
  EntryFunctionPayload,

  // Simulation types
  SimulationResult,
  SimulationError,

  // State change types
  StateChange,
  StateDiff,
  ResourceData,

  // Event types
  MoveEvent,

  // Execution trace types
  ExecutionStep,
  ExecutionTrace,
  CallFrame,
  CodeLocation,

  // Gas analysis types
  GasReport,
  GasBreakdown,
  GasOptimization,
  GasCategory,

  // Module types
  ModuleInfo,
  FunctionInfo,
  StructInfo,
  FieldInfo,
  GenericTypeParam,
  TypeInfo,
  ModuleABI,
  ExposedFunction,
  ABIStruct,

  // Account types
  AccountInfo,
  AccountResource,

  // Config types
  MoveSimConfig,
  CLIOptions,
  SimulateCommandOptions,

  // Error types
  MoveSimError,
  SimulationFailedError,
  NetworkError,
  InvalidInputError,

  // Utility types
  HexString,
  PaginatedResponse,
  TransactionHistory,
} from "./types";

// API server export (for programmatic server start)
export { startServer, app } from "./api/server";

/**
 * MoveSim - Main class for transaction simulation
 *
 * @example
 * ```typescript
 * import { MoveSim } from 'movesim';
 *
 * const sim = new MoveSim({
 *   network: 'testnet',
 * });
 *
 * const result = await sim.simulate({
 *   sender: '0x123...',
 *   function: '0x1::coin::transfer',
 *   typeArgs: ['0x1::aptos_coin::AptosCoin'],
 *   args: ['0x456...', '1000000']
 * });
 *
 * if (result.success) {
 *   console.log('Gas used:', result.gasUsed);
 *   console.log('Events:', result.events);
 * } else {
 *   console.log('Error:', result.error);
 * }
 * ```
 */
export { MoveSimulator as MoveSim } from "./core/simulator";

// Default export
import { MoveSimulator } from "./core/simulator";
export default MoveSimulator;

// Package version
export const VERSION = "1.0.0";

// Quick start helper
export const quickSimulate = async (
  sender: string,
  func: string,
  args: (string | number | boolean | string[])[] = [],
  options: {
    network?: NetworkType;
    typeArgs?: string[];
  } = {},
): Promise<SimulationResult> => {
  const { createSimulator } = await import("./core/simulator");
  const simulator = createSimulator({
    network: options.network || "testnet",
  });

  return simulator.simulate({
    sender,
    function: func,
    typeArgs: options.typeArgs || [],
    args,
  });
};

// Re-export types for convenience
import type { NetworkType, SimulationResult } from "./types";

/**
 * Utility function to format gas cost in human-readable format
 */
export const formatGasCost = (gasUsed: number, gasPrice: number): string => {
  const totalOctas = gasUsed * gasPrice;
  const apt = totalOctas / 100_000_000;

  if (apt >= 1) {
    return `${apt.toFixed(4)} APT`;
  } else if (apt >= 0.001) {
    return `${(apt * 1000).toFixed(4)} mAPT`;
  } else {
    return `${totalOctas.toLocaleString()} octas`;
  }
};

/**
 * Utility function to parse a Move function string
 */
export const parseFunctionId = (
  functionId: string,
): { address: string; module: string; function: string } | null => {
  const parts = functionId.split("::");
  if (parts.length !== 3) {
    return null;
  }
  return {
    address: parts[0],
    module: parts[1],
    function: parts[2],
  };
};

/**
 * Utility function to validate a hex address
 */
export const isValidAddress = (address: string): boolean => {
  if (!address.startsWith("0x")) {
    return false;
  }
  const hex = address.slice(2);
  if (hex.length === 0 || hex.length > 64) {
    return false;
  }
  return /^[0-9a-fA-F]+$/.test(hex);
};
