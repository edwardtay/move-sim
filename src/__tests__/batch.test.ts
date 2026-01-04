
import { MoveSimulator } from '../core/simulator';
import { TransactionPayload, SimulationResult } from '../types';

// Mock the simulate method
const mockSimulate = jest.fn();

describe('MoveSimulator Batch', () => {
    let simulator: MoveSimulator;

    beforeEach(() => {
        simulator = new MoveSimulator();
        // @ts-ignore - Mocking private/protected method for testing flow
        simulator.simulate = mockSimulate;
        mockSimulate.mockReset();
    });

    it('should execute transactions sequentially', async () => {
        const payloads: TransactionPayload[] = [
            { sender: '0x1', function: '0x1::c::f1' },
            { sender: '0x1', function: '0x1::c::f2' }
        ];

        mockSimulate
            .mockResolvedValueOnce({ success: true, gasUsed: 100 } as SimulationResult)
            .mockResolvedValueOnce({ success: true, gasUsed: 200 } as SimulationResult);

        const results = await simulator.simulateBatch(payloads);

        expect(results).toHaveLength(2);
        expect(mockSimulate).toHaveBeenCalledTimes(2);
        expect(mockSimulate).toHaveBeenNthCalledWith(1, payloads[0]);
        expect(mockSimulate).toHaveBeenNthCalledWith(2, payloads[1]);
    });

    it('should stop on failure', async () => {
        const payloads: TransactionPayload[] = [
            { sender: '0x1', function: '0x1::c::f1' },
            { sender: '0x1', function: '0x1::c::f2' }
        ];

        mockSimulate
            .mockResolvedValueOnce({ success: false, vmStatus: 'ERROR' } as SimulationResult);

        const results = await simulator.simulateBatch(payloads);

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(false);
        expect(mockSimulate).toHaveBeenCalledTimes(1);
    });
});
