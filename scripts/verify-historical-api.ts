import { startServer } from '../src/api/server';

async function verify() {
    // Start server on port 3007 to avoid conflicts
    console.log("Starting server on port 3007...");
    await startServer(3007, "testnet");

    // Wait for startup
    await new Promise(r => setTimeout(r, 2000));

    console.log("Fetching latest ledger info...");
    // We don't have a direct "get ledger info" endpoint in our mock API wrapper, 
    // but we can assume a high version or just try a hardcoded recent one if we knew it.
    // Actually, we can use the SDK from the script context to get the version first.

    // For simplicity, let's just try to simulate with a random large number string 
    // and see if it is accepted (API should parse it to BigInt).
    // If it's too old (pruned) or too new (future), it might fail, but checking that 
    // the API *attempts* to use it is the goal.

    // Better: Use a known 'recent' version from our previous check-historical.ts run: ~7294076767
    const testVersion = "7294075767";

    const payload = {
        sender: "0x1",
        function: "0x1::coin::transfer",
        typeArgs: ["0x1::aptos_coin::AptosCoin"],
        args: ["0x1", "100"],
        ledgerVersion: testVersion,
        network: "testnet"
    };

    console.log(`Simulating at version ${testVersion}...`);
    const res = await fetch("http://localhost:3007/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json() as any;

    if (data.success) {
        console.log("SUCCESS: Simulation passed!");
        if (data.data.vmStatus) {
            console.log("VM Status:", data.data.vmStatus);
        }
    } else {
        console.error("FAILURE:", data);
    }

    process.exit(0);
}

verify().catch(console.error);
