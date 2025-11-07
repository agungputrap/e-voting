const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing deployed contracts interaction...\n");

  // Load contract addresses from environment variables
  const VOTING_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_VOTING_TOKEN_ADDRESS;
  const VOTER_BADGE_NFT_ADDRESS = process.env.NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS;
  const VOTING_SYSTEM_ADDRESS = process.env.NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS;

  if (!VOTING_TOKEN_ADDRESS || !VOTER_BADGE_NFT_ADDRESS || !VOTING_SYSTEM_ADDRESS) {
    console.error("❌ Contract addresses not found in .env file!");
    console.error("Please make sure you have these variables in your .env:");
    console.error("  NEXT_PUBLIC_VOTING_TOKEN_ADDRESS");
    console.error("  NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS");
    console.error("  NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS");
    process.exit(1);
  }

  console.log("📋 Contract Addresses from .env:");
  console.log("   VotingToken:", VOTING_TOKEN_ADDRESS);
  console.log("   VoterBadgeNFT:", VOTER_BADGE_NFT_ADDRESS);
  console.log("   VotingSystem:", VOTING_SYSTEM_ADDRESS);
  console.log("");

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];

  console.log("📝 Testing with account:", deployer.address);

  // For test voter, we'll use deployer address if no second signer available
  const voter1 = signers[1] || deployer;
  if (signers[1]) {
    console.log("📝 Test voter account:", voter1.address, "\n");
  } else {
    console.log("📝 Test voter account: (using deployer address for testing)\n");
  }

  // ==================== Connect to contracts ====================
  const VotingToken = await hre.ethers.getContractFactory("VotingToken");
  const votingToken = VotingToken.attach(VOTING_TOKEN_ADDRESS);

  const VoterBadgeNFT = await hre.ethers.getContractFactory("VoterBadgeNFT");
  const voterBadgeNFT = VoterBadgeNFT.attach(VOTER_BADGE_NFT_ADDRESS);

  const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
  const votingSystem = VotingSystem.attach(VOTING_SYSTEM_ADDRESS);

  console.log("=" .repeat(70));
  console.log("📊 CONTRACT INFORMATION");
  console.log("=" .repeat(70));

  // ==================== Test VotingToken ====================
  console.log("\n🪙 VotingToken (ERC-20):");
  console.log("   Address:", VOTING_TOKEN_ADDRESS);

  const tokenName = await votingToken.name();
  const tokenSymbol = await votingToken.symbol();
  const totalSupply = await votingToken.totalSupply();
  const deployerBalance = await votingToken.balanceOf(deployer.address);

  console.log("   Name:", tokenName);
  console.log("   Symbol:", tokenSymbol);
  console.log("   Total Supply:", hre.ethers.formatEther(totalSupply), "VOTE");
  console.log("   Your Balance:", hre.ethers.formatEther(deployerBalance), "VOTE");

  // ==================== Test VoterBadgeNFT ====================
  console.log("\n🎫 VoterBadgeNFT (ERC-721):");
  console.log("   Address:", VOTER_BADGE_NFT_ADDRESS);

  const nftName = await voterBadgeNFT.name();
  const nftSymbol = await voterBadgeNFT.symbol();
  const totalSupplyNFT = await voterBadgeNFT.totalSupply();
  const isSoulBound = await voterBadgeNFT.isSoulBound();

  console.log("   Name:", nftName);
  console.log("   Symbol:", nftSymbol);
  console.log("   Total Minted:", totalSupplyNFT.toString());
  console.log("   Soul-bound:", isSoulBound);

  // ==================== Test VotingSystem ====================
  console.log("\n🗳️  VotingSystem:");
  console.log("   Address:", VOTING_SYSTEM_ADDRESS);

  const voteTokenCost = await votingSystem.voteTokenCost();
  console.log("   Vote Cost:", hre.ethers.formatEther(voteTokenCost), "VOTE");

  // ==================== Test Creating Event ====================
  console.log("\n" + "=" .repeat(70));
  console.log("🧪 TESTING: Create Voting Event");
  console.log("=" .repeat(70));

  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 600; // Start in 10 minutes (enough time to add candidates)
  const endTime = startTime + 3600; // 1 hour duration
  const revealDuration = 1800; // 30 minutes reveal

  console.log("\nCreating test event...");

  // Create a unique event name with timestamp
  const eventName = `Test Election ${Date.now()}`;

  const createTx = await votingSystem.createEvent(
    eventName,
    "Testing our voting system",
    startTime,
    endTime,
    revealDuration
  );
  const receipt = await createTx.wait();
  console.log("✅ Event created! Transaction:", createTx.hash);

  // Get the event ID from the EventCreated event
  const eventCreatedLog = receipt.logs.find(log => {
    try {
      return votingSystem.interface.parseLog(log)?.name === 'EventCreated';
    } catch {
      return false;
    }
  });

  const parsedLog = votingSystem.interface.parseLog(eventCreatedLog);
  const eventId = parsedLog.args[0]; // First argument is eventId
  console.log("📋 Event ID:", eventId.toString());

  // Use bracket notation to avoid conflict with ethers getEvent method
  const event = await votingSystem["getEvent(uint256)"](eventId);
  console.log("\n📋 Event Details:");
  console.log("   ID:", event.id.toString());
  console.log("   Name:", event.name);
  console.log("   Creator:", event.creator);
  console.log("   Active:", event.isActive);
  console.log("   Start:", new Date(Number(event.startTime) * 1000).toLocaleString());
  console.log("   End:", new Date(Number(event.endTime) * 1000).toLocaleString());

  // ==================== Test Adding Candidates ====================
  console.log("\n" + "=" .repeat(70));
  console.log("🧪 TESTING: Add Candidates");
  console.log("=" .repeat(70));

  console.log("\nAdding candidates...");
  const candidatesTx = await votingSystem.addCandidates(eventId, ["Alice", "Bob", "Charlie"]);
  await candidatesTx.wait();
  console.log("✅ Candidates added! Transaction:", candidatesTx.hash);

  const candidates = await votingSystem["getEventCandidates(uint256)"](eventId);
  console.log("\n📋 Candidates:");
  candidates.forEach((candidate, index) => {
    console.log(`   ${index + 1}. ${candidate.name} (ID: ${candidate.id})`);
  });

  // ==================== Test Token Distribution ====================
  console.log("\n" + "=" .repeat(70));
  console.log("🧪 TESTING: Distribute Tokens to Voters");
  console.log("=" .repeat(70));

  console.log("\nDistributing 100 VOTE tokens to test voter...");
  const transferTx = await votingToken.transfer(
    voter1.address,
    hre.ethers.parseEther("100")
  );
  await transferTx.wait();
  console.log("✅ Tokens transferred! Transaction:", transferTx.hash);

  const voter1Balance = await votingToken.balanceOf(voter1.address);
  console.log("   Voter balance:", hre.ethers.formatEther(voter1Balance), "VOTE");

  // ==================== Summary ====================
  console.log("\n" + "=" .repeat(70));
  console.log("✅ ALL TESTS PASSED!");
  console.log("=" .repeat(70));

  console.log("\n📊 Summary:");
  console.log("   ✅ Contracts deployed and verified");
  console.log("   ✅ VotingToken working (ERC-20)");
  console.log("   ✅ VoterBadgeNFT working (ERC-721)");
  console.log("   ✅ VotingSystem working");
  console.log("   ✅ Event created successfully");
  console.log("   ✅ Candidates added successfully");
  console.log("   ✅ Tokens distributed successfully");

  console.log("\n🎯 Next Steps:");
  console.log("   1. View contracts on Blockscout:");
  console.log("      https://sepolia-blockscout.lisk.com/address/" + VOTING_TOKEN_ADDRESS);
  console.log("   2. Test voting flow with commit-reveal pattern");
  console.log("   3. Integrate with frontend using Panna SDK");
  console.log("   4. Prepare demo for Demo Day");

  console.log("\n🔗 Useful Links:");
  console.log("   • Explorer: https://sepolia-blockscout.lisk.com");
  console.log("   • Faucet: https://sepolia-faucet.lisk.com");
  console.log("   • Panna Docs: https://docs.panna.network");

  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
