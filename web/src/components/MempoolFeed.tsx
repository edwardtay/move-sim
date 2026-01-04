import { useState, useEffect, useRef } from 'react';
import { Activity, Clock, Pause, Play, Hash } from 'lucide-react';

interface MempoolTransaction {
    hash: string;
    sender: string;
    sequence_number: string;
    max_gas_amount: string;
    gas_unit_price: string;
    expiration_timestamp_secs: string;
    type: string;
    timestamp: number;
    payload: any;
}

interface MempoolFeedProps {
    network: string;
}

export function MempoolFeed({ network }: MempoolFeedProps) {
    const [transactions, setTransactions] = useState<MempoolTransaction[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    // Connect to WebSocket
    useEffect(() => {
        const connect = () => {
            // Use configured API URL or guess based on current location
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // If dev environment, assume port 3000 for backend if running separately
            const url = import.meta.env.VITE_API_URL
                ? `${import.meta.env.VITE_API_URL.replace('http', 'ws')}/ws`
                : `${wsProtocol}//localhost:3000/ws`;

            const ws = new WebSocket(url);

            ws.onopen = () => {
                setIsConnected(true);
                ws.send(JSON.stringify({ type: 'subscribe_mempool' }));
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'mempool_update' && !isPaused) {
                        const newTxs: MempoolTransaction[] = message.data;
                        setTransactions(prev => {
                            // Deduplicate and prepend
                            const existingHashes = new Set(prev.map(t => t.hash));
                            const uniqueNew = newTxs.filter(t => !existingHashes.has(t.hash));
                            return [...uniqueNew, ...prev].slice(0, 50); // Keep last 50
                        });
                    }
                } catch (e) {
                    console.error("Failed to parse websocket message", e);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                // Reconnect every 5s
                setTimeout(connect, 5000);
            };

            wsRef.current = ws;
        };

        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [network]); // Reconnect if network logic changes (though backend handles network switch globaly)

    // Helper to format payload
    const formatPayload = (payload: any) => {
        if (!payload) return 'Unknown';
        if (payload.type === 'entry_function_payload') {
            return `${payload.function.split('::').pop()}()`;
        }
        return payload.type || 'Transaction';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className={`w-5 h-5 ${isConnected ? 'text-green-500' : 'text-gray-400'}`} />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Mempool Feed</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {isConnected ? 'Live' : 'Connecting...'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="p-1.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        {isPaused ? <Play className="w-4 h-4 text-gray-600 dark:text-gray-300" /> : <Pause className="w-4 h-4 text-gray-600 dark:text-gray-300" />}
                    </button>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {transactions.length} items
                    </div>
                </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
                {transactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        {isConnected ? (
                            <div className="flex flex-col items-center gap-2">
                                <Activity className="w-8 h-8 opacity-20 animate-pulse" />
                                <p>Waiting for network activity...</p>
                            </div>
                        ) : (
                            <p>Connecting to feed...</p>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {transactions.map((tx) => (
                            <div key={tx.hash} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-mono px-2 py-0.5 rounded">
                                            {formatPayload(tx.payload)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-mono">
                                            {tx.sender.slice(0, 6)}...{tx.sender.slice(-4)}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(tx.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                                        <Hash className="w-3 h-3" />
                                        <span className="truncate max-w-[200px]">{tx.hash}</span>
                                    </div>
                                    <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
                                        Max Gas: {parseInt(tx.max_gas_amount).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
