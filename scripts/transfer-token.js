const hre = require("hardhat");

async function main() {
    // Address tujuan transfer
    const recipientAddress = "0xf9fd2A7f1c356b5B9987C2CDd86219B526c29998";

    // Jumlah token yang akan ditransfer (dalam satuan token, bukan wei)
    // Sesuaikan dengan jumlah yang Anda inginkan
    const amountInTokens = "100"; // Contoh: 100 token

    // Convert ke wei (karena token menggunakan 18 decimals)
    const amount = hre.ethers.parseEther(amountInTokens);

    console.log("\n🔄 Starting Token Transfer...\n");
    console.log("═══════════════════════════════════════════════");

    // Get deployed VotingToken address
    // Sesuaikan dengan address contract yang sudah di-deploy
    const VOTING_TOKEN_ADDRESS = process.env.VOTING_TOKEN_ADDRESS || "YOUR_DEPLOYED_TOKEN_ADDRESS";

    if (VOTING_TOKEN_ADDRESS === "YOUR_DEPLOYED_TOKEN_ADDRESS") {
        console.error("❌ Error: Please set VOTING_TOKEN_ADDRESS in .env file or provide it in the script");
        console.log("\nYou can set it by:");
        console.log("1. Add to .env: VOTING_TOKEN_ADDRESS=0x...");
        console.log("2. Or edit this script and replace YOUR_DEPLOYED_TOKEN_ADDRESS with your token address");
        process.exit(1);
    }

    // Get signer (pengirim token)
    const [sender] = await hre.ethers.getSigners();
    console.log(`📤 Sender: ${sender.address}`);

    // Connect to VotingToken contract
    const VotingToken = await hre.ethers.getContractAt("VotingToken", VOTING_TOKEN_ADDRESS);

    // Check balance sebelum transfer
    const senderBalanceBefore = await VotingToken.balanceOf(sender.address);
    const recipientBalanceBefore = await VotingToken.balanceOf(recipientAddress);

    console.log(`\n📊 Balance Before Transfer:`);
    console.log(`   Sender: ${hre.ethers.formatEther(senderBalanceBefore)} VOTE`);
    console.log(`   Recipient: ${hre.ethers.formatEther(recipientBalanceBefore)} VOTE`);

    // Check apakah balance cukup
    if (senderBalanceBefore < amount) {
        console.error(`\n❌ Error: Insufficient balance!`);
        console.log(`   You have: ${hre.ethers.formatEther(senderBalanceBefore)} VOTE`);
        console.log(`   You need: ${amountInTokens} VOTE`);
        process.exit(1);
    }

    console.log(`\n📤 Transferring ${amountInTokens} VOTE tokens...`);
    console.log(`   To: ${recipientAddress}`);

    // Lakukan transfer
    const tx = await VotingToken.transfer(recipientAddress, amount);
    console.log(`\n⏳ Transaction submitted: ${tx.hash}`);
    console.log(`   Waiting for confirmation...`);

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Check balance setelah transfer
    const senderBalanceAfter = await VotingToken.balanceOf(sender.address);
    const recipientBalanceAfter = await VotingToken.balanceOf(recipientAddress);

    console.log(`\n📊 Balance After Transfer:`);
    console.log(`   Sender: ${hre.ethers.formatEther(senderBalanceAfter)} VOTE`);
    console.log(`   Recipient: ${hre.ethers.formatEther(recipientBalanceAfter)} VOTE`);

    console.log("\n═══════════════════════════════════════════════");
    console.log("✅ Transfer Completed Successfully!");
    console.log(`\n💡 Summary:`);
    console.log(`   Amount Sent: ${amountInTokens} VOTE`);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error);
        process.exit(1);
    });
