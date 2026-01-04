import { InvariantChecker, Invariant } from '../core/invariants';
import { SimulationResult } from '../types';

describe('InvariantChecker', () => {
    const mockResult: SimulationResult = {
        success: true,
        vmStatus: 'Executed successfully',
        gasUsed: 100,
        gasUnitPrice: 100,
        totalGasCost: '10000',
        events: [],
        stateChanges: [
            {
                type: 'created',
                address: '0x1',
                resource: '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
                data: { type: '0x1::coin::CoinStore', data: {} }
            }
        ],
        timestamp: Date.now()
    };

    it('should pass if resource exists when required', () => {
        const invariants: Invariant[] = [
            {
                type: 'resource_exists',
                target: '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
                description: 'CoinStore must be created'
            }
        ];

        const violations = InvariantChecker.check(mockResult, invariants);
        expect(violations).toHaveLength(0);
    });

    it('should fail if resource does not exist when required', () => {
        const invariants: Invariant[] = [
            {
                type: 'resource_exists',
                target: '0x1::missing::Resource',
                description: 'Resource must be created'
            }
        ];

        const violations = InvariantChecker.check(mockResult, invariants);
        expect(violations).toHaveLength(1);
        expect(violations[0].message).toContain('not created or modified');
    });

    it('should fail if resource exists when it should be missing', () => {
        const invariants: Invariant[] = [
            {
                type: 'resource_missing',
                target: '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
                description: 'CoinStore must not exist'
            }
        ];

        const violations = InvariantChecker.check(mockResult, invariants);
        expect(violations).toHaveLength(1);
        expect(violations[0].message).toContain('should not exist');
    });
});
