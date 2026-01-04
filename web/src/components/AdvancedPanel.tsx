
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Play,
    Code,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Copy,
    ShieldCheck,
    Layers,
    FileJson
} from 'lucide-react';
import { BatchGraph } from './BatchGraph';

interface AdvancedPanelProps {
    network: string;
}

export default function AdvancedPanel({ network }: AdvancedPanelProps) {
    const [mode, setMode] = useState<'check' | 'batch'>('check');
    const [input, setInput] = useState('{\n  "payloads": [\n    {\n      "sender": "0x1",\n      "function": "0x1::coin::transfer",\n      "typeArgs": ["0x1::aptos_coin::AptosCoin"],\n      "args": ["0x1", "100"]\n    }\n  ]\n}');
    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExecute = async () => {
        setIsLoading(true);
        setResult(null);
        setError(null);

        try {
            // Validate JSON
            let payload;
            try {
                payload = JSON.parse(input);
            } catch (e) {
                throw new Error("Invalid JSON input");
            }

            const endpoint = mode === 'check' ? '/api/check' : '/api/batch';

            // Construct request body
            const body: any = mode === 'check' ? payload : {
                payloads: Array.isArray(payload) ? payload : payload.payloads,
                network
            };

            if (mode === 'check') {
                // Expects { sender, function, ..., invariants: [] }
                // If user just pasted invariants list, we might need a full payload structure.
                // For simplicity, let's assume user provides full CheckRequest JSON.
                // Or we definitely need a better UI for this later.
                // Let's assume input IS the body for check mode.
                if (!body.network) body.network = network;
            }

            const API_URL = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success) {
                setResult(data.data);
            } else {
                setError(data.error?.message || "Execution failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="space-y-6">
            {/* Mode Selector */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button
                    onClick={() => { setMode('check'); setInput('{\n  "sender": "0x1",\n  "function": "0x1::coin::transfer",\n  "typeArgs": ["0x1::aptos_coin::AptosCoin"],\n  "args": ["0x1", "100"],\n  "invariants": [\n    {\n      "type": "resource_exists",\n      "target": "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>",\n      "description": "CoinStore must exist"\n    }\n  ]\n}'); setResult(null); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'check'
                        ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    Invariant Check
                </button>
                <button
                    onClick={() => { setMode('batch'); setInput('{\n  "payloads": [\n    {\n      "sender": "0x1",\n      "function": "0x1::coin::transfer",\n      "typeArgs": ["0x1::aptos_coin::AptosCoin"],\n      "args": ["0x1", "100"]\n    },\n    {\n      "sender": "0x1",\n      "function": "0x1::coin::transfer",\n      "typeArgs": ["0x1::aptos_coin::AptosCoin"],\n      "args": ["0x1", "200"]\n    }\n  ]\n}'); setResult(null); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'batch'
                        ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    Batch Simulation
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileJson className="w-5 h-5" />
                        JSON Input
                    </h2>

                    <div>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full h-96 font-mono text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                            placeholder="Enter JSON payload..."
                        />
                    </div>

                    <button
                        onClick={handleExecute}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                {mode === 'check' ? 'Verify Invariants' : 'Run Batch'}
                            </>
                        )}
                    </button>
                </motion.div>

                {/* Results Panel */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[500px]">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                            <ShieldCheck className="w-5 h-5" />
                            Execution Results
                        </h2>

                        {!result && !isLoading && !error && (
                            <div className="text-center py-20">
                                <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-full inline-block mb-4">
                                    <Code className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Results will appear here
                                </p>
                            </div>
                        )}

                        {isLoading && (
                            <div className="text-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400">Processing...</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Execution Error</h3>
                                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                                </div>
                            </div>
                        )}

                        {result && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-6"
                            >
                                {mode === 'check' ? (
                                    <>
                                        {/* Invariant Results */}
                                        <div className={`p-4 rounded-lg flex items-center gap-3 ${result.violations.length === 0
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                                            {result.violations.length === 0 ? (
                                                <>
                                                    <CheckCircle className="w-6 h-6" />
                                                    <span className="font-medium">All Invariants Passed</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-6 h-6" />
                                                    <span className="font-medium">{result.violations.length} Invariant Violations Found</span>
                                                </>
                                            )}
                                        </div>

                                        {result.violations.length > 0 && (
                                            <div className="space-y-3">
                                                {result.violations.map((v: any, i: number) => (
                                                    <div key={i} className="p-3 bg-red-50 dark:bg-red-900/10 rounded border border-red-100 dark:border-red-900/30">
                                                        <div className="text-sm font-medium text-red-800 dark:text-red-300">{v.invariant.description}</div>
                                                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">{v.message}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Simulation Details</h3>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                                                    <div className="text-gray-500">Status</div>
                                                    <div className={result.result.success ? 'text-green-600' : 'text-red-600'}>{result.result.success ? 'Success' : 'Failed'}</div>
                                                </div>
                                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                                                    <div className="text-gray-500">Gas Used</div>
                                                    <div>{result.result.gasUsed.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-4">
                                            {/* Graph Visualization */}
                                            {result.batchAnalysis && (
                                                <BatchGraph analysis={result.batchAnalysis} />
                                            )}

                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    Processsed {result.results.length} transactions
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                                        <CheckCircle className="w-3 h-3" /> {result.results.filter((r: any) => r.success).length}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                                        <XCircle className="w-3 h-3" /> {result.results.filter((r: any) => !r.success).length}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                {result.results.map((r: any, i: number) => (
                                                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm flex justify-between items-center group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-mono text-gray-400 w-6">#{i + 1}</span>
                                                            <span className={`flex items-center gap-1.5 font-medium ${r.success ? 'text-green-600' : 'text-red-600'}`}>
                                                                {r.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                                {r.success ? 'Success' : 'Failed'}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {r.gasUsed.toLocaleString()} gas
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <button
                                    onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                                    className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                    Copy Result JSON
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
