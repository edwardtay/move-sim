import { Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ParallelPanelProps {
    report?: any;
}

export function ParallelPanel({ report }: ParallelPanelProps) {
    if (!report) return null;

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 50) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
        if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30';
        return 'bg-red-100 dark:bg-red-900/30';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-blue-500" />
                Block-STM Parallelization Score
            </h2>

            <div className="flex items-center gap-6 mb-6">
                <div className={`relative w-24 h-24 rounded-full flex items-center justify-center border-4 ${getScoreColor(report.score)} border-current ${getScoreBg(report.score)}`}>
                    <span className="text-3xl font-bold">{report.score}</span>
                </div>
                <div className="flex-1">
                    <h3 className={`text-xl font-bold ${getScoreColor(report.score)} mb-1`}>
                        {report.riskLevel === 'LOW' ? 'Excellent' : report.riskLevel === 'MEDIUM' ? 'Moderate' : 'Poor'} Parallelism
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {report.recommendation}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {!report.contentionPoints || report.contentionPoints.length === 0 ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">No resource contention detected. Fully parallelizable!</span>
                    </div>
                ) : (
                    report.contentionPoints.map((point: any, idx: number) => (
                        <div key={idx} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
                            {point?.risk === 'HIGH' ? (
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                            ) : (
                                <Info className="w-5 h-5 text-yellow-500 shrink-0" />
                            )}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${point?.risk === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {point?.risk || 'UNKNOWN'} RISK
                                    </span>
                                    <code className="text-xs bg-gray-200 dark:bg-gray-800 px-1 rounded">{point?.resource || 'unknown'}</code>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{point?.reason}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500">
                    Analysis based on <strong>Real RPC WriteSets</strong>. High scores indicate your transaction plays well with Movement's parallel execution engine.
                </p>
            </div>
        </div>
    );
}
