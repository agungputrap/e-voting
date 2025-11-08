/**
 * Blockchain Integration Library
 *
 * Library untuk interact dengan smart contracts dari backend/frontend
 * Menggunakan ethers.js untuk connect ke Lisk Sepolia
 */

const { ethers } = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

// Contract ABIs (simplified - hanya functions yang penting)
const VOTING_TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function batchMint(address[] calldata recipients, uint256[] calldata amounts)",
  "function burnFrom(address from, uint256 amount)",
  "function totalSupply() view returns (uint256)",
  "function owner() view returns (address)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const VOTER_BADGE_NFT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function mintBadge(address voter, uint256 eventId) returns (uint256)",
  "function hasBadgeForEvent(address voter, uint256 eventId) view returns (bool)",
  "function getBadgeTokenId(address voter, uint256 eventId) view returns (uint256)",
  "function setEventBaseURI(uint256 eventId, string memory baseURI)",
  "function authorizeMinter(address minter)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event BadgeMinted(address indexed voter, uint256 indexed tokenId, uint256 indexed eventId)"
];

const VOTING_SYSTEM_ABI = [
  "function createEvent(string memory name, string memory description, uint256 startTime, uint256 duration, uint256 revealPeriod) returns (uint256)",
  "function addCandidates(uint256 eventId, string[] memory candidateNames)",
  "function commitVote(uint256 eventId, bytes32 commitHash)",
  "function revealVote(uint256 eventId, uint256 candidateId, bytes32 secret)",
  "function getEvent(uint256 eventId) view returns (tuple(uint256 id, string name, string description, address creator, uint256 startTime, uint256 endTime, uint256 revealDeadline, bool isActive, uint256 totalVotes, uint256[] candidateIds))",
  "function getEventCandidates(uint256 eventId) view returns (tuple(uint256 id, string name, uint256 voteCount, bool exists)[])",
  "function getWinner(uint256 eventId) view returns (uint256 winnerId, string winnerName, uint256 winnerVotes, uint256 totalVotes)",
  "event EventCreated(uint256 indexed eventId, string name, address creator)",
  "event CandidateAdded(uint256 indexed eventId, uint256 candidateId, string name)",
  "event VoteCommitted(uint256 indexed eventId, address indexed voter)",
  "event VoteRevealed(uint256 indexed eventId, address indexed voter, uint256 candidateId)",
  "event BadgeMinted(address indexed voter, uint256 indexed eventId, uint256 tokenId)"
];

class BlockchainService {
  constructor() {
    // Setup provider
    this.provider = new ethers.JsonRpcProvider(
      process.env.LISK_RPC_URL || "https://rpc.sepolia-api.lisk.com"
    );

    // Setup wallet (untuk admin operations)
    if (process.env.PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    }

    // Contract addresses
    this.addresses = {
      votingToken: process.env.NEXT_PUBLIC_VOTING_TOKEN_ADDRESS,
      voterBadgeNFT: process.env.NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS,
      votingSystem: process.env.NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS
    };

    // Initialize contracts
    this.contracts = {
      votingToken: null,
      voterBadgeNFT: null,
      votingSystem: null
    };

    this._initializeContracts();
  }

  _initializeContracts() {
    if (this.addresses.votingToken) {
      this.contracts.votingToken = new ethers.Contract(
        this.addresses.votingToken,
        VOTING_TOKEN_ABI,
        this.wallet || this.provider
      );
    }

    if (this.addresses.voterBadgeNFT) {
      this.contracts.voterBadgeNFT = new ethers.Contract(
        this.addresses.voterBadgeNFT,
        VOTER_BADGE_NFT_ABI,
        this.wallet || this.provider
      );
    }

    if (this.addresses.votingSystem) {
      this.contracts.votingSystem = new ethers.Contract(
        this.addresses.votingSystem,
        VOTING_SYSTEM_ABI,
        this.wallet || this.provider
      );
    }
  }

  // ==================== VOTING TOKEN OPERATIONS ====================

  /**
   * Get token balance of address
   * @param {string} address - Wallet address
   * @returns {Promise<string>} Balance in ether format
   */
  async getTokenBalance(address) {
    const balance = await this.contracts.votingToken.balanceOf(address);
    return ethers.formatEther(balance);
  }

  /**
   * Mint tokens to single address
   * @param {string} to - Recipient address
   * @param {string} amount - Amount in ether (e.g., "100")
   * @returns {Promise<object>} Transaction receipt
   */
  async mintTokens(to, amount) {
    const amountWei = ethers.parseEther(amount);
    const tx = await this.contracts.votingToken.mint(to, amountWei);
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      to,
      amount
    };
  }

  /**
   * Batch mint tokens to multiple addresses
   * @param {Array<string>} recipients - Array of wallet addresses
   * @param {Array<string>} amounts - Array of amounts in ether
   * @returns {Promise<object>} Transaction receipt
   */
  async batchMintTokens(recipients, amounts) {
    const amountsWei = amounts.map(amt => ethers.parseEther(amt));
    const tx = await this.contracts.votingToken.batchMint(recipients, amountsWei);
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      recipients,
      amounts
    };
  }

  // ==================== VOTING SYSTEM OPERATIONS ====================

  /**
   * Create new voting event on blockchain
   * @param {object} eventData - Event details
   * @returns {Promise<object>} Event ID and transaction receipt
   */
  async createBlockchainEvent(eventData) {
    const {
      name,
      description,
      startTime, // Unix timestamp
      duration,  // in seconds
      revealPeriod // in seconds
    } = eventData;

    const tx = await this.contracts.votingSystem.createEvent(
      name,
      description,
      startTime,
      duration,
      revealPeriod
    );

    const receipt = await tx.wait();

    // Extract event ID from logs
    const eventCreatedLog = receipt.logs.find(log => {
      try {
        const parsed = this.contracts.votingSystem.interface.parseLog(log);
        return parsed?.name === 'EventCreated';
      } catch {
        return false;
      }
    });

    const parsedLog = this.contracts.votingSystem.interface.parseLog(eventCreatedLog);
    const blockchainEventId = parsedLog.args[0];

    return {
      blockchainEventId: Number(blockchainEventId),
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  /**
   * Add candidates to blockchain event
   * @param {number} eventId - Blockchain event ID
   * @param {Array<string>} candidateNames - Array of candidate names
   * @returns {Promise<object>} Transaction receipt
   */
  async addCandidates(eventId, candidateNames) {
    const tx = await this.contracts.votingSystem.addCandidates(eventId, candidateNames);
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      eventId,
      candidateNames
    };
  }

  /**
   * Get event details from blockchain
   * @param {number} eventId - Blockchain event ID
   * @returns {Promise<object>} Event details
   */
  async getEvent(eventId) {
    const event = await this.contracts.votingSystem["getEvent(uint256)"](eventId);
    return {
      id: Number(event.id),
      name: event.name,
      description: event.description,
      creator: event.creator,
      startTime: Number(event.startTime),
      endTime: Number(event.endTime),
      revealDeadline: Number(event.revealDeadline),
      isActive: event.isActive,
      totalVotes: Number(event.totalVotes),
      candidateIds: event.candidateIds.map(id => Number(id))
    };
  }

  /**
   * Get candidates for event from blockchain
   * @param {number} eventId - Blockchain event ID
   * @returns {Promise<Array>} Array of candidates
   */
  async getEventCandidates(eventId) {
    const candidates = await this.contracts.votingSystem["getEventCandidates(uint256)"](eventId);
    return candidates.map(c => ({
      id: Number(c.id),
      name: c.name,
      voteCount: Number(c.voteCount),
      exists: c.exists
    }));
  }

  /**
   * Get winner of event from blockchain
   * @param {number} eventId - Blockchain event ID
   * @returns {Promise<object>} Winner details
   */
  async getWinner(eventId) {
    const [winnerId, winnerName, winnerVotes, totalVotes] =
      await this.contracts.votingSystem.getWinner(eventId);

    return {
      winnerId: Number(winnerId),
      winnerName,
      winnerVotes: Number(winnerVotes),
      totalVotes: Number(totalVotes),
      percentage: totalVotes > 0 ? (Number(winnerVotes) / Number(totalVotes) * 100).toFixed(2) : 0
    };
  }

  // ==================== NFT OPERATIONS ====================

  /**
   * Check if user has badge for event
   * @param {string} voterAddress - Voter wallet address
   * @param {number} eventId - Blockchain event ID
   * @returns {Promise<boolean>} Has badge or not
   */
  async hasBadgeForEvent(voterAddress, eventId) {
    return await this.contracts.voterBadgeNFT.hasBadgeForEvent(voterAddress, eventId);
  }

  /**
   * Get NFT token ID for voter and event
   * @param {string} voterAddress - Voter wallet address
   * @param {number} eventId - Blockchain event ID
   * @returns {Promise<number>} Token ID (0 if no badge)
   */
  async getBadgeTokenId(voterAddress, eventId) {
    const tokenId = await this.contracts.voterBadgeNFT.getBadgeTokenId(voterAddress, eventId);
    return Number(tokenId);
  }

  /**
   * Set metadata base URI for event NFTs
   * @param {number} eventId - Blockchain event ID
   * @param {string} baseURI - IPFS or server URI
   * @returns {Promise<object>} Transaction receipt
   */
  async setEventBaseURI(eventId, baseURI) {
    const tx = await this.contracts.voterBadgeNFT.setEventBaseURI(eventId, baseURI);
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      eventId,
      baseURI
    };
  }

  // ==================== EVENT LISTENERS ====================

  /**
   * Listen to VoteRevealed events
   * @param {Function} callback - Callback function (eventId, voter, candidateId, event)
   */
  onVoteRevealed(callback) {
    this.contracts.votingSystem.on("VoteRevealed", callback);
  }

  /**
   * Listen to VoteCommitted events
   * @param {Function} callback - Callback function (eventId, voter, event)
   */
  onVoteCommitted(callback) {
    this.contracts.votingSystem.on("VoteCommitted", callback);
  }

  /**
   * Listen to BadgeMinted events
   * @param {Function} callback - Callback function (voter, eventId, tokenId, event)
   */
  onBadgeMinted(callback) {
    this.contracts.votingSystem.on("BadgeMinted", callback);
  }

  /**
   * Listen to EventCreated events
   * @param {Function} callback - Callback function (eventId, name, creator, event)
   */
  onEventCreated(callback) {
    this.contracts.votingSystem.on("EventCreated", callback);
  }

  /**
   * Stop all listeners
   */
  removeAllListeners() {
    this.contracts.votingSystem.removeAllListeners();
    this.contracts.voterBadgeNFT.removeAllListeners();
    this.contracts.votingToken.removeAllListeners();
  }

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Get current block number
   * @returns {Promise<number>} Current block number
   */
  async getCurrentBlockNumber() {
    return await this.provider.getBlockNumber();
  }

  /**
   * Get transaction receipt
   * @param {string} txHash - Transaction hash
   * @returns {Promise<object>} Transaction receipt
   */
  async getTransactionReceipt(txHash) {
    return await this.provider.getTransactionReceipt(txHash);
  }

  /**
   * Wait for transaction confirmation
   * @param {string} txHash - Transaction hash
   * @param {number} confirmations - Number of confirmations to wait
   * @returns {Promise<object>} Transaction receipt
   */
  async waitForTransaction(txHash, confirmations = 1) {
    const tx = await this.provider.getTransaction(txHash);
    return await tx.wait(confirmations);
  }
}

// Export singleton instance
let blockchainService = null;

function getBlockchainService() {
  if (!blockchainService) {
    blockchainService = new BlockchainService();
  }
  return blockchainService;
}

module.exports = {
  BlockchainService,
  getBlockchainService
};
