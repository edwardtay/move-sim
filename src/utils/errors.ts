/**
 * MoveSim - Error Utilities
 * Provides better error handling and user-friendly error messages
 * for improved developer experience
 */

// ============================================================================
// Error Codes
// ============================================================================

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RPC_ERROR = 'RPC_ERROR',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_FUNCTION = 'INVALID_FUNCTION',
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
  INVALID_TYPE_ARGS = 'INVALID_TYPE_ARGS',

  // Simulation errors
  SIMULATION_FAILED = 'SIMULATION_FAILED',
  OUT_OF_GAS = 'OUT_OF_GAS',
  MOVE_ABORT = 'MOVE_ABORT',
  EXECUTION_FAILED = 'EXECUTION_FAILED',

  // Resource errors
  MODULE_NOT_FOUND = 'MODULE_NOT_FOUND',
  FUNCTION_NOT_FOUND = 'FUNCTION_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',

  // Type errors
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  ARITY_MISMATCH = 'ARITY_MISMATCH',

  // Internal errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================================================
// Error Messages Map
// ============================================================================

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]: 'Failed to connect to the network',
  [ErrorCode.TIMEOUT]: 'Request timed out',
  [ErrorCode.RPC_ERROR]: 'RPC request failed',
  [ErrorCode.CONNECTION_REFUSED]: 'Connection refused by the server',

  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.INVALID_ADDRESS]: 'Invalid address format',
  [ErrorCode.INVALID_FUNCTION]: 'Invalid function format. Expected: address::module::function',
  [ErrorCode.INVALID_ARGUMENTS]: 'Invalid function arguments',
  [ErrorCode.INVALID_TYPE_ARGS]: 'Invalid type arguments',

  [ErrorCode.SIMULATION_FAILED]: 'Transaction simulation failed',
  [ErrorCode.OUT_OF_GAS]: 'Transaction ran out of gas',
  [ErrorCode.MOVE_ABORT]: 'Move execution aborted',
  [ErrorCode.EXECUTION_FAILED]: 'Transaction execution failed',

  [ErrorCode.MODULE_NOT_FOUND]: 'Module not found on-chain',
  [ErrorCode.FUNCTION_NOT_FOUND]: 'Function not found in module',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ErrorCode.ACCOUNT_NOT_FOUND]: 'Account not found',

  [ErrorCode.TYPE_MISMATCH]: 'Type mismatch in arguments',
  [ErrorCode.ARITY_MISMATCH]: 'Wrong number of arguments',

  [ErrorCode.INTERNAL_ERROR]: 'Internal error occurred',
  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred',
};

// ============================================================================
// Error Suggestions Map
// ============================================================================

const ERROR_SUGGESTIONS: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.NETWORK_ERROR]:
    'Check your internet connection and verify the RPC URL is correct.',
  [ErrorCode.TIMEOUT]:
    'The request took too long. Try again or increase the timeout setting.',
  [ErrorCode.CONNECTION_REFUSED]:
    'The server refused the connection. Make sure the RPC endpoint is running and accessible.',

  [ErrorCode.INVALID_ADDRESS]:
    'Address must start with 0x and contain only hexadecimal characters.',
  [ErrorCode.INVALID_FUNCTION]:
    'Function must be in the format: 0x1::module_name::function_name',
  [ErrorCode.INVALID_ARGUMENTS]:
    'Arguments must be in the format: type:value (e.g., u64:1000, address:0x1)',

  [ErrorCode.OUT_OF_GAS]:
    'Increase the maxGasAmount parameter to allow for more gas.',
  [ErrorCode.MOVE_ABORT]:
    'Check the abort code against the module source code to understand the error.',

  [ErrorCode.MODULE_NOT_FOUND]:
    'Verify the module address and name. Make sure it is deployed to the network.',
  [ErrorCode.FUNCTION_NOT_FOUND]:
    'Verify the function name and that it is marked as a public entry function.',
  [ErrorCode.ACCOUNT_NOT_FOUND]:
    'The account does not exist. It may need to be created first.',

  [ErrorCode.TYPE_MISMATCH]:
    'Check that your type arguments match the expected types in the function signature.',
  [ErrorCode.ARITY_MISMATCH]:
    'Check the function signature for the correct number of arguments.',
};

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base error class for MoveSim errors
 */
export class MoveSimError extends Error {
  public readonly code: ErrorCode;
  public readonly suggestion?: string;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: number;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: Record<string, unknown>
  ) {
    const errorMessage = message || ERROR_MESSAGES[code] || 'Unknown error';
    super(errorMessage);

    this.name = 'MoveSimError';
    this.code = code;
    this.suggestion = ERROR_SUGGESTIONS[code];
    this.details = details;
    this.timestamp = Date.now();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MoveSimError);
    }
  }

  /**
   * Convert error to a plain object for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      suggestion: this.suggestion,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * Get a user-friendly error message
   */
  toUserMessage(): string {
    let message = `Error [${this.code}]: ${this.message}`;
    if (this.suggestion) {
      message += `\n\n💡 Suggestion: ${this.suggestion}`;
    }
    return message;
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends MoveSimError {
  constructor(message?: string, details?: Record<string, unknown>) {
    super(ErrorCode.NETWORK_ERROR, message, details);
    this.name = 'NetworkError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends MoveSimError {
  public readonly field?: string;

  constructor(
    code: ErrorCode,
    message?: string,
    field?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, { ...details, field });
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Simulation errors
 */
export class SimulationError extends MoveSimError {
  public readonly vmStatus?: string;
  public readonly abortCode?: string;

  constructor(
    code: ErrorCode,
    message?: string,
    vmStatus?: string,
    abortCode?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, { ...details, vmStatus, abortCode });
    this.name = 'SimulationError';
    this.vmStatus = vmStatus;
    this.abortCode = abortCode;
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends MoveSimError {
  public readonly resourceType: string;
  public readonly identifier: string;

  constructor(
    code: ErrorCode,
    resourceType: string,
    identifier: string,
    details?: Record<string, unknown>
  ) {
    super(code, `${resourceType} '${identifier}' not found`, {
      ...details,
      resourceType,
      identifier,
    });
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.identifier = identifier;
  }
}

// ============================================================================
// Error Parsing Utilities
// ============================================================================

/**
 * Parse a VM status string into a structured error
 */
export function parseVMStatus(vmStatus: string): SimulationError {
  // Check for common error patterns
  if (vmStatus.includes('OUT_OF_GAS')) {
    return new SimulationError(
      ErrorCode.OUT_OF_GAS,
      'Transaction ran out of gas',
      vmStatus
    );
  }

  // Parse Move abort codes
  const abortMatch = vmStatus.match(/Move abort.*code (\d+)/i);
  if (abortMatch) {
    return new SimulationError(
      ErrorCode.MOVE_ABORT,
      `Transaction aborted with code ${abortMatch[1]}`,
      vmStatus,
      abortMatch[1]
    );
  }

  // Check for module not found
  if (vmStatus.includes('LINKER_ERROR') || vmStatus.includes('MODULE_NOT_FOUND')) {
    return new SimulationError(
      ErrorCode.MODULE_NOT_FOUND,
      'Referenced module was not found on-chain',
      vmStatus
    );
  }

  // Check for function not found
  if (vmStatus.includes('FUNCTION_RESOLUTION_FAILURE')) {
    return new SimulationError(
      ErrorCode.FUNCTION_NOT_FOUND,
      'Function could not be resolved',
      vmStatus
    );
  }

  // Check for type errors
  if (vmStatus.includes('TYPE_MISMATCH')) {
    return new SimulationError(
      ErrorCode.TYPE_MISMATCH,
      'Type mismatch in function arguments or type parameters',
      vmStatus
    );
  }

  // Check for arity errors
  if (vmStatus.includes('ARITY_MISMATCH') || vmStatus.includes('NUMBER_OF_ARGUMENTS')) {
    return new SimulationError(
      ErrorCode.ARITY_MISMATCH,
      'Wrong number of arguments provided',
      vmStatus
    );
  }

  // Default to execution failed
  return new SimulationError(
    ErrorCode.EXECUTION_FAILED,
    vmStatus,
    vmStatus
  );
}

/**
 * Parse an unknown error into a MoveSimError
 */
export function parseError(error: unknown): MoveSimError {
  // Already a MoveSimError
  if (error instanceof MoveSimError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('econnrefused')
    ) {
      return new NetworkError(error.message);
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return new MoveSimError(ErrorCode.TIMEOUT, error.message);
    }

    // Default to unknown error
    return new MoveSimError(ErrorCode.UNKNOWN_ERROR, error.message, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  // String error
  if (typeof error === 'string') {
    return new MoveSimError(ErrorCode.UNKNOWN_ERROR, error);
  }

  // Unknown error type
  return new MoveSimError(ErrorCode.UNKNOWN_ERROR, 'An unknown error occurred', {
    originalError: error,
  });
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a hex address
 */
export function validateAddress(address: string): ValidationError | null {
  if (!address) {
    return new ValidationError(
      ErrorCode.INVALID_ADDRESS,
      'Address is required',
      'address'
    );
  }

  if (!address.startsWith('0x')) {
    return new ValidationError(
      ErrorCode.INVALID_ADDRESS,
      'Address must start with 0x',
      'address'
    );
  }

  const hex = address.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    return new ValidationError(
      ErrorCode.INVALID_ADDRESS,
      'Address contains invalid characters',
      'address'
    );
  }

  if (hex.length > 64) {
    return new ValidationError(
      ErrorCode.INVALID_ADDRESS,
      'Address is too long',
      'address'
    );
  }

  return null;
}

/**
 * Validate a function identifier
 */
export function validateFunction(functionId: string): ValidationError | null {
  if (!functionId) {
    return new ValidationError(
      ErrorCode.INVALID_FUNCTION,
      'Function is required',
      'function'
    );
  }

  const parts = functionId.split('::');
  if (parts.length !== 3) {
    return new ValidationError(
      ErrorCode.INVALID_FUNCTION,
      'Function must be in format address::module::function',
      'function'
    );
  }

  const [address, moduleName, functionName] = parts;

  // Validate address part
  const addressError = validateAddress(address);
  if (addressError) {
    return new ValidationError(
      ErrorCode.INVALID_FUNCTION,
      `Invalid address in function: ${addressError.message}`,
      'function'
    );
  }

  // Validate module name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(moduleName)) {
    return new ValidationError(
      ErrorCode.INVALID_FUNCTION,
      'Invalid module name in function',
      'function'
    );
  }

  // Validate function name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
    return new ValidationError(
      ErrorCode.INVALID_FUNCTION,
      'Invalid function name',
      'function'
    );
  }

  return null;
}

/**
 * Assert that a value is valid, throwing an error if not
 */
export function assertValid<T>(
  value: T | null | undefined,
  code: ErrorCode,
  message: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new MoveSimError(code, message);
  }
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Format an error for CLI output
 */
export function formatErrorForCLI(error: MoveSimError): string {
  const lines: string[] = [];

  lines.push(`❌ Error [${error.code}]`);
  lines.push(`   ${error.message}`);

  if (error.details) {
    const details = Object.entries(error.details)
      .filter(([key]) => !['field', 'vmStatus', 'abortCode'].includes(key))
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');

    if (details) {
      lines.push(`   Details: ${details}`);
    }
  }

  if (error.suggestion) {
    lines.push('');
    lines.push(`💡 Suggestion: ${error.suggestion}`);
  }

  return lines.join('\n');
}

/**
 * Format an error for JSON output
 */
export function formatErrorForJSON(error: MoveSimError): string {
  return JSON.stringify(error.toJSON(), null, 2);
}

/**
 * Create an error response object for API responses
 */
export function createErrorResponse(error: MoveSimError): {
  success: false;
  error: {
    code: string;
    message: string;
    suggestion?: string;
    details?: Record<string, unknown>;
  };
  timestamp: number;
} {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      suggestion: error.suggestion,
      details: error.details,
    },
    timestamp: error.timestamp,
  };
}
