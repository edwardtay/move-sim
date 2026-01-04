# Movement Transaction Simulator (MoveSim)

A Tenderly-like transaction simulation and debugging tool for the Movement Network. Simulate, analyze, and debug Move transactions before executing them on-chain.

![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 🎯 Problem Statement

Movement's developer experience has gaps when it comes to transaction debugging and simulation. Developers currently face:

- **No pre-execution simulation**: Can't preview transaction outcomes before committing
- **Poor error messages**: Cryptic errors when transactions fail
- **No gas estimation visualization**: Hard to optimize gas costs
- **No state diff preview**: Can't see what resources will change
- **Limited debugging tools**: No step-by-step execution tracing

## 💡 Solution

**MoveSim** provides a comprehensive transaction simulation toolkit:

- 🔮 **Transaction Simulation**: Preview any transaction before execution
- 💰 **Gas Estimation**: Accurate gas cost predictions with optimization tips
- 📊 **State Diff Visualization**: See exactly what resources change
- 🌊 **Mempool Stream**: Watch pending transactions in real-time
- 🕰️ **Historical Simulation**: Simulate transactions against past ledger states
- 🐛 **Error Debugging**: Human-readable error messages with fix suggestions
- 📜 **Event Preview**: See all events that will be emitted
- 🔍 **Execution Tracing**: Step-by-step transaction execution breakdown
- 🌐 **Web UI & CLI**: Use via browser or command line

## 🚀 Quick Start

### Installation

```bash
# Install CLI globally
npm install -g movesim

# Or use npx
npx movesim simulate <transaction>
```

### Basic Usage

```bash
# Simulate a coin transfer
movesim simulate \
  --function 0x1::aptos_coin::transfer \
  --args address:0x123... u64:1000000 \
  --sender 0xabc...

# Simulate with full trace
movesim simulate \
  --function 0x1::coin::transfer \
  --type-args 0x1::aptos_coin::AptosCoin \
  --args address:0x123... u64:1000000 \
  --sender 0xabc... \
  --trace

# Start web UI
movesim ui --port 3000
```

## 🖥️ Web Interface

Start the web UI for a visual simulation experience:

```bash
cd web
npm install
npm run dev
```

Features:
- 📝 Transaction builder with autocomplete
- 📊 Visual state diff viewer
- 🌳 Resource tree explorer
- 📈 Gas usage breakdown charts
- 🔄 Transaction history

## 📦 SDK Usage

```typescript
import { MoveSim } from 'movesim';

const simulator = new MoveSim({
  network: 'testnet', // or 'mainnet', 'devnet'
  rpcUrl: 'https://testnet.movementnetwork.xyz/v1'
});

// Simulate a transaction
const result = await simulator.simulate({
  sender: '0x123...',
  function: '0x1::coin::transfer',
  typeArgs: ['0x1::aptos_coin::AptosCoin'],
  args: ['0x456...', '1000000']
});

console.log(result);
// {
//   success: true,
//   gasUsed: 500,
//   gasUnitPrice: 100,
//   totalGasCost: '50000',
//   events: [...],
//   stateChanges: [...],
//   executionTrace: [...]
// }
```

## 🔧 Features

### 1. Transaction Simulation

```typescript
const result = await simulator.simulate({
  sender: '0x123...',
  function: '0xdead::my_module::my_function',
  args: ['arg1', 'arg2']
});

if (result.success) {
  console.log('Transaction would succeed!');
  console.log('Estimated gas:', result.gasUsed);
} else {
  console.log('Transaction would fail:', result.error);
  console.log('Suggested fix:', result.suggestion);
}
```

### 2. State Diff Preview

```typescript
const diff = await simulator.getStateDiff({
  sender: '0x123...',
  function: '0xdead::nft::mint',
  args: ['My NFT', 'https://...']
});

console.log('Resources created:', diff.created);
console.log('Resources modified:', diff.modified);
console.log('Resources deleted:', diff.deleted);
```

### 3. Gas Optimization

```typescript
const gasReport = await simulator.analyzeGas({
  sender: '0x123...',
  function: '0xdead::my_module::expensive_function',
  args: []
});

console.log('Gas breakdown:', gasReport.breakdown);
console.log('Optimization tips:', gasReport.suggestions);
```

### 4. Execution Tracing

```typescript
const trace = await simulator.trace({
  sender: '0x123...',
  function: '0xdead::my_module::my_function',
  args: []
});

trace.steps.forEach((step, i) => {
  console.log(`Step ${i}: ${step.instruction}`);
  console.log(`  Gas: ${step.gasUsed}`);
  console.log(`  Stack: ${step.stack}`);
});
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        MoveSim                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   CLI Tool  │  │   Web UI    │  │   TypeScript SDK    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │              Simulation Engine                         │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │ Transaction │  │    State     │  │     Gas      │  │  │
│  │  │   Parser    │  │   Manager    │  │   Analyzer   │  │  │
│  │  └─────────────┘  └──────────────┘  └──────────────┘  │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │              Movement Network RPC                      │  │
│  │  (Testnet / Mainnet / Local)                          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 💰 Monetization Strategy

1. **Free Tier**: 100 simulations/month, basic features
2. **Pro Tier ($29/mo)**: Unlimited simulations, advanced tracing, priority RPC
3. **Team Tier ($99/mo)**: Team collaboration, shared history, API access
4. **Enterprise**: Custom deployment, SLA, dedicated support

## 🛣️ Roadmap

- [x] Core simulation engine
- [x] CLI tool
- [x] Web UI
- [x] TypeScript SDK
- [ ] VS Code extension
- [ ] GitHub Actions integration
- [ ] Multi-transaction simulation (batch)
- [ ] Mainnet deployment
- [x] Historical transaction replay

## 🧪 Demo

Try the live demo: [move-sim.vercel.app](https://move-sim.vercel.app) (Frontend) | [Backend API](https://movesim-backend-660587902574.us-central1.run.app)

Or run locally:

```bash
git clone https://github.com/your-repo/movesim
cd movesim
npm install
npm run demo
```

## 📖 Documentation

- [Getting Started Guide](./docs/getting-started.md)
- [CLI Reference](./docs/cli.md)
- [SDK Reference](./docs/sdk.md)
- [API Reference](./docs/api.md)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](./LICENSE)
