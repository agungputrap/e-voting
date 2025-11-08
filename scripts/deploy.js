const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to Lisk Sepolia...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // ==================== STEP 1: Deploy VotingToken ====================
  console.log("📦 Deploying VotingToken (ERC-20)...");

  const initialSupply = hre.ethers.parseEther("1000000"); // 1 million tokens

  const VotingToken = await hre.ethers.getContractFactory("VotingToken");
  const votingToken = await VotingToken.deploy(initialSupply);
  await votingToken.waitForDeployment();

  const votingTokenAddress = await votingToken.getAddress();
  console.log("✅ VotingToken deployed to:", votingTokenAddress);
  console.log("   Initial Supply:", hre.ethers.formatEther(initialSupply), "VOTE tokens\n");

  // ==================== STEP 2: Deploy VoterBadgeNFT ====================
  console.log("📦 Deploying VoterBadgeNFT (ERC-721)...");

  const isSoulBound = false; // Set to true if you want NFTs to be non-transferable

  const VoterBadgeNFT = await hre.ethers.getContractFactory("VoterBadgeNFT");
  const voterBadgeNFT = await VoterBadgeNFT.deploy(isSoulBound);
  await voterBadgeNFT.waitForDeployment();

  const voterBadgeNFTAddress = await voterBadgeNFT.getAddress();
  console.log("✅ VoterBadgeNFT deployed to:", voterBadgeNFTAddress);
  console.log("   Soul-bound:", isSoulBound, "\n");

  // ==================== STEP 3: Deploy VotingSystem ====================
  console.log("📦 Deploying VotingSystem...");

  const voteTokenCost = hre.ethers.parseEther("1"); // 1 token per vote

  const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
  const votingSystem = await VotingSystem.deploy(
    votingTokenAddress,
    voterBadgeNFTAddress,
    voteTokenCost
  );
  await votingSystem.waitForDeployment();

  const votingSystemAddress = await votingSystem.getAddress();
  console.log("✅ VotingSystem deployed to:", votingSystemAddress);
  console.log("   Vote cost:", hre.ethers.formatEther(voteTokenCost), "VOTE tokens\n");

  // ==================== STEP 4: Setup Permissions ====================
  console.log("🔐 Setting up permissions...");

  // Authorize VotingSystem to mint NFT badges
  const authTx = await voterBadgeNFT.authorizeMinter(votingSystemAddress);
  await authTx.wait();
  console.log("✅ VotingSystem authorized to mint NFT badges\n");

  // ==================== DEPLOYMENT SUMMARY ====================
  console.log("=" .repeat(70));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=" .repeat(70));
  console.log("\n📋 Contract Addresses:");
  console.log("   VotingToken (ERC-20)    :", votingTokenAddress);
  console.log("   VoterBadgeNFT (ERC-721) :", voterBadgeNFTAddress);
  console.log("   VotingSystem            :", votingSystemAddress);

  console.log("\n🔍 Verify on Blockscout:");
  console.log("   https://sepolia-blockscout.lisk.com/address/" + votingTokenAddress);
  console.log("   https://sepolia-blockscout.lisk.com/address/" + voterBadgeNFTAddress);
  console.log("   https://sepolia-blockscout.lisk.com/address/" + votingSystemAddress);

  console.log("\n📝 Update your .env file with these addresses:");
  console.log(`   NEXT_PUBLIC_VOTING_TOKEN_ADDRESS="${votingTokenAddress}"`);
  console.log(`   NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS="${voterBadgeNFTAddress}"`);
  console.log(`   NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS="${votingSystemAddress}"`);

  console.log("\n💡 Next Steps:");
  console.log("   1. Copy the addresses above to your .env file");
  console.log("   2. Verify contracts on Blockscout:");
  console.log("      npx hardhat verify --network liskSepolia " + votingTokenAddress + ' "' + initialSupply.toString() + '"');
  console.log("      npx hardhat verify --network liskSepolia " + voterBadgeNFTAddress + " " + isSoulBound);
  console.log("      npx hardhat verify --network liskSepolia " + votingSystemAddress + " " + votingTokenAddress + " " + voterBadgeNFTAddress + ' "' + voteTokenCost.toString() + '"');
  console.log("   3. Distribute VOTE tokens to voters");
  console.log("   4. Create voting events using VotingSystem contract");

  console.log("\n" + "=" .repeat(70) + "\n");

  // Save deployment info to file
  const fs = require("fs");
  const deploymentInfo = {
    network: "lisk-sepolia",
    chainId: 4202,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      VotingToken: {
        address: votingTokenAddress,
        initialSupply: initialSupply.toString(),
      },
      VoterBadgeNFT: {
        address: voterBadgeNFTAddress,
        isSoulBound: isSoulBound,
      },
      VotingSystem: {
        address: votingSystemAddress,
        voteTokenCost: voteTokenCost.toString(),
      },
    },
  };

  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("💾 Deployment info saved to deployment-info.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
