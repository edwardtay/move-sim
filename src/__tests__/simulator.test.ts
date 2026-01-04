import { MoveSimulator } from '../core/simulator';

describe('MoveSimulator', () => {
    let simulator: MoveSimulator;

    beforeEach(() => {
        simulator = new MoveSimulator({
            network: 'testnet'
        });
    });

    describe('initialization', () => {
        it('should initialize with default config', () => {
            const sim = new MoveSimulator();
            expect(sim.getNetwork()).toBe('testnet');
        });

        it('should initialize with custom config', () => {
            const sim = new MoveSimulator({ network: 'mainnet' });
            expect(sim.getNetwork()).toBe('mainnet');
        });
    });

    describe('validation', () => {
        it('should throw error if sender is missing', async () => {
            await expect(simulator.simulate({
                function: '0x1::coin::transfer',
                args: [],
                sender: ''
            })).resolves.toMatchObject({
                success: false,
                error: {
                    code: 'SIMULATION_ERROR'
                }
            });
        });

        it('should throw error if function is missing', async () => {
            await expect(simulator.simulate({
                function: '',
                args: [],
                sender: '0x1'
            })).resolves.toMatchObject({
                success: false,
                error: {
                    code: 'SIMULATION_ERROR'
                }
            });
        });
    });

    describe('network switching', () => {
        it('should switch network correctly', async () => {
            await simulator.switchNetwork('mainnet');
            expect(simulator.getNetwork()).toBe('mainnet');
        });
    });
});
