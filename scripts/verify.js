const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Starting contract verification on Blockscout...\n");

  // Read deployment info
  if (!fs.existsSync("deployment-info.json")) {
    console.error("❌ deployment-info.json not found. Please deploy contracts first.");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
  const contracts = deploymentInfo.contracts;

  console.log("📋 Contracts to verify:");
  console.log("   VotingToken    :", contracts.VotingToken.address);
  console.log("   VoterBadgeNFT  :", contracts.VoterBadgeNFT.address);
  console.log("   VotingSystem   :", contracts.VotingSystem.address);
  console.log("");

  // ==================== Verify VotingToken ====================
  try {
    console.log("📦 Verifying VotingToken...");
    await hre.run("verify:verify", {
      address: contracts.VotingToken.address,
      constructorArguments: [contracts.VotingToken.initialSupply],
      network: "liskSepolia",
    });
    console.log("✅ VotingToken verified!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ VotingToken already verified\n");
    } else {
      console.error("❌ VotingToken verification failed:", error.message, "\n");
    }
  }

  // ==================== Verify VoterBadgeNFT ====================
  try {
    console.log("📦 Verifying VoterBadgeNFT...");
    await hre.run("verify:verify", {
      address: contracts.VoterBadgeNFT.address,
      constructorArguments: [contracts.VoterBadgeNFT.isSoulBound],
      network: "liskSepolia",
    });
    console.log("✅ VoterBadgeNFT verified!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ VoterBadgeNFT already verified\n");
    } else {
      console.error("❌ VoterBadgeNFT verification failed:", error.message, "\n");
    }
  }

  // ==================== Verify VotingSystem ====================
  try {
    console.log("📦 Verifying VotingSystem...");
    await hre.run("verify:verify", {
      address: contracts.VotingSystem.address,
      constructorArguments: [
        contracts.VotingToken.address,
        contracts.VoterBadgeNFT.address,
        contracts.VotingSystem.voteTokenCost,
      ],
      network: "liskSepolia",
    });
    console.log("✅ VotingSystem verified!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ VotingSystem already verified\n");
    } else {
      console.error("❌ VotingSystem verification failed:", error.message, "\n");
    }
  }

  console.log("=" .repeat(70));
  console.log("🎉 Verification complete!");
  console.log("=" .repeat(70));
  console.log("\n🔍 View verified contracts on Blockscout:");
  console.log("   https://sepolia-blockscout.lisk.com/address/" + contracts.VotingToken.address);
  console.log("   https://sepolia-blockscout.lisk.com/address/" + contracts.VoterBadgeNFT.address);
  console.log("   https://sepolia-blockscout.lisk.com/address/" + contracts.VotingSystem.address);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });
