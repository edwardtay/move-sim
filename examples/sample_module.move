/// Sample Move Module for MoveSim Testing
/// This module demonstrates various Move features that can be simulated
/// using the MoveSim transaction simulator.
///
/// Deploy this module to test:
/// - Transaction simulation
/// - Gas analysis
/// - State diff visualization
/// - Event emission tracking

module movesim_demo::counter {
    use std::signer;
    use std::error;
    use aptos_framework::event;
    use aptos_framework::account;

    // ============================================================================
    // Error Codes
    // ============================================================================

    /// Counter resource doesn't exist for this account
    const E_COUNTER_NOT_FOUND: u64 = 1;
    /// Counter already exists for this account
    const E_COUNTER_ALREADY_EXISTS: u64 = 2;
    /// Cannot decrement below zero
    const E_UNDERFLOW: u64 = 3;
    /// Value exceeds maximum allowed
    const E_OVERFLOW: u64 = 4;
    /// Only owner can perform this action
    const E_NOT_OWNER: u64 = 5;

    // ============================================================================
    // Constants
    // ============================================================================

    const MAX_COUNTER_VALUE: u64 = 1_000_000_000;

    // ============================================================================
    // Resources
    // ============================================================================

    /// The main counter resource stored in user accounts
    struct Counter has key, store {
        /// Current value of the counter
        value: u64,
        /// Total number of increments performed
        total_increments: u64,
        /// Total number of decrements performed
        total_decrements: u64,
        /// Owner address
        owner: address,
    }

    /// Global statistics for the counter module
    struct GlobalStats has key {
        /// Total counters created
        total_counters: u64,
        /// Total operations across all counters
        total_operations: u64,
    }

    // ============================================================================
    // Events
    // ============================================================================

    #[event]
    struct CounterCreatedEvent has drop, store {
        owner: address,
        initial_value: u64,
    }

    #[event]
    struct CounterIncrementedEvent has drop, store {
        owner: address,
        old_value: u64,
        new_value: u64,
        increment_amount: u64,
    }

    #[event]
    struct CounterDecrementedEvent has drop, store {
        owner: address,
        old_value: u64,
        new_value: u64,
        decrement_amount: u64,
    }

    #[event]
    struct CounterResetEvent has drop, store {
        owner: address,
        old_value: u64,
    }

    // ============================================================================
    // Initialization
    // ============================================================================

    /// Initialize global statistics (called once during module deployment)
    fun init_module(deployer: &signer) {
        move_to(deployer, GlobalStats {
            total_counters: 0,
            total_operations: 0,
        });
    }

    // ============================================================================
    // Entry Functions
    // ============================================================================

    /// Create a new counter for the signer with an optional initial value
    public entry fun create_counter(
        account: &signer,
        initial_value: u64
    ) acquires GlobalStats {
        let account_addr = signer::address_of(account);

        // Check counter doesn't already exist
        assert!(
            !exists<Counter>(account_addr),
            error::already_exists(E_COUNTER_ALREADY_EXISTS)
        );

        // Check initial value is within bounds
        assert!(
            initial_value <= MAX_COUNTER_VALUE,
            error::invalid_argument(E_OVERFLOW)
        );

        // Create and store the counter
        let counter = Counter {
            value: initial_value,
            total_increments: 0,
            total_decrements: 0,
            owner: account_addr,
        };
        move_to(account, counter);

        // Update global stats
        let stats = borrow_global_mut<GlobalStats>(@movesim_demo);
        stats.total_counters = stats.total_counters + 1;

        // Emit event
        event::emit(CounterCreatedEvent {
            owner: account_addr,
            initial_value,
        });
    }

    /// Increment the counter by a specified amount
    public entry fun increment(
        account: &signer,
        amount: u64
    ) acquires Counter, GlobalStats {
        let account_addr = signer::address_of(account);

        // Check counter exists
        assert!(
            exists<Counter>(account_addr),
            error::not_found(E_COUNTER_NOT_FOUND)
        );

        let counter = borrow_global_mut<Counter>(account_addr);
        let old_value = counter.value;
        let new_value = old_value + amount;

        // Check for overflow
        assert!(
            new_value <= MAX_COUNTER_VALUE,
            error::invalid_argument(E_OVERFLOW)
        );

        // Update counter
        counter.value = new_value;
        counter.total_increments = counter.total_increments + 1;

        // Update global stats
        let stats = borrow_global_mut<GlobalStats>(@movesim_demo);
        stats.total_operations = stats.total_operations + 1;

        // Emit event
        event::emit(CounterIncrementedEvent {
            owner: account_addr,
            old_value,
            new_value,
            increment_amount: amount,
        });
    }

    /// Decrement the counter by a specified amount
    public entry fun decrement(
        account: &signer,
        amount: u64
    ) acquires Counter, GlobalStats {
        let account_addr = signer::address_of(account);

        // Check counter exists
        assert!(
            exists<Counter>(account_addr),
            error::not_found(E_COUNTER_NOT_FOUND)
        );

        let counter = borrow_global_mut<Counter>(account_addr);
        let old_value = counter.value;

        // Check for underflow
        assert!(
            old_value >= amount,
            error::invalid_argument(E_UNDERFLOW)
        );

        let new_value = old_value - amount;

        // Update counter
        counter.value = new_value;
        counter.total_decrements = counter.total_decrements + 1;

        // Update global stats
        let stats = borrow_global_mut<GlobalStats>(@movesim_demo);
        stats.total_operations = stats.total_operations + 1;

        // Emit event
        event::emit(CounterDecrementedEvent {
            owner: account_addr,
            old_value,
            new_value,
            decrement_amount: amount,
        });
    }

    /// Reset the counter to zero
    public entry fun reset(account: &signer) acquires Counter, GlobalStats {
        let account_addr = signer::address_of(account);

        // Check counter exists
        assert!(
            exists<Counter>(account_addr),
            error::not_found(E_COUNTER_NOT_FOUND)
        );

        let counter = borrow_global_mut<Counter>(account_addr);
        let old_value = counter.value;

        // Reset value
        counter.value = 0;

        // Update global stats
        let stats = borrow_global_mut<GlobalStats>(@movesim_demo);
        stats.total_operations = stats.total_operations + 1;

        // Emit event
        event::emit(CounterResetEvent {
            owner: account_addr,
            old_value,
        });
    }

    /// Batch increment - increment multiple times in a single transaction
    /// Useful for testing gas costs of complex operations
    public entry fun batch_increment(
        account: &signer,
        amount: u64,
        times: u64
    ) acquires Counter, GlobalStats {
        let i = 0;
        while (i < times) {
            increment(account, amount);
            i = i + 1;
        };
    }

    // ============================================================================
    // View Functions
    // ============================================================================

    #[view]
    /// Get the current value of a counter
    public fun get_value(account_addr: address): u64 acquires Counter {
        assert!(
            exists<Counter>(account_addr),
            error::not_found(E_COUNTER_NOT_FOUND)
        );
        borrow_global<Counter>(account_addr).value
    }

    #[view]
    /// Get full counter stats
    public fun get_counter_stats(account_addr: address): (u64, u64, u64) acquires Counter {
        assert!(
            exists<Counter>(account_addr),
            error::not_found(E_COUNTER_NOT_FOUND)
        );
        let counter = borrow_global<Counter>(account_addr);
        (counter.value, counter.total_increments, counter.total_decrements)
    }

    #[view]
    /// Check if a counter exists for an address
    public fun has_counter(account_addr: address): bool {
        exists<Counter>(account_addr)
    }

    #[view]
    /// Get global statistics
    public fun get_global_stats(): (u64, u64) acquires GlobalStats {
        let stats = borrow_global<GlobalStats>(@movesim_demo);
        (stats.total_counters, stats.total_operations)
    }

    // ============================================================================
    // Test Functions
    // ============================================================================

    #[test_only]
    use aptos_framework::account::create_account_for_test;

    #[test(deployer = @movesim_demo, user = @0x123)]
    public fun test_create_counter(deployer: &signer, user: &signer) acquires GlobalStats {
        // Initialize module
        init_module(deployer);

        // Create test account
        create_account_for_test(signer::address_of(user));

        // Create counter
        create_counter(user, 100);

        // Verify counter exists
        assert!(has_counter(signer::address_of(user)), 0);
    }

    #[test(deployer = @movesim_demo, user = @0x123)]
    public fun test_increment(deployer: &signer, user: &signer) acquires Counter, GlobalStats {
        init_module(deployer);
        create_account_for_test(signer::address_of(user));
        create_counter(user, 0);

        increment(user, 10);

        assert!(get_value(signer::address_of(user)) == 10, 0);
    }

    #[test(deployer = @movesim_demo, user = @0x123)]
    public fun test_decrement(deployer: &signer, user: &signer) acquires Counter, GlobalStats {
        init_module(deployer);
        create_account_for_test(signer::address_of(user));
        create_counter(user, 100);

        decrement(user, 30);

        assert!(get_value(signer::address_of(user)) == 70, 0);
    }

    #[test(deployer = @movesim_demo, user = @0x123)]
    #[expected_failure(abort_code = 65539)] // E_UNDERFLOW
    public fun test_underflow_fails(deployer: &signer, user: &signer) acquires Counter, GlobalStats {
        init_module(deployer);
        create_account_for_test(signer::address_of(user));
        create_counter(user, 10);

        // This should fail - trying to decrement more than available
        decrement(user, 20);
    }
}
