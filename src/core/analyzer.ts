
import { SimulationResult, ConflictReport, ContentionInfo, RiskLevel, StateChange } from "../types";

/**
 * Analyzes transactions for Block-STM parallel execution conflicts.
 * Identifies "hot" resources that might cause sequential bottlenecks.
 */
export class ConflictAnalyzer {

    // Known hot resources that often cause contention
    private static readonly HOT_RESOURCES = new Map<string, string>([
        ["0x1::coin::CoinInfo", "Global Coin Metadata (High Contention)"],
        ["0x1::block::BlockMetadata", "Block Metadata (Sequential)"],
        ["0x1::stake::StakePool", "Staking Pool (High Contention)"],
        ["0x1::timestamp::CurrentTimeMicroseconds", "Global Timestamp (Sequential)"],
        ["0x1::sequence_number::SequenceNumber", "Account Sequence Number (Sequential per account)"]
    ]);

    /**
     * Analyze a simulation result for potential parallelization conflicts
     */
    public static analyze(result: SimulationResult): ConflictReport {
        const contentionPoints: ContentionInfo[] = [];
        let score = 100;

        // 1. Analyze Write Sets (State Changes)
        const writes = result.stateChanges.filter(c => c.type === 'modified' || c.type === 'created' || c.type === 'deleted');

        for (const change of writes) {
            const info = this.analyzeResource(change);
            if (info) {
                contentionPoints.push(info);
            }
        }

        // 2. Calculate Score
        let highRiskCount = 0;
        let mediumRiskCount = 0;

        for (const point of contentionPoints) {
            if (point.risk === 'HIGH') {
                score -= 40;
                highRiskCount++;
            } else if (point.risk === 'MEDIUM') {
                score -= 10;
                mediumRiskCount++;
            }
        }

        // Floor score at 0
        score = Math.max(0, score);

        // 3. Determine Overall Risk
        let riskLevel: RiskLevel = 'LOW';
        if (highRiskCount > 0 || score < 50) {
            riskLevel = 'HIGH';
        } else if (mediumRiskCount > 0 || score < 80) {
            riskLevel = 'MEDIUM';
        }

        // 4. Generate Recommendation
        const recommendation = this.generateRecommendation(riskLevel, contentionPoints);

        return {
            score,
            riskLevel,
            contentionPoints,
            recommendation
        };
    }

    private static analyzeResource(change: StateChange): ContentionInfo | null {
        // Check known hot resources
        for (const [key, description] of this.HOT_RESOURCES.entries()) {
            if (change.resource.includes(key)) {
                return {
                    resource: change.resource,
                    address: change.address,
                    risk: 'HIGH',
                    reason: `Modifies ${description}. This forces all transactions touching this to execute sequentially.`
                };
            }
        }

        // Heuristic: Modifying Framework Resources (0x1) is generally riskier for parallelism
        if (change.address === "0x1" && !this.isSafeFrameworkResource(change.resource)) {
            return {
                resource: change.resource,
                address: change.address,
                risk: 'MEDIUM',
                reason: "Modifies core Framework state. Potential for shared contention."
            };
        }

        // Heuristic: Modifying Account Sequence Number is natural but sequential for THAT account
        if (change.resource.includes("::account::Account")) {
            return {
                resource: change.resource,
                address: change.address,
                risk: 'LOW',
                reason: "Updates sequence number. Only blocks transactions from THIS sender."
            };
        }

        return null;
    }

    private static isSafeFrameworkResource(_resource: string): boolean {
        // Some 0x1 resources are safe/user-specific
        // e.g., CoinStore<Type> is user specific, identifying it by the full type string is hard without parsing
        // But usually CoinStore are stored at User Address, not 0x1. 
        // If a resource is at 0x1, it is almost always global.
        return false;
    }

    private static generateRecommendation(risk: RiskLevel, points: ContentionInfo[]): string {
        if (risk === 'HIGH') {
            const hot = points.find(p => p.risk === 'HIGH');
            return `Critical Bottleneck Detected: Modifying ${hot?.resource}. This limits Block-STM throughput. Consider sharding this resource or using aggregators.`;
        }
        if (risk === 'MEDIUM') {
            return "Moderate Contention. Your transaction modifies shared framework state. Ensure this is necessary.";
        }
        return "Excellent Parallelization! This transaction mostly modifies local/user-specific state and scales well with Block-STM.";
    }

    /**
     * Analyze a batch of transactions to simulate Block-STM parallel execution
     */
    public static analyzeBatch(results: SimulationResult[]): import("../types").BatchAnalysis {
        const nodes: import("../types").DependencyNode[] = [];

        // 1. Build Dependency Nodes
        // Note: In real Block-STM, read-sets are dynamic. Here we infer them from WriteSets + Heuristics
        for (let i = 0; i < results.length; i++) {
            const res = results[i];
            const writes = new Set<string>();
            const reads = new Set<string>(); // Reads are harder to know perfectly without deep tracing

            // Extract writes
            res.stateChanges.forEach(c => {
                if (c.type !== 'deleted') writes.add(c.resource);
            });

            // Heuristic: Input arguments often imply reads but we can't know for sure.
            // For accurately simulating contention, we assume that if Tx A writes to X, 
            // and Tx B writes to X, there is a dependency (WAW).
            // RAW is also a dependency. 
            // For this simulator, we focus on Write-Write conflicts as they are the primary Block-STM abort cause.

            nodes.push({
                txIndex: i,
                dependencies: [],
                readSet: Array.from(reads),
                writeSet: Array.from(writes)
            });
        }

        // 2. Build Graph Edges (Find Conflicts)
        // Tx J depends on Tx I if I < J AND (Write(I) intersects Read(J) OR Write(I) intersects Write(J))
        for (let j = 0; j < nodes.length; j++) {
            for (let i = 0; i < j; i++) {
                const nodeI = nodes[i];
                const nodeJ = nodes[j];

                // Check intersection
                const hasConflict = nodeI.writeSet.some(r => nodeJ.writeSet.includes(r));

                if (hasConflict) {
                    nodeJ.dependencies.push(i);
                }
            }
        }

        // 3. Schedule Lanes (Simple Greedy Scheduler)
        const lanes: import("../types").ExecutionLane[] = [];
        const txCompletionTimes = new Map<number, number>(); // txIndex -> endTime

        // Initialize lanes (e.g., 4 threads)
        const LANE_COUNT = 4;
        for (let k = 0; k < LANE_COUNT; k++) lanes.push({ laneId: k, transactions: [] });
        const laneFreeTimes = new Array(LANE_COUNT).fill(0);

        let maxTime = 0;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            // Earliest start time is when all dependencies form previous transactions are done
            let minStartTime = 0;
            for (const dep of node.dependencies) {
                const depTime = txCompletionTimes.get(dep) || 0;
                if (depTime > minStartTime) minStartTime = depTime;
            }

            // Find the best lane (earliest available after minStartTime)
            let bestLane = 0;
            let earliestFinish = Number.MAX_VALUE;

            // "Gas" is a proxy for duration. Normalized to small units.
            const duration = Math.ceil(Math.max(100, results[i].gasUsed) / 100);

            for (let k = 0; k < LANE_COUNT; k++) {
                // The lane is free at laneFreeTimes[k].
                // But we also can't start before minStartTime.
                const actualStart = Math.max(laneFreeTimes[k], minStartTime);
                const finish = actualStart + duration;

                if (finish < earliestFinish) {
                    earliestFinish = finish;
                    bestLane = k;
                }
            }

            const startTime = Math.max(laneFreeTimes[bestLane], minStartTime);
            const endTime = startTime + duration;

            // Schedule it
            lanes[bestLane].transactions.push({
                txIndex: i,
                startTime,
                duration,
                conflicts: node.dependencies
            });
            laneFreeTimes[bestLane] = endTime;
            txCompletionTimes.set(i, endTime);

            if (endTime > maxTime) maxTime = endTime;
        }

        // 4. metrics
        const sequentialLength = nodes.reduce((acc, _, idx) => acc + Math.ceil(Math.max(100, results[idx].gasUsed) / 100), 0);

        return {
            executionLanes: lanes,
            dependencyGraph: nodes,
            criticalPathLength: maxTime,
            // Simple sum of all gas/durations
            sequentialLength,
            estimatedSpeedup: sequentialLength / maxTime
        };
    }
}
