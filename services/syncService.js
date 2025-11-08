/**
 * Database Sync Service
 *
 * Service untuk sync data antara blockchain dan database
 * Useful untuk initial sync atau re-sync after downtime
 */

const { getBlockchainService } = require("../lib/blockchain");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const blockchain = getBlockchainService();

class SyncService {
  /**
   * Sync event dari database ke blockchain
   * Creates blockchain event dan updates database dengan blockchain event ID
   *
   * @param {number} dbEventId - Database event ID
   * @returns {Promise<object>} Sync result
   */
  async syncEventToBlockchain(dbEventId) {
    console.log(`🔄 Syncing event ${dbEventId} to blockchain...`);

    // Get event dari database
    const dbEvent = await prisma.event.findUnique({
      where: { id: dbEventId },
      include: { candidates: true }
    });

    if (!dbEvent) {
      throw new Error(`Event ${dbEventId} not found in database`);
    }

    // Check if already synced
    if (dbEvent.blockAddress) {
      console.log(`  ℹ️  Event already synced to blockchain (Event #${dbEvent.blockAddress})`);
      return {
        success: true,
        alreadySynced: true,
        blockchainEventId: dbEvent.blockAddress
      };
    }

    // Create event on blockchain
    const startTime = Math.floor(dbEvent.startTime.getTime() / 1000);
    const endTime = Math.floor(dbEvent.endTime.getTime() / 1000);
    const duration = endTime - startTime;
    const revealPeriod = 3600; // 1 hour reveal period (can be customized)

    const result = await blockchain.createBlockchainEvent({
      name: dbEvent.name,
      description: dbEvent.description || "",
      startTime,
      duration,
      revealPeriod
    });

    console.log(`  ✅ Created blockchain event #${result.blockchainEventId}`);
    console.log(`  📝 Transaction: ${result.transactionHash}`);

    // Update database dengan blockchain event ID
    await prisma.event.update({
      where: { id: dbEventId },
      data: { blockAddress: result.blockchainEventId.toString() }
    });

    console.log(`  💾 Updated database with blockchain event ID`);

    // Add candidates to blockchain
    if (dbEvent.candidates.length > 0) {
      const candidateNames = dbEvent.candidates.map(c => c.name);

      console.log(`  📋 Adding ${candidateNames.length} candidates to blockchain...`);

      const candidateResult = await blockchain.addCandidates(
        result.blockchainEventId,
        candidateNames
      );

      console.log(`  ✅ Candidates added. Transaction: ${candidateResult.transactionHash}`);
    }

    return {
      success: true,
      blockchainEventId: result.blockchainEventId,
      transactionHash: result.transactionHash,
      candidatesAdded: dbEvent.candidates.length
    };
  }

  /**
   * Sync candidates dari blockchain ke database
   * Updates vote counts in database based on blockchain data
   *
   * @param {number} dbEventId - Database event ID
   * @returns {Promise<object>} Sync result
   */
  async syncCandidateVotesFromBlockchain(dbEventId) {
    console.log(`🔄 Syncing candidate votes for event ${dbEventId}...`);

    const dbEvent = await prisma.event.findUnique({
      where: { id: dbEventId },
      include: { candidates: true }
    });

    if (!dbEvent) {
      throw new Error(`Event ${dbEventId} not found in database`);
    }

    if (!dbEvent.blockAddress) {
      throw new Error(`Event ${dbEventId} not synced to blockchain yet`);
    }

    // Get candidates dari blockchain
    const blockchainCandidates = await blockchain.getEventCandidates(
      Number(dbEvent.blockAddress)
    );

    console.log(`  📊 Found ${blockchainCandidates.length} candidates on blockchain`);

    // Count votes in database for comparison
    const dbVoteCounts = {};
    for (const candidate of dbEvent.candidates) {
      const count = await prisma.vote.count({
        where: {
          eventId: dbEventId,
          candidateId: candidate.id
        }
      });
      dbVoteCounts[candidate.name] = count;
    }

    console.log("\n  Vote Counts:");
    console.log("  ─────────────────────────────────────");
    console.log("  Candidate         | Blockchain | Database");
    console.log("  ─────────────────────────────────────");

    for (const bcCandidate of blockchainCandidates) {
      const dbCount = dbVoteCounts[bcCandidate.name] || 0;
      console.log(`  ${bcCandidate.name.padEnd(16)} | ${String(bcCandidate.voteCount).padEnd(10)} | ${dbCount}`);
    }

    console.log("  ─────────────────────────────────────\n");

    return {
      success: true,
      candidates: blockchainCandidates.map(bc => ({
        name: bc.name,
        blockchainVotes: bc.voteCount,
        databaseVotes: dbVoteCounts[bc.name] || 0,
        synced: bc.voteCount === (dbVoteCounts[bc.name] || 0)
      }))
    };
  }

  /**
   * Sync all pending events to blockchain
   * Finds all events without blockAddress dan sync mereka
   *
   * @returns {Promise<object>} Sync result
   */
  async syncAllPendingEvents() {
    console.log("🔄 Syncing all pending events to blockchain...\n");

    const pendingEvents = await prisma.event.findMany({
      where: { blockAddress: null },
      include: { candidates: true }
    });

    console.log(`  📋 Found ${pendingEvents.length} pending events\n`);

    const results = [];

    for (const event of pendingEvents) {
      try {
        console.log(`\n📌 Event ${event.id}: ${event.name}`);
        console.log("─".repeat(50));

        const result = await this.syncEventToBlockchain(event.id);
        results.push({
          dbEventId: event.id,
          ...result
        });

        // Wait 2 seconds between syncs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`  ❌ Failed to sync event ${event.id}:`, error.message);
        results.push({
          dbEventId: event.id,
          success: false,
          error: error.message
        });
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Sync Summary:");
    console.log("=".repeat(50));
    console.log(`Total events: ${results.length}`);
    console.log(`Successful: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);
    console.log("=".repeat(50) + "\n");

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Distribute tokens to all verified voters
   * Gets voters dari database dan mint tokens untuk mereka
   *
   * @param {string} tokensPerVoter - Amount of tokens per voter (e.g., "100")
   * @returns {Promise<object>} Distribution result
   */
  async distributeTokensToVoters(tokensPerVoter = "100") {
    console.log(`🪙 Distributing ${tokensPerVoter} tokens to all voters...\n`);

    // Get all voters
    const voters = await prisma.voter.findMany();

    console.log(`  👥 Found ${voters.length} voters in database`);

    if (voters.length === 0) {
      console.log("  ⚠️  No voters found");
      return {
        success: true,
        votersCount: 0,
        tokensDistributed: "0"
      };
    }

    // Check who already has tokens
    const votersWithoutTokens = [];

    for (const voter of voters) {
      try {
        const balance = await blockchain.getTokenBalance(voter.walletId);
        if (parseFloat(balance) === 0) {
          votersWithoutTokens.push(voter);
        } else {
          console.log(`  ✓ ${voter.name} (${voter.walletId.substring(0, 10)}...) already has ${balance} tokens`);
        }
      } catch (error) {
        console.error(`  ❌ Error checking balance for ${voter.walletId}:`, error.message);
      }
    }

    console.log(`\n  💰 ${votersWithoutTokens.length} voters need tokens`);

    if (votersWithoutTokens.length === 0) {
      console.log("  ℹ️  All voters already have tokens");
      return {
        success: true,
        votersCount: 0,
        tokensDistributed: "0",
        message: "All voters already have tokens"
      };
    }

    // Batch mint tokens
    const addresses = votersWithoutTokens.map(v => v.walletId);
    const amounts = votersWithoutTokens.map(() => tokensPerVoter);

    console.log(`\n  📤 Sending batch mint transaction...`);

    const result = await blockchain.batchMintTokens(addresses, amounts);

    console.log(`  ✅ Tokens distributed!`);
    console.log(`  📝 Transaction: ${result.transactionHash}`);
    console.log(`  📦 Block: ${result.blockNumber}`);

    return {
      success: true,
      votersCount: votersWithoutTokens.length,
      tokensDistributed: tokensPerVoter,
      transactionHash: result.transactionHash,
      voters: votersWithoutTokens.map(v => ({
        id: v.id,
        name: v.name,
        walletId: v.walletId,
        tokensReceived: tokensPerVoter
      }))
    };
  }

  /**
   * Check sync status for all events
   *
   * @returns {Promise<object>} Sync status
   */
  async checkSyncStatus() {
    console.log("📊 Checking sync status...\n");

    const totalEvents = await prisma.event.count();
    const syncedEvents = await prisma.event.count({
      where: { blockAddress: { not: null } }
    });
    const pendingEvents = totalEvents - syncedEvents;

    const totalVoters = await prisma.voter.count();
    const totalVotes = await prisma.vote.count();

    console.log("Events:");
    console.log(`  Total: ${totalEvents}`);
    console.log(`  Synced to blockchain: ${syncedEvents}`);
    console.log(`  Pending sync: ${pendingEvents}\n`);

    console.log("Voters & Votes:");
    console.log(`  Total voters: ${totalVoters}`);
    console.log(`  Total votes recorded: ${totalVotes}\n`);

    return {
      events: {
        total: totalEvents,
        synced: syncedEvents,
        pending: pendingEvents
      },
      voters: totalVoters,
      votes: totalVotes
    };
  }
}

// Export singleton
let syncService = null;

function getSyncService() {
  if (!syncService) {
    syncService = new SyncService();
  }
  return syncService;
}

// CLI interface
if (require.main === module) {
  const service = getSyncService();
  const command = process.argv[2];

  async function runCommand() {
    try {
      switch (command) {
        case 'status':
          await service.checkSyncStatus();
          break;

        case 'sync-all':
          await service.syncAllPendingEvents();
          break;

        case 'sync-event': {
          const eventId = parseInt(process.argv[3]);
          if (!eventId) {
            console.error("❌ Please provide event ID: node syncService.js sync-event <eventId>");
            process.exit(1);
          }
          await service.syncEventToBlockchain(eventId);
          break;
        }

        case 'sync-votes': {
          const eventId = parseInt(process.argv[3]);
          if (!eventId) {
            console.error("❌ Please provide event ID: node syncService.js sync-votes <eventId>");
            process.exit(1);
          }
          await service.syncCandidateVotesFromBlockchain(eventId);
          break;
        }

        case 'distribute-tokens': {
          const amount = process.argv[3] || "100";
          await service.distributeTokensToVoters(amount);
          break;
        }

        default:
          console.log("📚 Sync Service Commands:\n");
          console.log("  node services/syncService.js status");
          console.log("  node services/syncService.js sync-all");
          console.log("  node services/syncService.js sync-event <eventId>");
          console.log("  node services/syncService.js sync-votes <eventId>");
          console.log("  node services/syncService.js distribute-tokens [amount]");
          console.log("");
      }

      await prisma.$disconnect();
      process.exit(0);

    } catch (error) {
      console.error("\n❌ Error:", error.message);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  runCommand();
}

module.exports = {
  SyncService,
  getSyncService
};
