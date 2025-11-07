const hre = require("hardhat");

async function main() {
  console.log("💰 Checking account balance on Lisk Sepolia...\n");

  const [signer] = await hre.ethers.getSigners();
  const address = signer.address;

  console.log("📝 Account address:", address);

  const balance = await hre.ethers.provider.getBalance(address);
  const balanceInEth = hre.ethers.formatEther(balance);

  console.log("💵 Balance:", balanceInEth, "ETH");

  if (parseFloat(balanceInEth) < 0.01) {
    console.log("\n⚠️  WARNING: Balance is low!");
    console.log("   You need Lisk Sepolia ETH to deploy contracts.");
    console.log("   Get testnet ETH from: https://sepolia-faucet.lisk.com");
  } else {
    console.log("\n✅ Balance is sufficient for deployment!");
  }

  console.log("\n🔗 Network:", hre.network.name);
  console.log("🔗 Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
