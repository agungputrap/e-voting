const hre = require("hardhat");
require("dotenv").config();

/**
 * Script untuk checking balances
 * - ETH balance (untuk gas)
 * - VotingToken balance
 * - VoterBadgeNFT balance
 *
 * Usage: node scripts/check-balance.js
 */

async function main() {
  console.log("💰 Checking Balances on Lisk Sepolia...\n");

  // Load contract addresses
  const VOTING_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_VOTING_TOKEN_ADDRESS;
  const VOTER_BADGE_NFT_ADDRESS = process.env.NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS;
  const VOTING_SYSTEM_ADDRESS = process.env.NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS;

  const [signer] = await hre.ethers.getSigners();
  const address = signer.address;

  console.log("📝 Checking address:", address);
  console.log("═══════════════════════════════════════════════\n");

  // ============================================
  // 1. ETH BALANCE (untuk gas fees)
  // ============================================
  console.log("🔷 ETH Balance (for gas):");
  const ethBalance = await hre.ethers.provider.getBalance(address);
  const balanceInEth = hre.ethers.formatEther(ethBalance);
  console.log(`   ${balanceInEth} ETH`);

  if (parseFloat(balanceInEth) < 0.01) {
    console.log("   ⚠️  WARNING: Balance is low!");
    console.log("   Get testnet ETH from: https://sepolia-faucet.lisk.com");
  } else {
    console.log("   ✅ Sufficient for transactions");
  }
  console.log("");

  // ============================================
  // 2. VOTING TOKEN BALANCE
  // ============================================
  if (VOTING_TOKEN_ADDRESS) {
    console.log("🪙 VotingToken Balance:");
    try {
      const VotingToken = await hre.ethers.getContractFactory("VotingToken");
      const votingToken = VotingToken.attach(VOTING_TOKEN_ADDRESS);

      const tokenBalance = await votingToken.balanceOf(address);
      const tokenBalanceFormatted = hre.ethers.formatEther(tokenBalance);
      console.log(`   ${tokenBalanceFormatted} tokens`);

      // Check total supply
      const totalSupply = await votingToken.totalSupply();
      const totalSupplyFormatted = hre.ethers.formatEther(totalSupply);
      console.log(`   Total Supply: ${totalSupplyFormatted} tokens`);

      // Check if owner
      const owner = await votingToken.owner();
      if (owner.toLowerCase() === address.toLowerCase()) {
        console.log("   ✅ You are the owner (can mint)");
      } else {
        console.log(`   ℹ️  Owner: ${owner}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log("");
  }

  // ============================================
  // 3. VOTER BADGE NFT BALANCE
  // ============================================
  if (VOTER_BADGE_NFT_ADDRESS) {
    console.log("🎨 VoterBadgeNFT Balance:");
    try {
      const VoterBadgeNFT = await hre.ethers.getContractFactory("VoterBadgeNFT");
      const voterBadgeNFT = VoterBadgeNFT.attach(VOTER_BADGE_NFT_ADDRESS);

      const nftBalance = await voterBadgeNFT.balanceOf(address);
      console.log(`   ${nftBalance.toString()} NFT(s)`);

      // Check if owner
      const owner = await voterBadgeNFT.owner();
      if (owner.toLowerCase() === address.toLowerCase()) {
        console.log("   ✅ You are the owner");
      }

      // Check if authorized minter
      const isAuthorized = await voterBadgeNFT.authorizedMinters(address);
      if (isAuthorized) {
        console.log("   ✅ You are authorized to mint");
      }

      // List owned tokens
      if (nftBalance > 0) {
        console.log("\n   Your NFTs:");
        // Note: You'd need to track token IDs separately or iterate
        // For now, just show that you have NFTs
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log("");
  }

  // ============================================
  // 4. NETWORK INFO
  // ============================================
  console.log("═══════════════════════════════════════════════");
  console.log("🔗 Network Information:");
  console.log(`   Network: ${hre.network.name}`);
  console.log(`   Chain ID: ${(await hre.ethers.provider.getNetwork()).chainId}`);
  console.log("");

  // ============================================
  // 5. CHECK SPECIFIC ADDRESS (OPTIONAL)
  // ============================================
  // Uncomment dan ganti address untuk check address lain
  /*
  const CHECK_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
  console.log(`\n📊 Checking specific address: ${CHECK_ADDRESS}`);
  console.log("═══════════════════════════════════════════════");

  if (VOTING_TOKEN_ADDRESS) {
    const VotingToken = await hre.ethers.getContractFactory("VotingToken");
    const votingToken = VotingToken.attach(VOTING_TOKEN_ADDRESS);
    const balance = await votingToken.balanceOf(CHECK_ADDRESS);
    console.log(`🪙 VotingToken: ${hre.ethers.formatEther(balance)} tokens`);
  }

  if (VOTER_BADGE_NFT_ADDRESS) {
    const VoterBadgeNFT = await hre.ethers.getContractFactory("VoterBadgeNFT");
    const voterBadgeNFT = VoterBadgeNFT.attach(VOTER_BADGE_NFT_ADDRESS);
    const balance = await voterBadgeNFT.balanceOf(CHECK_ADDRESS);
    console.log(`🎨 VoterBadgeNFT: ${balance.toString()} NFT(s)`);
  }
  */

  console.log("✅ Balance check completed!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
