/**
 * MoveSim - Core Type Definitions
 * Transaction simulation and debugging types for Movement Network
 */

// ============================================================================
// Network Configuration
// ============================================================================

export type NetworkType = 'mainnet' | 'testnet' | 'devnet' | 'local';

export interface NetworkConfig {
  name: NetworkType;
  rpcUrl: string;
  chainId?: number;
  explorerUrl?: string;
}

export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  mainnet: {
    name: 'mainnet',
    rpcUrl: 'https://mainnet.movementnetwork.xyz/v1',
    explorerUrl: 'https://explorer.movementnetwork.xyz'
  },
  testnet: {
    name: 'testnet',
    rpcUrl: 'https://testnet.movementnetwork.xyz/v1',
    explorerUrl: 'https://explorer.testnet.movementnetwork.xyz'
  },
  devnet: {
    name: 'devnet',
    rpcUrl: 'https://devnet.movementnetwork.xyz/v1',
    explorerUrl: 'https://explorer.devnet.movementnetwork.xyz'
  },
  local: {
    name: 'local',
    rpcUrl: 'http://localhost:8080/v1',
    explorerUrl: 'http://localhost:3000'
  }
};

// ============================================================================
// Transaction Types
// ============================================================================

export interface TransactionPayload {
  sender: string;
  function: string;
  typeArgs?: string[];
  args?: (string | number | boolean | string[])[];
  maxGasAmount?: number;
  gasUnitPrice?: number;
  expirationSeconds?: number;
}

export interface RawTransaction {
  sender: string;
  sequence_number: string;
  max_gas_amount: string;
  gas_unit_price: string;
  expiration_timestamp_secs: string;
  payload: EntryFunctionPayload;
}

export interface EntryFunctionPayload {
  type: 'entry_function_payload';
  function: string;
  type_arguments: string[];
  arguments: unknown[];
}

// ============================================================================
// Simulation Results
// ============================================================================

export interface SimulationResult {
  success: boolean;
  vmStatus: string;
  gasUsed: number;
  gasUnitPrice: number;
  totalGasCost: string;
  events: MoveEvent[];
  stateChanges: StateChange[];
  executionTrace?: ExecutionStep[];
  error?: SimulationError;
  suggestion?: string;
  timestamp: number;
  hash?: string;
}

export interface SimulationError {
  code: string;
  message: string;
  location?: string;
  vmError?: string;
  moveAbortCode?: string;
  suggestion?: string;
}

// ============================================================================
// State Changes
// ============================================================================

export interface StateChange {
  type: 'created' | 'modified' | 'deleted';
  address: string;
  resource: string;
  data?: ResourceData;
  previousData?: ResourceData;
}

export interface ResourceData {
  type: string;
  data: Record<string, unknown>;
}

export interface StateDiff {
  created: StateChange[];
  modified: StateChange[];
  deleted: StateChange[];
  summary: {
    totalChanges: number;
    resourceTypes: string[];
  };
}

// ============================================================================
// Events
// ============================================================================

export interface MoveEvent {
  guid: {
    creation_number: string;
    account_address: string;
  };
  sequence_number: string;
  type: string;
  data: Record<string, unknown>;
}

// ============================================================================
// Execution Tracing
// ============================================================================

export interface ExecutionStep {
  index: number;
  instruction: string;
  gasUsed: number;
  cumulativeGas: number;
  stack?: unknown[];
  locals?: Record<string, unknown>;
  location?: CodeLocation;
}

export interface CodeLocation {
  module: string;
  function: string;
  offset: number;
  line?: number;
}

export interface ExecutionTrace {
  steps: ExecutionStep[];
  totalSteps: number;
  totalGas: number;
  callStack: CallFrame[];
}

export interface CallFrame {
  function: string;
  module: string;
  args: unknown[];
  returnValue?: unknown;
  gasUsed: number;
  children: CallFrame[];
}

// ============================================================================
// Gas Analysis
// ============================================================================

export interface GasReport {
  totalGas: number;
  gasUnitPrice: number;
  totalCost: string;
  breakdown: GasBreakdown[];
  suggestions: GasOptimization[];
}

export interface GasBreakdown {
  category: GasCategory;
  amount: number;
  percentage: number;
  description: string;
}

export type GasCategory =
  | 'execution'
  | 'storage_read'
  | 'storage_write'
  | 'event_emission'
  | 'memory'
  | 'intrinsic';

export interface GasOptimization {
  type: 'warning' | 'info' | 'suggestion';
  message: string;
  potentialSavings?: number;
  code?: string;
}

// ============================================================================
// Module Information
// ============================================================================

export interface ModuleInfo {
  address: string;
  name: string;
  functions: FunctionInfo[];
  structs: StructInfo[];
  bytecode?: string;
  abi?: ModuleABI;
}

export interface FunctionInfo {
  name: string;
  visibility: 'public' | 'private' | 'friend' | 'entry';
  isEntry: boolean;
  genericTypeParams: GenericTypeParam[];
  params: TypeInfo[];
  returnType: TypeInfo[];
}

export interface GenericTypeParam {
  constraints: string[];
}

export interface TypeInfo {
  type: string;
  reference?: boolean;
  mutable?: boolean;
}

export interface StructInfo {
  name: string;
  abilities: string[];
  genericTypeParams: GenericTypeParam[];
  fields: FieldInfo[];
}

export interface FieldInfo {
  name: string;
  type: TypeInfo;
}

export interface ModuleABI {
  address: string;
  name: string;
  exposed_functions: ExposedFunction[];
  structs: ABIStruct[];
}

export interface ExposedFunction {
  name: string;
  visibility: string;
  is_entry: boolean;
  generic_type_params: { constraints: string[] }[];
  params: string[];
  return: string[];
}

export interface ABIStruct {
  name: string;
  abilities: string[];
  generic_type_params: { constraints: string[] }[];
  fields: { name: string; type: string }[];
}

// ============================================================================
// Account Information
// ============================================================================

export interface AccountInfo {
  address: string;
  sequenceNumber: string;
  authenticationKey: string;
  resources: ResourceData[];
  modules: ModuleInfo[];
}

export interface AccountResource {
  type: string;
  data: Record<string, unknown>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SimulateResponse {
  success: boolean;
  vm_status: string;
  gas_used: string;
  gas_unit_price: string;
  events: MoveEvent[];
  changes: WriteSetChange[];
}

export interface WriteSetChange {
  type: string;
  address: string;
  state_key_hash: string;
  data: ResourceData;
}

// ============================================================================
// CLI Types
// ============================================================================

export interface CLIOptions {
  network: NetworkType;
  rpcUrl?: string;
  verbose?: boolean;
  json?: boolean;
  trace?: boolean;
}

export interface SimulateCommandOptions extends CLIOptions {
  function: string;
  typeArgs?: string[];
  args?: string[];
  sender: string;
  maxGas?: number;
  gasPrice?: number;
}

// ============================================================================
// SDK Configuration
// ============================================================================

export interface MoveSimConfig {
  network?: NetworkType;
  rpcUrl?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export class MoveSimError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MoveSimError';
  }
}

export class SimulationFailedError extends MoveSimError {
  constructor(
    message: string,
    public vmStatus: string,
    public suggestion?: string
  ) {
    super(message, 'SIMULATION_FAILED', { vmStatus, suggestion });
    this.name = 'SimulationFailedError';
  }
}

export class NetworkError extends MoveSimError {
  constructor(message: string, public statusCode?: number) {
    super(message, 'NETWORK_ERROR', { statusCode });
    this.name = 'NetworkError';
  }
}

export class InvalidInputError extends MoveSimError {
  constructor(message: string, public field?: string) {
    super(message, 'INVALID_INPUT', { field });
    this.name = 'InvalidInputError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type HexString = `0x${string}`;

export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore: boolean;
}

export interface TransactionHistory {
  transactions: SimulationResult[];
  total: number;
}

// ============================================================================
// Invariants
// ============================================================================

export type InvariantType = 'resource_exists' | 'resource_missing' | 'balance_min' | 'balance_max' | 'custom';

export interface Invariant {
  type: InvariantType;
  target?: string; // Resource type or address
  params?: Record<string, any>;
  description: string;
}

export interface InvariantViolation {
  invariant: Invariant;
  message: string;
  actualValue?: any;
}

// ============================================================================
// Block-STM Conflict Analysis
// ============================================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ContentionInfo {
  resource: string;
  address: string;
  risk: RiskLevel;
  reason: string;
}

export interface ConflictReport {
  score: number; // 0-100
  riskLevel: RiskLevel;
  contentionPoints: ContentionInfo[];
  recommendation: string;
}

// ============================================================================
// Batch Block-STM Analysis
// ============================================================================

export interface BatchAnalysis {
  executionLanes: ExecutionLane[];
  dependencyGraph: DependencyNode[];
  criticalPathLength: number;
  sequentialLength: number;
  estimatedSpeedup: number;
}

export interface ExecutionLane {
  laneId: number;
  transactions: ScheduledTransaction[];
}

export interface ScheduledTransaction {
  txIndex: number; // Index in the original batch
  startTime: number; // Logical time unit
  duration: number; // Estimated execution cost
  conflicts: number[]; // Indices of txs that this depends on
}

export interface DependencyNode {
  txIndex: number;
  dependencies: number[]; // Indices of txs that MUST finish before this starts
  readSet: string[];
  writeSet: string[];
}
