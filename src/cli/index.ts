#!/usr/bin/env node

/**
 * MoveSim CLI - Command Line Interface for Movement Transaction Simulator
 * Provides transaction simulation, gas analysis, and debugging from the terminal
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import inquirer from "inquirer";
import * as fs from 'fs';
import * as path from 'path';
import { MoveSimulator, createSimulator } from "../core/simulator";
import {
  NetworkType,
  SimulationResult,
  StateDiff,
  GasReport,
  ExecutionTrace,
  Invariant,
  InvariantViolation,
  NETWORK_CONFIGS,
} from "../types";

const VERSION = "1.0.0";

// Create the CLI program
const program = new Command();

program
  .name("movesim")
  .description("🚀 MoveSim - Transaction Simulator for Movement Network")
  .version(VERSION);

// ============================================================================
// Simulate Command
// ============================================================================

program
  .command("simulate")
  .description("Simulate a Move transaction before execution")
  .requiredOption(
    "-f, --function <function>",
    "Function to call (format: address::module::function)",
  )
  .requiredOption("-s, --sender <address>", "Sender address")
  .option("-t, --type-args <args...>", "Type arguments")
  .option(
    "-a, --args <args...>",
    "Function arguments (format: type:value, e.g., u64:1000)",
  )
  .option(
    "-n, --network <network>",
    "Network to use (mainnet, testnet, devnet, local)",
    "testnet",
  )
  .option("-r, --rpc-url <url>", "Custom RPC URL")
  .option("--max-gas <amount>", "Maximum gas amount", "200000")
  .option("--gas-price <price>", "Gas unit price", "100")
  .option("--trace", "Include execution trace", false)
  .option("--json", "Output as JSON", false)
  .option("-v, --verbose", "Verbose output", false)
  .action(async (options) => {
    const spinner = ora("Simulating transaction...").start();

    try {
      const simulator = createSimulator({
        network: options.network as NetworkType,
        rpcUrl: options.rpcUrl,
      });

      const result = await simulator.simulate({
        sender: options.sender,
        function: options.function,
        typeArgs: options.typeArgs || [],
        args: options.args || [],
        maxGasAmount: parseInt(options.maxGas, 10),
        gasUnitPrice: parseInt(options.gasPrice, 10),
      });

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      printSimulationResult(result, options.verbose);

      if (options.trace && result.success) {
        const trace = await simulator.trace({
          sender: options.sender,
          function: options.function,
          typeArgs: options.typeArgs || [],
          args: options.args || [],
        });
        printExecutionTrace(trace);
      }
    } catch (error) {
      spinner.fail("Simulation failed");
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
      process.exit(1);
    }
  });

// ============================================================================
// Gas Analysis Command
// ============================================================================

program
  .command("gas")
  .description("Analyze gas usage for a transaction")
  .requiredOption("-f, --function <function>", "Function to call")
  .requiredOption("-s, --sender <address>", "Sender address")
  .option("-t, --type-args <args...>", "Type arguments")
  .option("-a, --args <args...>", "Function arguments")
  .option("-n, --network <network>", "Network to use", "testnet")
  .option("-r, --rpc-url <url>", "Custom RPC URL")
  .option("--json", "Output as JSON", false)
  .action(async (options) => {
    const spinner = ora("Analyzing gas usage...").start();

    try {
      const simulator = createSimulator({
        network: options.network as NetworkType,
        rpcUrl: options.rpcUrl,
      });

      const report = await simulator.analyzeGas({
        sender: options.sender,
        function: options.function,
        typeArgs: options.typeArgs || [],
        args: options.args || [],
      });

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      printGasReport(report);
    } catch (error) {
      spinner.fail("Gas analysis failed");
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
      process.exit(1);
    }
  });

// ============================================================================
// State Diff Command
// ============================================================================

program
  .command("diff")
  .description("Show state changes for a transaction")
  .requiredOption("-f, --function <function>", "Function to call")
  .requiredOption("-s, --sender <address>", "Sender address")
  .option("-t, --type-args <args...>", "Type arguments")
  .option("-a, --args <args...>", "Function arguments")
  .option("-n, --network <network>", "Network to use", "testnet")
  .option("-r, --rpc-url <url>", "Custom RPC URL")
  .option("--json", "Output as JSON", false)
  .action(async (options) => {
    const spinner = ora("Computing state diff...").start();

    try {
      const simulator = createSimulator({
        network: options.network as NetworkType,
        rpcUrl: options.rpcUrl,
      });

      const diff = await simulator.getStateDiff({
        sender: options.sender,
        function: options.function,
        typeArgs: options.typeArgs || [],
        args: options.args || [],
      });

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(diff, null, 2));
        return;
      }

      printStateDiff(diff);
    } catch (error) {
      spinner.fail("State diff computation failed");
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
      process.exit(1);
    }
  });

// ============================================================================
// Invariant Check Command
// ============================================================================

program
  .command("check")
  .description("Simulate transaction and check invariants")
  .requiredOption("-f, --function <function>", "Function to call")
  .requiredOption("-s, --sender <address>", "Sender address")
  .requiredOption("-i, --invariants <json>", "Invariants JSON string")
  .option("-t, --type-args <args...>", "Type arguments")
  .option("-a, --args <args...>", "Function arguments")
  .option("-n, --network <network>", "Network to use", "testnet")
  .option("-r, --rpc-url <url>", "Custom RPC URL")
  .option("--json", "Output as JSON", false)
  .action(async (options) => {
    const spinner = ora("Running invariant checks...").start();

    try {
      const invariants: Invariant[] = JSON.parse(options.invariants);

      const simulator = createSimulator({
        network: options.network as NetworkType,
        rpcUrl: options.rpcUrl,
      });

      const result = await simulator.simulate({
        sender: options.sender,
        function: options.function,
        typeArgs: options.typeArgs || [],
        args: options.args || [],
      });

      const violations = simulator.checkInvariants(result, invariants);

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify({ result, violations }, null, 2));
        return;
      }

      printSimulationResult(result, false);
      printInvariantViolations(violations);

      if (violations.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail("Invariant check failed");
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
      process.exit(1);
    }
  });

// ============================================================================
// Batch Simulation Command
// ============================================================================

program
  .command("batch")
  .description("Simulate a batch of transactions sequentially")
  .requiredOption("-i, --input <path>", "Input JSON file path or JSON string")
  .option("-n, --network <network>", "Network to use", "testnet")
  .option("-r, --rpc-url <url>", "Custom RPC URL")
  .option("--json", "Output as JSON", false)
  .action(async (options) => {
    const spinner = ora("Running batch simulation...").start();

    try {
      let payloads: any[];

      // Try to parse as JSON string first
      try {
        payloads = JSON.parse(options.input);
      } catch (e) {
        // If failed, try to read from file
        const filePath = path.resolve(process.cwd(), options.input);
        if (fs.existsSync(filePath)) {
          payloads = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } else {
          throw new Error("Input is neither valid JSON nor an existing file path");
        }
      }

      if (!Array.isArray(payloads)) {
        throw new Error("Input must be an array of transaction payloads");
      }

      const simulator = createSimulator({
        network: options.network as NetworkType,
        rpcUrl: options.rpcUrl,
      });

      const results = await simulator.simulateBatch(payloads);

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      console.log(chalk.cyan.bold(`\n📚 Batch Simulation Results (${results.length}/${payloads.length})`));

      results.forEach((result, i) => {
        console.log(chalk.gray(`\nTransaction #${i + 1}:`));
        printSimulationResult(result, false);
      });

      // Check if any failed
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        console.log(chalk.red.bold(`\n❌ ${failed.length} transactions failed.`));
        process.exit(1);
      } else {
        console.log(chalk.green.bold(`\n✅ All ${results.length} transactions succeeded.`));
      }

    } catch (error) {
      spinner.fail("Batch simulation failed");
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
      process.exit(1);
    }
  });

// ============================================================================
// Module Info Command
// ============================================================================

program
  .command("module")
  .description("Get information about a Move module")
  .requiredOption("-a, --address <address>", "Module address")
  .requiredOption("-m, --module <name>", "Module name")
  .option("-n, --network <network>", "Network to use", "testnet")
  .option("-r, --rpc-url <url>", "Custom RPC URL")
  .option("--json", "Output as JSON", false)
  .action(async (options) => {
    const spinner = ora("Fetching module info...").start();

    try {
      const simulator = createSimulator({
        network: options.network as NetworkType,
        rpcUrl: options.rpcUrl,
      });

      const moduleInfo = await simulator.getModule(
        options.address,
        options.module,
      );

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(moduleInfo, null, 2));
        return;
      }

      printModuleInfo(moduleInfo);
    } catch (error) {
      spinner.fail("Failed to fetch module info");
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
      process.exit(1);
    }
  });

// ============================================================================
// Account Info Command
// ============================================================================

program
  .command("account")
  .description("Get account information and resources")
  .requiredOption("-a, --address <address>", "Account address")
  .option("-n, --network <network>", "Network to use", "testnet")
  .option("-r, --rpc-url <url>", "Custom RPC URL")
  .option("--json", "Output as JSON", false)
  .action(async (options) => {
    const spinner = ora("Fetching account info...").start();

    try {
      const simulator = createSimulator({
        network: options.network as NetworkType,
        rpcUrl: options.rpcUrl,
      });

      const accountInfo = await simulator.getAccountInfo(options.address);

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(accountInfo, null, 2));
        return;
      }

      printAccountInfo(accountInfo);
    } catch (error) {
      spinner.fail("Failed to fetch account info");
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
      process.exit(1);
    }
  });

// ============================================================================
// Interactive Mode Command
// ============================================================================

program
  .command("interactive")
  .alias("i")
  .description("Start interactive simulation mode")
  .option("-n, --network <network>", "Network to use", "testnet")
  .option("-r, --rpc-url <url>", "Custom RPC URL")
  .action(async (options) => {
    console.log(chalk.cyan("\n🚀 MoveSim Interactive Mode\n"));
    console.log(chalk.gray(`Network: ${options.network}`));
    console.log(
      chalk.gray('Type "help" for available commands, "exit" to quit\n'),
    );

    const simulator = createSimulator({
      network: options.network as NetworkType,
      rpcUrl: options.rpcUrl,
    });

    await runInteractiveMode(simulator);
  });

// ============================================================================
// UI Server Command
// ============================================================================

program
  .command("ui")
  .description("Start the web UI server")
  .option("-p, --port <port>", "Port to run the server on", "3000")
  .option("-n, --network <network>", "Default network", "testnet")
  .action(async (options) => {
    console.log(
      chalk.cyan(`\n🌐 Starting MoveSim Web UI on port ${options.port}...`),
    );
    console.log(chalk.gray(`Default network: ${options.network}\n`));

    // Import and start the API server
    try {
      const { startServer } = await import("../api/server");
      await startServer(parseInt(options.port, 10), options.network);
    } catch (error) {
      console.error(chalk.red("Failed to start UI server"));
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
      process.exit(1);
    }
  });

// ============================================================================
// Config Command
// ============================================================================

program
  .command("config")
  .description("Show network configuration")
  .action(() => {
    console.log(chalk.cyan("\n📡 Network Configurations\n"));

    const table = new Table({
      head: [
        chalk.white("Network"),
        chalk.white("RPC URL"),
        chalk.white("Explorer"),
      ],
      style: { head: [], border: [] },
    });

    Object.entries(NETWORK_CONFIGS).forEach(([name, config]) => {
      table.push([
        chalk.yellow(name),
        config.rpcUrl,
        config.explorerUrl || "-",
      ]);
    });

    console.log(table.toString());
    console.log();
  });

// ============================================================================
// Output Formatting Functions
// ============================================================================

function printSimulationResult(
  result: SimulationResult,
  verbose: boolean,
): void {
  console.log();

  // Status header
  if (result.success) {
    console.log(chalk.green.bold("✅ Simulation Successful"));
  } else {
    console.log(chalk.red.bold("❌ Simulation Failed"));
  }

  console.log();

  // Summary table
  const summaryTable = new Table({
    style: { head: [], border: [] },
  });

  summaryTable.push(
    [chalk.gray("VM Status:"), result.vmStatus],
    [chalk.gray("Gas Used:"), chalk.yellow(result.gasUsed.toLocaleString())],
    [chalk.gray("Gas Price:"), `${result.gasUnitPrice} octas`],
    [chalk.gray("Total Cost:"), chalk.cyan(`${result.totalGasCost} octas`)],
  );

  console.log(summaryTable.toString());
  console.log();

  // Error details if failed
  if (!result.success && result.error) {
    console.log(chalk.red.bold("Error Details:"));
    console.log(chalk.red(`  Code: ${result.error.code}`));
    console.log(chalk.red(`  Message: ${result.error.message}`));
    if (result.suggestion) {
      console.log(chalk.yellow(`\n💡 Suggestion: ${result.suggestion}`));
    }
    console.log();
  }

  // Events
  if (result.events.length > 0) {
    console.log(chalk.blue.bold(`📜 Events (${result.events.length}):`));
    result.events.forEach((event, i) => {
      console.log(chalk.gray(`  ${i + 1}. ${event.type}`));
      if (verbose) {
        console.log(chalk.gray(`     Data: ${JSON.stringify(event.data)}`));
      }
    });
    console.log();
  }

  // State changes
  if (result.stateChanges.length > 0) {
    console.log(
      chalk.blue.bold(`📦 State Changes (${result.stateChanges.length}):`),
    );
    result.stateChanges.forEach((change) => {
      const icon =
        change.type === "created"
          ? "➕"
          : change.type === "deleted"
            ? "➖"
            : "📝";
      console.log(
        chalk.gray(
          `  ${icon} ${change.type.toUpperCase()}: ${change.resource}`,
        ),
      );
      console.log(chalk.gray(`     Address: ${change.address}`));
    });
    console.log();
  }
}

function printGasReport(report: GasReport): void {
  console.log();
  console.log(chalk.cyan.bold("⛽ Gas Analysis Report"));
  console.log();

  // Summary
  const summaryTable = new Table({
    style: { head: [], border: [] },
  });

  summaryTable.push(
    [chalk.gray("Total Gas:"), chalk.yellow(report.totalGas.toLocaleString())],
    [chalk.gray("Gas Price:"), `${report.gasUnitPrice} octas`],
    [chalk.gray("Total Cost:"), chalk.cyan(`${report.totalCost} octas`)],
  );

  console.log(summaryTable.toString());
  console.log();

  // Breakdown
  if (report.breakdown.length > 0) {
    console.log(chalk.blue.bold("📊 Gas Breakdown:"));
    console.log();

    const breakdownTable = new Table({
      head: [
        chalk.white("Category"),
        chalk.white("Gas"),
        chalk.white("Percentage"),
      ],
      style: { head: [], border: [] },
    });

    report.breakdown.forEach((item) => {
      const bar = "█".repeat(Math.floor(item.percentage / 5));
      breakdownTable.push([
        item.category,
        item.amount.toLocaleString(),
        `${item.percentage.toFixed(1)}% ${chalk.green(bar)}`,
      ]);
    });

    console.log(breakdownTable.toString());
    console.log();
  }

  // Suggestions
  if (report.suggestions.length > 0) {
    console.log(chalk.yellow.bold("💡 Optimization Suggestions:"));
    console.log();
    report.suggestions.forEach((suggestion) => {
      const icon =
        suggestion.type === "warning"
          ? "⚠️"
          : suggestion.type === "suggestion"
            ? "💡"
            : "ℹ️";
      console.log(`  ${icon} ${suggestion.message}`);
      if (suggestion.potentialSavings) {
        console.log(
          chalk.green(
            `     Potential savings: ~${suggestion.potentialSavings} gas`,
          ),
        );
      }
    });
    console.log();
  }
}

function printStateDiff(diff: StateDiff): void {
  console.log();
  console.log(chalk.cyan.bold("📋 State Diff"));
  console.log();
  console.log(chalk.gray(`Total changes: ${diff.summary.totalChanges}`));
  console.log(
    chalk.gray(`Resource types: ${diff.summary.resourceTypes.join(", ")}`),
  );
  console.log();

  if (diff.created.length > 0) {
    console.log(chalk.green.bold(`➕ Created (${diff.created.length}):`));
    diff.created.forEach((change) => {
      console.log(chalk.green(`  • ${change.resource}`));
      console.log(chalk.gray(`    Address: ${change.address}`));
    });
    console.log();
  }

  if (diff.modified.length > 0) {
    console.log(chalk.yellow.bold(`📝 Modified (${diff.modified.length}):`));
    diff.modified.forEach((change) => {
      console.log(chalk.yellow(`  • ${change.resource}`));
      console.log(chalk.gray(`    Address: ${change.address}`));
    });
    console.log();
  }

  if (diff.deleted.length > 0) {
    console.log(chalk.red.bold(`➖ Deleted (${diff.deleted.length}):`));
    diff.deleted.forEach((change) => {
      console.log(chalk.red(`  • ${change.resource}`));
      console.log(chalk.gray(`    Address: ${change.address}`));
    });
    console.log();
  }
}

function printInvariantViolations(violations: InvariantViolation[]): void {
  console.log();
  console.log(chalk.cyan.bold("🛡️  Invariant Verification"));
  console.log();

  if (violations.length === 0) {
    console.log(chalk.green("✅ All invariants passed!"));
    console.log();
    return;
  }

  console.log(chalk.red.bold(`❌ Found ${violations.length} violations:`));
  console.log();

  violations.forEach((v, i) => {
    console.log(chalk.red(`  ${i + 1}. ${v.invariant.description}`));
    console.log(chalk.gray(`     Type: ${v.invariant.type}`));
    console.log(chalk.yellow(`     Error: ${v.message}`));
    if (v.invariant.target) {
      console.log(chalk.gray(`     Target: ${v.invariant.target}`));
    }
  });
  console.log();
}


function printExecutionTrace(trace: ExecutionTrace): void {
  console.log();
  console.log(chalk.cyan.bold("🔍 Execution Trace"));
  console.log();
  console.log(chalk.gray(`Total steps: ${trace.totalSteps}`));
  console.log(chalk.gray(`Total gas: ${trace.totalGas.toLocaleString()}`));
  console.log();

  const traceTable = new Table({
    head: [
      chalk.white("#"),
      chalk.white("Instruction"),
      chalk.white("Gas"),
      chalk.white("Cumulative"),
    ],
    style: { head: [], border: [] },
  });

  trace.steps.forEach((step) => {
    traceTable.push([
      step.index.toString(),
      step.instruction,
      step.gasUsed.toLocaleString(),
      step.cumulativeGas.toLocaleString(),
    ]);
  });

  console.log(traceTable.toString());
  console.log();
}

function printModuleInfo(moduleInfo: any): void {
  console.log();
  console.log(
    chalk.cyan.bold(`📦 Module: ${moduleInfo.address}::${moduleInfo.name}`),
  );
  console.log();

  if (moduleInfo.functions.length > 0) {
    console.log(chalk.blue.bold("Functions:"));
    moduleInfo.functions.forEach((fn: any) => {
      const visibility = fn.isEntry
        ? chalk.green("[entry]")
        : chalk.gray(`[${fn.visibility}]`);
      const params = fn.params.map((p: any) => p.type).join(", ");
      console.log(`  ${visibility} ${fn.name}(${params})`);
    });
    console.log();
  }

  if (moduleInfo.structs.length > 0) {
    console.log(chalk.blue.bold("Structs:"));
    moduleInfo.structs.forEach((s: any) => {
      const abilities =
        s.abilities.length > 0
          ? chalk.gray(` has ${s.abilities.join(", ")}`)
          : "";
      console.log(`  • ${s.name}${abilities}`);
    });
    console.log();
  }
}

function printAccountInfo(accountInfo: any): void {
  console.log();
  console.log(chalk.cyan.bold(`👤 Account: ${accountInfo.address}`));
  console.log();

  const infoTable = new Table({
    style: { head: [], border: [] },
  });

  infoTable.push(
    [chalk.gray("Sequence Number:"), accountInfo.sequenceNumber],
    [
      chalk.gray("Auth Key:"),
      accountInfo.authenticationKey.substring(0, 20) + "...",
    ],
  );

  console.log(infoTable.toString());
  console.log();

  if (accountInfo.resources.length > 0) {
    console.log(
      chalk.blue.bold(`Resources (${accountInfo.resources.length}):`),
    );
    accountInfo.resources.slice(0, 10).forEach((resource: any) => {
      console.log(chalk.gray(`  • ${resource.type}`));
    });
    if (accountInfo.resources.length > 10) {
      console.log(
        chalk.gray(`  ... and ${accountInfo.resources.length - 10} more`),
      );
    }
    console.log();
  }
}

// ============================================================================
// Interactive Mode
// ============================================================================

async function runInteractiveMode(simulator: MoveSimulator): Promise<void> {
  let running = true;

  while (running) {
    const { command } = await inquirer.prompt([
      {
        type: "input",
        name: "command",
        message: chalk.cyan("movesim>"),
        prefix: "",
      },
    ]);

    const parts = command.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();

    switch (cmd) {
      case "help":
        printInteractiveHelp();
        break;

      case "simulate":
      case "sim":
        await runInteractiveSimulation(simulator);
        break;

      case "gas":
        await runInteractiveGasAnalysis(simulator);
        break;

      case "network":
        if (parts[1]) {
          try {
            await simulator.switchNetwork(parts[1] as NetworkType);
            console.log(chalk.green(`Switched to ${parts[1]}`));
          } catch (e) {
            console.log(chalk.red("Invalid network"));
          }
        } else {
          console.log(`Current network: ${simulator.getNetwork()}`);
        }
        break;

      case "clear":
        console.clear();
        break;

      case "exit":
      case "quit":
        running = false;
        console.log(chalk.gray("Goodbye! 👋"));
        break;

      case "":
        break;

      default:
        console.log(
          chalk.red(
            `Unknown command: ${cmd}. Type "help" for available commands.`,
          ),
        );
    }
  }
}

function printInteractiveHelp(): void {
  console.log(chalk.cyan("\n📚 Available Commands:\n"));
  console.log("  simulate, sim  - Simulate a transaction interactively");
  console.log("  gas           - Analyze gas usage interactively");
  console.log("  network [name] - Show or change current network");
  console.log("  clear         - Clear the screen");
  console.log("  help          - Show this help message");
  console.log("  exit, quit    - Exit interactive mode\n");
}

async function runInteractiveSimulation(
  simulator: MoveSimulator,
): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "sender",
      message: "Sender address:",
      validate: (input) =>
        input.startsWith("0x") || "Address must start with 0x",
    },
    {
      type: "input",
      name: "function",
      message: "Function (address::module::function):",
      validate: (input) =>
        input.split("::").length === 3 || "Invalid function format",
    },
    {
      type: "input",
      name: "typeArgs",
      message: "Type arguments (comma-separated, or empty):",
    },
    {
      type: "input",
      name: "args",
      message: "Arguments (comma-separated type:value, or empty):",
    },
  ]);

  const spinner = ora("Simulating...").start();

  try {
    const result = await simulator.simulate({
      sender: answers.sender,
      function: answers.function,
      typeArgs: answers.typeArgs
        ? answers.typeArgs.split(",").map((s: string) => s.trim())
        : [],
      args: answers.args
        ? answers.args.split(",").map((s: string) => s.trim())
        : [],
    });

    spinner.stop();
    printSimulationResult(result, false);
  } catch (error) {
    spinner.fail("Simulation failed");
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
  }
}

async function runInteractiveGasAnalysis(
  simulator: MoveSimulator,
): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "sender",
      message: "Sender address:",
      validate: (input) =>
        input.startsWith("0x") || "Address must start with 0x",
    },
    {
      type: "input",
      name: "function",
      message: "Function (address::module::function):",
      validate: (input) =>
        input.split("::").length === 3 || "Invalid function format",
    },
    {
      type: "input",
      name: "typeArgs",
      message: "Type arguments (comma-separated, or empty):",
    },
    {
      type: "input",
      name: "args",
      message: "Arguments (comma-separated type:value, or empty):",
    },
  ]);

  const spinner = ora("Analyzing gas...").start();

  try {
    const report = await simulator.analyzeGas({
      sender: answers.sender,
      function: answers.function,
      typeArgs: answers.typeArgs
        ? answers.typeArgs.split(",").map((s: string) => s.trim())
        : [],
      args: answers.args
        ? answers.args.split(",").map((s: string) => s.trim())
        : [],
    });

    spinner.stop();
    printGasReport(report);
  } catch (error) {
    spinner.fail("Gas analysis failed");
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

// Parse CLI arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(
    chalk.cyan(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🚀  MoveSim - Movement Transaction Simulator  🚀        ║
  ║                                                           ║
  ║   Simulate, analyze, and debug Move transactions          ║
  ║   before executing them on Movement Network               ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `),
  );
  program.help();
}
