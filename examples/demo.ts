/**
 * MoveSim Demo - Interactive Example
 * Demonstrates the core features of the MoveSim transaction simulator
 */

import { MoveSimulator, createSimulator, formatGasCost } from '../src';

// Demo configuration
const DEMO_CONFIG = {
  network: 'testnet' as const,
  // Example addresses (replace with real addresses for actual testing)
  senderAddress: '0x1', // Framework address for demo
  recipientAddress: '0x2',
};

/**
 * Main demo function
 */
async function runDemo() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀  MoveSim - Transaction Simulator Demo  🚀                                ║
║                                                                               ║
║   This demo showcases the core features of MoveSim:                           ║
║   • Transaction simulation                                                    ║
║   • Gas analysis                                                              ║
║   • State diff visualization                                                  ║
║   • Execution tracing                                                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Create simulator instance
  console.log('📦 Initializing MoveSim...\n');
  const simulator = createSimulator({
    network: DEMO_CONFIG.network,
  });

  console.log(`✅ Connected to ${DEMO_CONFIG.network} network\n`);

  // Demo 1: Basic Transaction Simulation
  await demoBasicSimulation(simulator);

  // Demo 2: Gas Analysis
  await demoGasAnalysis(simulator);

  // Demo 3: State Diff
  await demoStateDiff(simulator);

  // Demo 4: Module Info
  await demoModuleInfo(simulator);

  // Demo 5: Account Info
  await demoAccountInfo(simulator);

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ✨  Demo Complete!                                                          ║
║                                                                               ║
║   Next steps:                                                                 ║
║   • Try the CLI: npx movesim simulate --help                                  ║
║   • Start the Web UI: npm run ui                                              ║
║   • Read the docs: https://github.com/movesim/movesim                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
}

/**
 * Demo 1: Basic Transaction Simulation
 */
async function demoBasicSimulation(simulator: MoveSimulator) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Demo 1: Basic Transaction Simulation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Simulating a coin transfer transaction...\n');

  try {
    const result = await simulator.simulate({
      sender: DEMO_CONFIG.senderAddress,
      function: '0x1::coin::transfer',
      typeArgs: ['0x1::aptos_coin::AptosCoin'],
      args: [DEMO_CONFIG.recipientAddress, 'u64:1000000'],
    });

    printSimulationResult(result);
  } catch (error) {
    console.log('Note: Simulation failed - this is expected if the account does not exist or has no balance.');
    console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

/**
 * Demo 2: Gas Analysis
 */
async function demoGasAnalysis(simulator: MoveSimulator) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⛽ Demo 2: Gas Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Analyzing gas usage for a transaction...\n');

  try {
    const report = await simulator.analyzeGas({
      sender: DEMO_CONFIG.senderAddress,
      function: '0x1::coin::transfer',
      typeArgs: ['0x1::aptos_coin::AptosCoin'],
      args: [DEMO_CONFIG.recipientAddress, 'u64:1000000'],
    });

    console.log('📊 Gas Report:');
    console.log(`   Total Gas: ${report.totalGas.toLocaleString()}`);
    console.log(`   Gas Price: ${report.gasUnitPrice} octas`);
    console.log(`   Total Cost: ${report.totalCost} octas (${formatGasCost(report.totalGas, report.gasUnitPrice)})`);

    if (report.breakdown.length > 0) {
      console.log('\n   Breakdown:');
      report.breakdown.forEach((item) => {
        const bar = '█'.repeat(Math.floor(item.percentage / 5));
        console.log(`   • ${item.category}: ${item.amount} (${item.percentage.toFixed(1)}%) ${bar}`);
      });
    }

    if (report.suggestions.length > 0) {
      console.log('\n   💡 Optimization Suggestions:');
      report.suggestions.forEach((suggestion) => {
        console.log(`   • ${suggestion.message}`);
      });
    }

    console.log();
  } catch (error) {
    console.log('Note: Gas analysis failed - this is expected without a valid funded account.');
    console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

/**
 * Demo 3: State Diff
 */
async function demoStateDiff(simulator: MoveSimulator) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Demo 3: State Diff');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Computing state changes for a transaction...\n');

  try {
    const diff = await simulator.getStateDiff({
      sender: DEMO_CONFIG.senderAddress,
      function: '0x1::coin::transfer',
      typeArgs: ['0x1::aptos_coin::AptosCoin'],
      args: [DEMO_CONFIG.recipientAddress, 'u64:1000000'],
    });

    console.log('📋 State Diff Summary:');
    console.log(`   Total changes: ${diff.summary.totalChanges}`);
    console.log(`   Resource types: ${diff.summary.resourceTypes.join(', ') || 'None'}`);

    if (diff.created.length > 0) {
      console.log(`\n   ➕ Created (${diff.created.length}):`);
      diff.created.forEach((change) => {
        console.log(`      • ${change.resource}`);
      });
    }

    if (diff.modified.length > 0) {
      console.log(`\n   📝 Modified (${diff.modified.length}):`);
      diff.modified.forEach((change) => {
        console.log(`      • ${change.resource}`);
      });
    }

    if (diff.deleted.length > 0) {
      console.log(`\n   ➖ Deleted (${diff.deleted.length}):`);
      diff.deleted.forEach((change) => {
        console.log(`      • ${change.resource}`);
      });
    }

    console.log();
  } catch (error) {
    console.log('Note: State diff failed - this is expected without a valid funded account.');
    console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

/**
 * Demo 4: Module Info
 */
async function demoModuleInfo(simulator: MoveSimulator) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 Demo 4: Module Information');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Fetching module information for 0x1::coin...\n');

  try {
    const moduleInfo = await simulator.getModule('0x1', 'coin');

    console.log(`📦 Module: ${moduleInfo.address}::${moduleInfo.name}`);

    if (moduleInfo.functions.length > 0) {
      console.log(`\n   Functions (${moduleInfo.functions.length}):`);
      moduleInfo.functions.slice(0, 10).forEach((fn) => {
        const visibility = fn.isEntry ? '[entry]' : `[${fn.visibility}]`;
        console.log(`   ${visibility} ${fn.name}`);
      });
      if (moduleInfo.functions.length > 10) {
        console.log(`   ... and ${moduleInfo.functions.length - 10} more`);
      }
    }

    if (moduleInfo.structs.length > 0) {
      console.log(`\n   Structs (${moduleInfo.structs.length}):`);
      moduleInfo.structs.slice(0, 5).forEach((s) => {
        const abilities = s.abilities.length > 0 ? ` has ${s.abilities.join(', ')}` : '';
        console.log(`   • ${s.name}${abilities}`);
      });
      if (moduleInfo.structs.length > 5) {
        console.log(`   ... and ${moduleInfo.structs.length - 5} more`);
      }
    }

    console.log();
  } catch (error) {
    console.log('Note: Module info fetch failed.');
    console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

/**
 * Demo 5: Account Info
 */
async function demoAccountInfo(simulator: MoveSimulator) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Demo 5: Account Information');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Fetching account information for ${DEMO_CONFIG.senderAddress}...\n`);

  try {
    const accountInfo = await simulator.getAccountInfo(DEMO_CONFIG.senderAddress);

    console.log(`👤 Account: ${accountInfo.address}`);
    console.log(`   Sequence Number: ${accountInfo.sequenceNumber}`);
    console.log(`   Auth Key: ${accountInfo.authenticationKey.substring(0, 20)}...`);

    if (accountInfo.resources.length > 0) {
      console.log(`\n   Resources (${accountInfo.resources.length}):`);
      accountInfo.resources.slice(0, 5).forEach((resource) => {
        console.log(`   • ${resource.type}`);
      });
      if (accountInfo.resources.length > 5) {
        console.log(`   ... and ${accountInfo.resources.length - 5} more`);
      }
    }

    console.log();
  } catch (error) {
    console.log('Note: Account info fetch failed.');
    console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

/**
 * Helper function to print simulation results
 */
function printSimulationResult(result: {
  success: boolean;
  vmStatus: string;
  gasUsed: number;
  gasUnitPrice: number;
  totalGasCost: string;
  events: unknown[];
  stateChanges: unknown[];
  error?: { code: string; message: string };
  suggestion?: string;
}) {
  if (result.success) {
    console.log('✅ Simulation Successful!\n');
  } else {
    console.log('❌ Simulation Failed\n');
  }

  console.log('📊 Results:');
  console.log(`   VM Status: ${result.vmStatus}`);
  console.log(`   Gas Used: ${result.gasUsed.toLocaleString()}`);
  console.log(`   Gas Price: ${result.gasUnitPrice} octas`);
  console.log(`   Total Cost: ${result.totalGasCost} octas`);
  console.log(`   Events: ${result.events.length}`);
  console.log(`   State Changes: ${result.stateChanges.length}`);

  if (result.error) {
    console.log(`\n   ⚠️ Error: ${result.error.code}`);
    console.log(`   Message: ${result.error.message}`);
    if (result.suggestion) {
      console.log(`   💡 Suggestion: ${result.suggestion}`);
    }
  }

  console.log();
}

// Run the demo
runDemo().catch(console.error);
