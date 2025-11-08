/**
 * Blockchain Event Listener Service
 *
 * Service untuk listen blockchain events dan sync ke database
 * Runs sebagai background service
 */

const { getBlockchainService } = require("../lib/blockchain");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const blockchain = getBlockchainService();

class EventListenerService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start listening to blockchain events
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️  Event listener already running");
      return;
    }

    console.log("🎧 Starting blockchain event listener...\n");
    this.isRunning = true;

    // Listen to VoteCommitted events
    blockchain.onVoteCommitted(async (eventId, voter, event) => {
      try {
        console.log(`📝 VoteCommitted: Event #${eventId}, Voter: ${voter}`);

        // You could track commits in database if needed
        // For now, we just log it

      } catch (error) {
        console.error("❌ Error handling VoteCommitted:", error);
      }
    });

    // Listen to VoteRevealed events (MOST IMPORTANT)
    blockchain.onVoteRevealed(async (eventId, voter, candidateId, event) => {
      try {
        console.log(`✅ VoteRevealed: Event #${eventId}, Voter: ${voter}, Candidate: ${candidateId}`);

        // Get or create voter in database
        let dbVoter = await prisma.voter.findUnique({
          where: { walletId: voter.toLowerCase() }
        });

        if (!dbVoter) {
          dbVoter = await prisma.voter.create({
            data: {
              name: `Voter ${voter.substring(0, 8)}...`,
              walletId: voter.toLowerCase()
            }
          });
          console.log(`  👤 Created new voter in DB: ${dbVoter.id}`);
        }

        // Find database event by blockchain event ID
        const dbEvent = await prisma.event.findFirst({
          where: { blockAddress: eventId.toString() }
        });

        if (!dbEvent) {
          console.log(`  ⚠️  Event #${eventId} not found in database, skipping...`);
          return;
        }

        // Find database candidate
        const dbCandidate = await prisma.candidate.findFirst({
          where: {
            eventId: dbEvent.id,
            // Assuming candidate order matches blockchain
            // You might need better matching logic
          },
          skip: Number(candidateId),
          take: 1
        });

        if (!dbCandidate) {
          console.log(`  ⚠️  Candidate #${candidateId} not found in database, skipping...`);
          return;
        }

        // Check if vote already exists
        const existingVote = await prisma.vote.findUnique({
          where: {
            voterId_eventId: {
              voterId: dbVoter.id,
              eventId: dbEvent.id
            }
          }
        });

        if (existingVote) {
          console.log(`  ℹ️  Vote already recorded in database`);
          return;
        }

        // Create vote record in database
        const vote = await prisma.vote.create({
          data: {
            voterId: dbVoter.id,
            eventId: dbEvent.id,
            candidateId: dbCandidate.id,
            blockAddress: event.transactionHash
          }
        });

        console.log(`  💾 Vote saved to database: Vote ID ${vote.id}`);

      } catch (error) {
        console.error("❌ Error handling VoteRevealed:", error);
      }
    });

    // Listen to BadgeMinted events
    blockchain.onBadgeMinted(async (voter, eventId, tokenId, event) => {
      try {
        console.log(`🎨 BadgeMinted: Token #${tokenId} → ${voter} for Event #${eventId}`);

        // You could track NFTs in a separate table if needed
        // For now, we just log it

      } catch (error) {
        console.error("❌ Error handling BadgeMinted:", error);
      }
    });

    // Listen to EventCreated events
    blockchain.onEventCreated(async (eventId, name, creator, event) => {
      try {
        console.log(`🗳️  EventCreated: Event #${eventId} - "${name}" by ${creator}`);

        // Check if event already exists in database
        const existingEvent = await prisma.event.findFirst({
          where: { blockAddress: eventId.toString() }
        });

        if (existingEvent) {
          console.log(`  ℹ️  Event already exists in database`);
          return;
        }

        // Note: Typically, event should be created in database first by API,
        // then created on blockchain. This listener is for cases where
        // event is created directly on blockchain.

        console.log(`  ℹ️  Event created on blockchain but not in database yet`);

      } catch (error) {
        console.error("❌ Error handling EventCreated:", error);
      }
    });

    console.log("✅ Event listener started successfully");
    console.log("📡 Listening to:");
    console.log("   - VoteCommitted");
    console.log("   - VoteRevealed");
    console.log("   - BadgeMinted");
    console.log("   - EventCreated\n");
  }

  /**
   * Stop listening to blockchain events
   */
  stop() {
    if (!this.isRunning) {
      console.log("⚠️  Event listener not running");
      return;
    }

    console.log("🛑 Stopping blockchain event listener...");
    blockchain.removeAllListeners();
    this.isRunning = false;
    console.log("✅ Event listener stopped");
  }

  /**
   * Get listener status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
let eventListenerService = null;

function getEventListenerService() {
  if (!eventListenerService) {
    eventListenerService = new EventListenerService();
  }
  return eventListenerService;
}

// Auto-start if run directly
if (require.main === module) {
  const service = getEventListenerService();
  service.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⏹️  Received SIGINT, shutting down gracefully...');
    service.stop();
    prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n⏹️  Received SIGTERM, shutting down gracefully...');
    service.stop();
    prisma.$disconnect();
    process.exit(0);
  });

  // Keep process alive
  console.log("🔄 Service running... Press Ctrl+C to stop\n");
}

module.exports = {
  EventListenerService,
  getEventListenerService
};
