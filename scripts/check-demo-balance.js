const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const DEMO_ADDRESS = "0xf9fd2A7f1c356b5B9987C2CDd86219B526c29998";
  const VOTING_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_VOTING_TOKEN_ADDRESS;

  console.log("💰 Checking Demo Address Balance...\n");
  console.log("📝 Address:", DEMO_ADDRESS);
  console.log("");

  const VotingToken = await ethers.getContractFactory("VotingToken");
  const votingToken = VotingToken.attach(VOTING_TOKEN_ADDRESS);

  const balance = await votingToken.balanceOf(DEMO_ADDRESS);
  const balanceFormatted = ethers.formatEther(balance);

  console.log("🪙 VotingToken Balance:", balanceFormatted, "tokens");
  console.log("");

  if (parseFloat(balanceFormatted) > 0) {
    console.log("✅ Address has tokens and can vote!");
  } else {
    console.log("❌ Address has NO tokens");
  }

  console.log("\n🔗 View on Blockscout:");
  console.log(`https://sepolia-blockscout.lisk.com/address/${DEMO_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
