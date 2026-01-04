
import { SimulationResult } from '../types';

export type InvariantType = 'resource_exists' | 'resource_missing' | 'balance_min' | 'balance_max' | 'custom';

export interface Invariant {
    type: InvariantType;
    target?: string; // Resource type or address
    params?: Record<string, any>;
    description: string;
}

export interface InvariantViolation {
    invariant: Invariant;
    message: string;
    actualValue?: any;
}

export class InvariantChecker {
    static check(result: SimulationResult, invariants: Invariant[]): InvariantViolation[] {
        const violations: InvariantViolation[] = [];

        for (const invariant of invariants) {
            switch (invariant.type) {
                case 'resource_exists':
                    if (!this.checkResourceExists(result, invariant.target!)) {
                        violations.push({
                            invariant,
                            message: `Resource ${invariant.target} was not created or modified`
                        });
                    }
                    break;
                case 'resource_missing':
                    if (this.checkResourceExists(result, invariant.target!)) {
                        violations.push({
                            invariant,
                            message: `Resource ${invariant.target} should not exist but was found`
                        });
                    }
                    break;
                // Add more checks as needed
            }
        }

        return violations;
    }

    private static checkResourceExists(result: SimulationResult, resourceType: string): boolean {
        return result.stateChanges.some(change =>
            change.resource === resourceType && (change.type === 'created' || change.type === 'modified')
        );
    }
}
