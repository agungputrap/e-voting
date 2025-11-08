const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Script untuk melakukan minting VotingToken
 *
 * Usage:
 * 1. Single mint: node scripts/mint-tokens.js
 * 2. Batch mint: Edit RECIPIENTS array di bawah
 */

async function main() {
  console.log("🪙 VotingToken Minting Script\n");

  // Load contract addresses dari .env
  const VOTING_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_VOTING_TOKEN_ADDRESS;

  if (!VOTING_TOKEN_ADDRESS) {
    throw new Error("❌ NEXT_PUBLIC_VOTING_TOKEN_ADDRESS not found in .env");
  }

  // Get signer (account yang akan execute)
  const [deployer] = await ethers.getSigners();
  console.log("🔑 Using account:", deployer.address);

  // Get contract instance
  const VotingToken = await ethers.getContractFactory("VotingToken");
  const votingToken = VotingToken.attach(VOTING_TOKEN_ADDRESS);

  console.log("📄 VotingToken contract:", VOTING_TOKEN_ADDRESS);
  console.log("");

  // Check deployer is owner
  const owner = await votingToken.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`❌ You are not the owner! Owner is: ${owner}`);
  }
  console.log("✅ Ownership verified\n");

  // ============================================
  // OPTION 1: SINGLE MINT
  // ============================================
  console.log("📋 OPTION 1: Single Mint");
  console.log("─────────────────────────");

  // Edit recipient address dan amount di sini
  const SINGLE_RECIPIENT = "0xf9fd2A7f1c356b5B9987C2CDd86219B526c29998"; // Address untuk demo
  const SINGLE_AMOUNT = ethers.parseEther("100"); // 100 tokens

  console.log(`Recipient: ${SINGLE_RECIPIENT}`);
  console.log(`Amount: ${ethers.formatEther(SINGLE_AMOUNT)} tokens\n`);

  // Execute single mint
  const tx1 = await votingToken.mint(SINGLE_RECIPIENT, SINGLE_AMOUNT);
  console.log("⏳ Transaction sent:", tx1.hash);
  await tx1.wait();
  console.log("✅ Single mint successful!\n");

  // ============================================
  // OPTION 2: BATCH MINT (LEBIH EFISIEN)
  // ============================================
  console.log("📋 OPTION 2: Batch Mint");
  console.log("─────────────────────────");

  // Edit array di bawah dengan addresses voters kamu
  const RECIPIENTS = [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",  // Voter 1
    "0x123456789abcdef123456789abcdef123456789",  // Voter 2
    "0x987654321fedcba987654321fedcba987654321",  // Voter 3
    // Tambah lebih banyak addresses di sini...
  ];

  // Setiap voter dapat 100 tokens
  const AMOUNTS = RECIPIENTS.map(() => ethers.parseEther("100"));

  console.log(`📊 Recipients: ${RECIPIENTS.length} addresses`);
  console.log(`💰 Amount per recipient: ${ethers.formatEther(AMOUNTS[0])} tokens`);
  console.log(`📈 Total tokens to mint: ${ethers.formatEther(AMOUNTS.reduce((a, b) => a + b, 0n))} tokens\n`);

  // Tampilkan list recipients
  console.log("Recipients list:");
  RECIPIENTS.forEach((recipient, index) => {
    console.log(`  ${index + 1}. ${recipient} → ${ethers.formatEther(AMOUNTS[index])} tokens`);
  });
  console.log("");

  // Uncomment baris di bawah untuk execute batch mint
  // const tx2 = await votingToken.batchMint(RECIPIENTS, AMOUNTS);
  // console.log("⏳ Transaction sent:", tx2.hash);
  // await tx2.wait();
  // console.log("✅ Batch mint successful!\n");

  // ============================================
  // OPTION 3: CUSTOM AMOUNTS (BERBEDA-BEDA)
  // ============================================
  console.log("📋 OPTION 3: Batch Mint with Custom Amounts");
  console.log("───────────────────────────────────────────");

  const CUSTOM_RECIPIENTS = [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",  // Voter 1 → 50 tokens
    "0x123456789abcdef123456789abcdef123456789",  // Voter 2 → 100 tokens
    "0x987654321fedcba987654321fedcba987654321",  // Voter 3 → 150 tokens
  ];

  const CUSTOM_AMOUNTS = [
    ethers.parseEther("50"),   // 50 tokens untuk voter 1
    ethers.parseEther("100"),  // 100 tokens untuk voter 2
    ethers.parseEther("150"),  // 150 tokens untuk voter 3
  ];

  console.log("Recipients with custom amounts:");
  CUSTOM_RECIPIENTS.forEach((recipient, index) => {
    console.log(`  ${index + 1}. ${recipient} → ${ethers.formatEther(CUSTOM_AMOUNTS[index])} tokens`);
  });
  console.log("");

  // Uncomment baris di bawah untuk execute custom batch mint
  // const tx3 = await votingToken.batchMint(CUSTOM_RECIPIENTS, CUSTOM_AMOUNTS);
  // console.log("⏳ Transaction sent:", tx3.hash);
  // await tx3.wait();
  // console.log("✅ Custom batch mint successful!\n");

  // ============================================
  // CHECK BALANCES AFTER MINTING
  // ============================================
  console.log("💼 Checking Balances");
  console.log("────────────────────");

  // Check balance deployer
  const deployerBalance = await votingToken.balanceOf(deployer.address);
  console.log(`Deployer: ${ethers.formatEther(deployerBalance)} tokens`);

  // Check balance recipients (uncomment setelah minting)
  // for (const recipient of RECIPIENTS) {
  //   const balance = await votingToken.balanceOf(recipient);
  //   console.log(`${recipient}: ${ethers.formatEther(balance)} tokens`);
  // }

  console.log("\n✅ Script completed!");
  console.log("\n📝 NOTE:");
  console.log("- Uncomment baris mint yang ingin kamu execute");
  console.log("- Edit RECIPIENTS dan AMOUNTS sesuai kebutuhan");
  console.log("- Pastikan kamu adalah owner contract");
  console.log("- Gas fee akan otomatis terdeduct dari wallet kamu");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
