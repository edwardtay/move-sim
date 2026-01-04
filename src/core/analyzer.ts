
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
}
