import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";

async function checkHistorical() {
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);

    try {
        console.log("Fetching latest ledger version...");
        const info = await aptos.getLedgerInfo();
        const latestVersion = BigInt(info.ledger_version);
        console.log("Latest Version:", latestVersion);

        const pastVersion = latestVersion - 1000n;
        console.log("Testing simulation at version:", pastVersion);

        // unexpected error if too old, but 1000 versions is usually fine if not pruned
        // Create a dummy transaction
        const account = Account.generate();

        // build transaction
        const transaction = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: "0x1::coin::transfer",
                typeArguments: ["0x1::aptos_coin::AptosCoin"],
                functionArguments: [account.accountAddress, 100],
            },
        });

        // Try to simulate with ledger_version option if it exists
        // We are guessing the API/SDK shape here, or hoping standard options support it
        // The REST API supports ?ledger_version=...
        console.log("Simulating...");

        // @ts-ignore - 'options' might not be fully typed in our current context check
        const response = await aptos.transaction.simulate.simple({
            signerPublicKey: account.publicKey,
            transaction,
            options: {
                ledgerVersion: pastVersion,
            } as any,
        });

        console.log("Simulation successful!");
        console.log("VM Status:", response[0].vm_status);

    } catch (e) {
        console.error("Simulation failed:", e);
    }
}

checkHistorical();
