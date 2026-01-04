import { motion } from 'framer-motion';
import { Layers, ArrowRight, Activity, Clock } from 'lucide-react';

interface BatchGraphProps {
    analysis: {
        executionLanes: {
            laneId: number;
            transactions: {
                txIndex: number;
                startTime: number;
                duration: number;
                conflicts: number[];
            }[];
        }[];
        estimatedSpeedup: number;
        criticalPathLength: number;
        sequentialLength: number;
    };
}

export function BatchGraph({ analysis }: BatchGraphProps) {
    if (!analysis) return null;

    // Normalize time to width percentage (max width 100%)
    const maxTime = analysis.criticalPathLength || 1;
    const getLeft = (t: number) => (t / maxTime) * 100;
    const getWidth = (d: number) => Math.max(1, (d / maxTime) * 100);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                <Layers className="w-5 h-5 text-purple-500" />
                Block-STM Parallel Execution Visualization
            </h2>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Speedup Factor
                    </div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {analysis.estimatedSpeedup.toFixed(2)}x
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                        vs. Sequential
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Sequential Cost
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {analysis.sequentialLength} units
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" /> Parallel Cost
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {analysis.criticalPathLength} units
                    </div>
                </div>
            </div>

            {/* Lane Visualization */}
            <div className="space-y-4">
                <div className="flex text-xs text-gray-400 mb-2">
                    <span className="w-20">Lane</span>
                    <span>Timeline</span>
                </div>

                {analysis.executionLanes.map((lane) => (
                    <div key={lane.laneId} className="flex gap-4">
                        <div className="w-20 flex items-center text-sm font-medium text-gray-500">
                            Thread #{lane.laneId + 1}
                        </div>
                        <div className="flex-1 h-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 relative overflow-hidden">
                            {lane.transactions.map((tx, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`absolute top-1 bottom-1 rounded flex items-center justify-center text-xs font-bold text-white shadow-sm border border-white/20
                                        ${tx.conflicts.length > 0 ? 'bg-orange-500' : 'bg-green-500'}
                                    `}
                                    style={{
                                        left: `${getLeft(tx.startTime)}%`,
                                        width: `${getWidth(tx.duration)}%`
                                    }}
                                    title={`Tx #${tx.txIndex + 1} - Duration: ${tx.duration}\nConflicts with: ${tx.conflicts.join(', ') || 'None'}`}
                                >
                                    #{tx.txIndex + 1}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex items-center gap-4 text-xs text-gray-500 justify-center">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded"></span>
                    <span>Parallel Execution (No Conflict)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-500 rounded"></span>
                    <span>Dependent Execution (Waited on Conflict)</span>
                </div>
            </div>
        </div>
    );
}
