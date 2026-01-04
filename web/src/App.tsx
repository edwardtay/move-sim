/**
 * MoveSim Web UI - Main Application Component
 * Transaction Simulator for Movement Network
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Zap,
  GitCompare,
  Activity,
  History,
  Moon,
  Sun,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  ChevronDown,
  Terminal,
  Code,
  Layers,
  ShieldCheck,
  Share2
} from 'lucide-react';
import AdvancedPanel from './components/AdvancedPanel';
import { MempoolFeed } from './components/MempoolFeed';
import { ParallelPanel } from './components/ParallelPanel';

// Types
interface SimulationResult {
  success: boolean;
  vmStatus: string;
  gasUsed: number;
  gasUnitPrice: number;
  totalGasCost: string;
  events: MoveEvent[];
  stateChanges: StateChange[];
  error?: SimulationError;
  suggestion?: string;
  timestamp: number;
}

interface MoveEvent {
  guid: { creation_number: string; account_address: string };
  sequence_number: string;
  type: string;
  data: Record<string, unknown>;
}

interface StateChange {
  type: 'created' | 'modified' | 'deleted';
  address: string;
  resource: string;
  data?: unknown;
}

interface SimulationError {
  code: string;
  message: string;
  vmError?: string;
}



const NETWORKS = [
  { id: 'testnet', name: 'Movement Testnet', url: 'https://testnet.movementnetwork.xyz/v1' },
  { id: 'mainnet', name: 'Movement Mainnet', url: 'https://mainnet.movementnetwork.xyz/v1' },
  { id: 'devnet', name: 'Movement Devnet', url: 'https://devnet.movementnetwork.xyz/v1' },
  { id: 'local', name: 'Local', url: 'http://localhost:8080/v1' },
];

// Example transactions for quick testing
const EXAMPLE_TRANSACTIONS = [
  {
    name: 'Coin Transfer',
    function: '0x1::aptos_account::transfer',
    typeArgs: [],
    args: ['0x1', '1000000'],
  },
  {
    name: 'LiquidSwap: Swap Coin to ETH',
    function: '0x190d44266241744264b964a37b8f09863167a12d3eac24828f73f82054fb466d::scripts::swap',
    typeArgs: [
      '0x1::aptos_coin::AptosCoin',
      '0x1::eth::ETH',
      '0x190d44266241744264b964a37b8f09863167a12d3eac24828f73f82054fb466d::curves::Uncorrelated'
    ],
    args: ['1000000', '0'], // amount_in, min_amount_out
  },
  {
    name: 'Stake MOVE',
    function: '0x1::staking_contract::stake',
    typeArgs: [],
    args: ['0x1', '5000000000'], // Stake 50 MOVE
  },
  {
    name: 'Mint NFT (Hero)',
    function: '0x3::token::create_token_script_utils',
    typeArgs: [],
    args: [
      'Hero Collection', // collection name
      'Hero #1', // token name
      'The first hero', // description
      '1', // supply
      'https://example.com/hero.png', // uri
      '0', // royalty points
      '0x1', // royalty payee
      '0', '0', '0', [], [], [] // property keys/values/types
    ],
  },
];

// Main App Component
export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'simulate' | 'gas' | 'diff' | 'history' | 'advanced' | 'mempool'>('simulate');
  const [network, setNetwork] = useState('testnet');
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [sender, setSender] = useState('');
  const [functionId, setFunctionId] = useState('');
  const [typeArgs, setTypeArgs] = useState('');
  const [args, setArgs] = useState('');
  const [maxGas, setMaxGas] = useState('200000');
  const [gasPrice, setGasPrice] = useState('100');
  const [ledgerVersion, setLedgerVersion] = useState('');
  const [balance, setBalance] = useState<string | null>(null);

  // Results state
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Fetch balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!sender || sender.length < 60) {
        setBalance(null);
        return;
      }

      try {
        // Use environment variable for API URL or default to relative /api (for proxy)
        const API_URL = import.meta.env.VITE_API_URL || '';

        // Ensure network is set
        await fetch(`${API_URL}/api/network`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ network })
        });

        const response = await fetch(`${API_URL}/api/account/${sender}`);
        const data = await response.json();

        if (data.success && data.data.resources) {
          const coinStore = data.data.resources.find((r: any) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>');
          if (coinStore && coinStore.data && coinStore.data.coin) {
            const val = parseInt(coinStore.data.coin.value);
            setBalance((val / 100000000).toLocaleString(undefined, { maximumFractionDigits: 4 }));
          } else {
            setBalance('0');
          }
        }
      } catch (e) {
        console.error("Failed to fetch balance", e);
      }
    };

    const debounce = setTimeout(fetchBalance, 500);
    return () => clearTimeout(debounce);

  }, [sender, network]);

  // Load from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const simParam = params.get('sim');
    if (simParam) {
      try {
        const decoded = JSON.parse(atob(simParam));
        if (decoded.sender) setSender(decoded.sender);
        if (decoded.function) setFunctionId(decoded.function);
        if (decoded.typeArgs) setTypeArgs(decoded.typeArgs);
        if (decoded.args) setArgs(decoded.args);
        if (decoded.network) setNetwork(decoded.network);
        if (decoded.maxGas) setMaxGas(decoded.maxGas);
        if (decoded.maxGas) setMaxGas(decoded.maxGas);
        if (decoded.gasPrice) setGasPrice(decoded.gasPrice);
        if (decoded.ledgerVersion) setLedgerVersion(decoded.ledgerVersion);
      } catch (e) {
        console.error("Failed to parse simulation URL", e);
      }
    }
  }, []);

  const handleShare = () => {
    const payload = {
      sender,
      function: functionId,
      typeArgs,
      args,
      network,
      maxGas,
      gasPrice,
      ledgerVersion
    };
    try {
      const encoded = btoa(JSON.stringify(payload));
      const url = `${window.location.origin}?sim=${encoded}`;
      navigator.clipboard.writeText(url);

      // Visual feedback handled by button temporarily changing? 
      // For now let's just use a simple alert or we can add a state.
      // Let's add a state for "isCopied" locally or just alert.
      alert('Shareable link copied to clipboard!');
    } catch (e) {
      console.error("Failed to generate share link", e);
    }
  };

  // Simulate transaction
  const handleSimulate = async () => {
    if (!sender || !functionId) {
      alert('Please enter sender address and function');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender,
          function: functionId,
          typeArgs: typeArgs ? typeArgs.split(',').map(s => s.trim()) : [],
          args: args ? args.split(',').map(s => s.trim()) : [],
          maxGasAmount: parseInt(maxGas),
          gasUnitPrice: parseInt(gasPrice),
          ledgerVersion: ledgerVersion || undefined,
          network,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setHistory(prev => [data.data, ...prev].slice(0, 50));
      } else {
        setResult({
          success: false,
          vmStatus: 'ERROR',
          gasUsed: 0,
          gasUnitPrice: 0,
          totalGasCost: '0',
          events: [],
          stateChanges: [],
          error: data.error,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      setResult({
        success: false,
        vmStatus: 'NETWORK_ERROR',
        gasUsed: 0,
        gasUnitPrice: 0,
        totalGasCost: '0',
        events: [],
        stateChanges: [],
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to connect to API server',
        },
        suggestion: 'Make sure the MoveSim API server is running on port 3000',
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Load example
  const loadExample = (example: typeof EXAMPLE_TRANSACTIONS[0]) => {
    setFunctionId(example.function);
    setTypeArgs(example.typeArgs.join(', '));
    setArgs(example.args.join(', '));
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">MoveSim</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Transaction Simulator for Movement</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Network Selector */}
            <div className="relative">
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="appearance-none bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 pr-8 rounded-lg text-sm font-medium cursor-pointer"
              >
                {NETWORKS.map(net => (
                  <option key={net.id} value={net.id}>{net.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* GitHub Link */}
            <a
              href="https://github.com/movesim/movesim"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              title="Share Simulation"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Input */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto">
              {[
                { id: 'simulate', icon: Play, label: 'Simulate' },
                { id: 'gas', icon: Zap, label: 'Gas Analysis' },
                { id: 'diff', icon: GitCompare, label: 'State Diff' },
                { id: 'history', icon: History, label: 'History' },
                { id: 'mempool', icon: Activity, label: 'Mempool' },
                { id: 'advanced', icon: ShieldCheck, label: 'Advanced' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Transaction Form / History / Advanced */}
            <AnimatePresence mode="wait">
              {activeTab === 'advanced' ? (
                <motion.div
                  key="advanced"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <AdvancedPanel network={network} />
                </motion.div>
              ) : activeTab === 'mempool' ? (
                <motion.div
                  key="mempool"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {/* Mempool Feed - Occupy full left panel or standardized container? */}
                  {/* We are in the "left panel" which is usually inputs. 
                      Maybe we should render it here, or perhaps force it to be full width?
                      For now, let's render it in the left panel container.
                  */}
                  <MempoolFeed network={network} />
                </motion.div>
              ) : activeTab === 'history' ? (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <History className="w-5 h-5" />
                    Simulation History
                  </h2>

                  {history.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No simulations yet. Run your first simulation!
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {history.map((item, i) => (
                        <div
                          key={i}
                          onClick={() => setResult(item)}
                          className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`flex items-center gap-2 text-sm font-medium ${item.success ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {item.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              {item.success ? 'Success' : 'Failed'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            Gas: {item.gasUsed.toLocaleString()} | Events: {item.events.length}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Transaction Details
                  </h2>

                  {/* Examples Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quick Examples
                    </label>
                    <select
                      onChange={(e) => {
                        const idx = parseInt(e.target.value);
                        if (idx >= 0) loadExample(EXAMPLE_TRANSACTIONS[idx]);
                      }}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white"
                      defaultValue="-1"
                    >
                      <option value="-1">Select an example...</option>
                      {EXAMPLE_TRANSACTIONS.map((ex, i) => (
                        <option key={i} value={i}>{ex.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sender Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sender Address *
                    </label>
                    <input
                      type="text"
                      value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      placeholder="0x..."
                      autoComplete="off"
                      spellCheck="false"
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {balance !== null && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Balance: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{balance} MOVE</span>
                      </div>
                    )}
                  </div>

                  {/* Function */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Function *
                    </label>
                    <input
                      type="text"
                      value={functionId}
                      onChange={(e) => setFunctionId(e.target.value)}
                      placeholder="address::module::function"
                      autoComplete="off"
                      spellCheck="false"
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Type Arguments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type Arguments
                    </label>
                    <input
                      type="text"
                      value={typeArgs}
                      onChange={(e) => setTypeArgs(e.target.value)}
                      placeholder="0x1::coin::CoinType, ..."
                      autoComplete="off"
                      spellCheck="false"
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Arguments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Arguments
                    </label>
                    <input
                      type="text"
                      value={args}
                      onChange={(e) => setArgs(e.target.value)}
                      placeholder="type:value, u64:1000, address:0x1..."
                      autoComplete="off"
                      spellCheck="false"
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Gas Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Gas
                      </label>
                      <input
                        type="number"
                        value={maxGas}
                        onChange={(e) => setMaxGas(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Gas Price (octas)
                      </label>
                      <input
                        type="number"
                        value={gasPrice}
                        onChange={(e) => setGasPrice(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Historical Simulation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Block Height / Ledger Version (Optional)
                    </label>
                    <input
                      type="number"
                      value={ledgerVersion}
                      onChange={(e) => setLedgerVersion(e.target.value)}
                      placeholder="Latest"
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Simulate at a specific past state. Leave empty for latest.
                    </p>
                  </div>

                  {/* Simulate Button */}
                  <button
                    onClick={handleSimulate}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Simulating...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Simulate Transaction
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Panel - Results (Hidden on Advanced Tab) */}
          {activeTab !== 'advanced' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Simulation Results
                  </h2>
                </div>

                <div className="p-6">
                  {!result && !isLoading && (
                    <div className="text-center py-12">
                      <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-full inline-block mb-4">
                        <Terminal className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Enter transaction details and click simulate
                      </p>
                    </div>
                  )}

                  {isLoading && (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        Simulating transaction...
                      </p>
                    </div>
                  )}

                  {result && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      {/* Status Banner */}
                      <div className={`flex items-center gap-3 p-4 rounded-lg ${result.success
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        }`}>
                        {result.success ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <XCircle className="w-6 h-6" />
                        )}
                        <div>
                          <div className="font-semibold">
                            {result.success ? 'Simulation Successful' : 'Simulation Failed'}
                          </div>
                          <div className="text-sm opacity-80">{result.vmStatus}</div>
                        </div>
                      </div>

                      {/* Parallelization Analysis */}
                      <ParallelPanel report={(result as any).conflictReport} success={result.success} />

                      {/* Gas Summary */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Gas Used</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {result.gasUsed.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Gas Price</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {result.gasUnitPrice} octas
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Total Cost</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {parseInt(result.totalGasCost).toLocaleString()} octas
                          </div>
                        </div>
                      </div>

                      {/* Error Details */}
                      {result.error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold mb-2">
                            <AlertCircle className="w-5 h-5" />
                            Error Details
                          </div>
                          <div className="text-sm text-red-600 dark:text-red-300">
                            <strong>Code:</strong> {result.error.code}
                          </div>
                          <div className="text-sm text-red-600 dark:text-red-300">
                            <strong>Message:</strong> {result.error.message}
                          </div>
                          {result.suggestion && (
                            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm text-yellow-700 dark:text-yellow-400">
                              💡 <strong>Suggestion:</strong> {result.suggestion}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Events */}
                      {result.events.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            Events ({result.events.length})
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {result.events.map((event, i) => (
                              <div
                                key={i}
                                className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm"
                              >
                                <div className="font-mono text-purple-600 dark:text-purple-400 break-all">
                                  {event.type}
                                </div>
                                <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                                  {JSON.stringify(event.data, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* State Changes */}
                      {result.stateChanges.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <GitCompare className="w-4 h-4" />
                            State Changes ({result.stateChanges.length})
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {result.stateChanges.map((change, i) => (
                              <div
                                key={i}
                                className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${change.type === 'created'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                                    : change.type === 'deleted'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
                                    }`}>
                                    {change.type.toUpperCase()}
                                  </span>
                                  <span className="font-mono text-gray-600 dark:text-gray-400 truncate">
                                    {change.resource}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-500 truncate">
                                  {change.address}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Copy JSON Button */}
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Result as JSON
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            MoveSim • The Developer Experience Platform for Movement Network
          </p>
        </div>
      </footer>
    </div>
  );
}
