// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./VotingToken.sol";
import "./VoterBadgeNFT.sol";

/**
 * @title VotingSystem
 * @dev Main voting system dengan commit-reveal pattern untuk anonymous voting.
 *
 * COMMIT-REVEAL PATTERN:
 * 1. Commit Phase: Voter submit hash dari (candidateId + secret)
 * 2. Reveal Phase: Voter reveal vote mereka dengan submit candidateId + secret asli
 * 3. Sistem verify bahwa hash match, baru vote dihitung
 *
 * Features:
 * - Create voting events dengan multiple candidates
 * - Commit-reveal voting untuk privacy
 * - Integration dengan VotingToken (ERC-20) sebagai voting power
 * - Auto-mint NFT badge (ERC-721) setelah voting
 * - Access control untuk event creators
 */
contract VotingSystem is Ownable, Pausable, ReentrancyGuard {

    // ==================== STRUCTS ====================

    struct VotingEvent {
        uint256 id;
        string name;
        string description;
        address creator;
        uint256 startTime;
        uint256 endTime;
        uint256 revealDeadline; // Deadline untuk reveal votes
        bool isActive;
        uint256 totalVotes;
        uint256[] candidateIds;
    }

    struct Candidate {
        uint256 id;
        string name;
        uint256 eventId;
        uint256 voteCount;
        bool exists;
    }

    struct VoteCommit {
        bytes32 commitHash; // keccak256(candidateId, secret)
        uint256 timestamp;
        bool revealed;
    }

    // ==================== STATE VARIABLES ====================

    VotingToken public votingToken;
    VoterBadgeNFT public voterBadgeNFT;

    // Counters
    uint256 private _nextEventId;
    uint256 private _nextCandidateId;

    // Mappings
    mapping(uint256 => VotingEvent) public events;
    mapping(uint256 => Candidate) public candidates;

    // voter => eventId => VoteCommit
    mapping(address => mapping(uint256 => VoteCommit)) public voteCommits;

    // voter => eventId => hasVoted (untuk prevent double voting)
    mapping(address => mapping(uint256 => bool)) public hasVoted;

    // voter => eventId => hasClaimed NFT
    mapping(address => mapping(uint256 => bool)) public hasClaimedNFT;

    // Voting token cost per vote (default 1 token = 1 vote)
    uint256 public voteTokenCost;

    // ==================== EVENTS ====================

    event EventCreated(
        uint256 indexed eventId,
        string name,
        address indexed creator,
        uint256 startTime,
        uint256 endTime
    );
    event CandidateAdded(uint256 indexed eventId, uint256 indexed candidateId, string name);
    event VoteCommitted(address indexed voter, uint256 indexed eventId, uint256 timestamp);
    event VoteRevealed(
        address indexed voter,
        uint256 indexed eventId,
        uint256 indexed candidateId
    );
    event EventEnded(uint256 indexed eventId, uint256 totalVotes);
    event NFTClaimed(address indexed voter, uint256 indexed eventId, uint256 tokenId);

    // ==================== CONSTRUCTOR ====================

    constructor(address _votingToken, address _voterBadgeNFT, uint256 _voteTokenCost)
        Ownable(msg.sender)
    {
        require(_votingToken != address(0), "Invalid token address");
        require(_voterBadgeNFT != address(0), "Invalid NFT address");

        votingToken = VotingToken(_votingToken);
        voterBadgeNFT = VoterBadgeNFT(_voterBadgeNFT);
        voteTokenCost = _voteTokenCost;

        _nextEventId = 1;
        _nextCandidateId = 1;
    }

    // ==================== MODIFIERS ====================

    modifier eventExists(uint256 eventId) {
        require(events[eventId].id != 0, "Event does not exist");
        _;
    }

    modifier onlyEventCreator(uint256 eventId) {
        require(
            events[eventId].creator == msg.sender || msg.sender == owner(),
            "Not event creator"
        );
        _;
    }

    modifier duringCommitPhase(uint256 eventId) {
        VotingEvent storage votingEvent = events[eventId];
        require(votingEvent.isActive, "Event not active");
        require(block.timestamp >= votingEvent.startTime, "Event not started");
        require(block.timestamp <= votingEvent.endTime, "Commit phase ended");
        _;
    }

    modifier duringRevealPhase(uint256 eventId) {
        VotingEvent storage votingEvent = events[eventId];
        require(block.timestamp > votingEvent.endTime, "Reveal phase not started");
        require(block.timestamp <= votingEvent.revealDeadline, "Reveal phase ended");
        _;
    }

    // ==================== EVENT MANAGEMENT ====================

    /**
     * @dev Create voting event baru
     * @param name Nama event
     * @param description Deskripsi event
     * @param startTime Unix timestamp kapan voting dimulai
     * @param endTime Unix timestamp kapan commit phase berakhir
     * @param revealDuration Durasi reveal phase dalam detik
     */
    function createEvent(
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 revealDuration
    ) external whenNotPaused returns (uint256) {
        require(bytes(name).length > 0, "Empty event name");
        require(startTime >= block.timestamp, "Start time in the past");
        require(endTime > startTime, "Invalid end time");
        require(revealDuration > 0, "Invalid reveal duration");

        uint256 eventId = _nextEventId++;
        uint256 revealDeadline = endTime + revealDuration;

        events[eventId] = VotingEvent({
            id: eventId,
            name: name,
            description: description,
            creator: msg.sender,
            startTime: startTime,
            endTime: endTime,
            revealDeadline: revealDeadline,
            isActive: true,
            totalVotes: 0,
            candidateIds: new uint256[](0)
        });

        emit EventCreated(eventId, name, msg.sender, startTime, endTime);

        return eventId;
    }

    /**
     * @dev Add candidate ke event
     * @param eventId ID event
     * @param candidateName Nama kandidat
     */
    function addCandidate(uint256 eventId, string memory candidateName)
        external
        eventExists(eventId)
        onlyEventCreator(eventId)
        returns (uint256)
    {
        require(bytes(candidateName).length > 0, "Empty candidate name");
        require(block.timestamp < events[eventId].startTime, "Event already started");

        uint256 candidateId = _nextCandidateId++;

        candidates[candidateId] = Candidate({
            id: candidateId,
            name: candidateName,
            eventId: eventId,
            voteCount: 0,
            exists: true
        });

        events[eventId].candidateIds.push(candidateId);

        emit CandidateAdded(eventId, candidateId, candidateName);

        return candidateId;
    }

    /**
     * @dev Batch add candidates (lebih gas efficient)
     */
    function addCandidates(uint256 eventId, string[] memory candidateNames)
        external
        eventExists(eventId)
        onlyEventCreator(eventId)
    {
        require(candidateNames.length > 0, "Empty candidates array");
        require(candidateNames.length <= 50, "Too many candidates");
        require(block.timestamp < events[eventId].startTime, "Event already started");

        for (uint256 i = 0; i < candidateNames.length; i++) {
            require(bytes(candidateNames[i]).length > 0, "Empty candidate name");

            uint256 candidateId = _nextCandidateId++;

            candidates[candidateId] = Candidate({
                id: candidateId,
                name: candidateNames[i],
                eventId: eventId,
                voteCount: 0,
                exists: true
            });

            events[eventId].candidateIds.push(candidateId);

            emit CandidateAdded(eventId, candidateId, candidateNames[i]);
        }
    }

    /**
     * @dev End event (hanya bisa dilakukan setelah reveal deadline)
     */
    function endEvent(uint256 eventId)
        external
        eventExists(eventId)
        onlyEventCreator(eventId)
    {
        VotingEvent storage votingEvent = events[eventId];
        require(votingEvent.isActive, "Event already ended");
        require(block.timestamp > votingEvent.revealDeadline, "Reveal phase not ended");

        votingEvent.isActive = false;

        emit EventEnded(eventId, votingEvent.totalVotes);
    }

    // ==================== COMMIT-REVEAL VOTING ====================

    /**
     * @dev Commit vote (Phase 1: Anonymous voting)
     * @param eventId ID event yang di-vote
     * @param commitHash Hash dari keccak256(abi.encodePacked(candidateId, secret))
     *
     * NOTE: User harus generate commitHash di frontend:
     * commitHash = keccak256(abi.encodePacked(candidateId, secret))
     * dan simpan secret untuk reveal nanti!
     */
    function commitVote(uint256 eventId, bytes32 commitHash)
        external
        eventExists(eventId)
        duringCommitPhase(eventId)
        nonReentrant
        whenNotPaused
    {
        require(voteCommits[msg.sender][eventId].commitHash == bytes32(0), "Already committed");
        require(commitHash != bytes32(0), "Invalid commit hash");

        // Check apakah user punya cukup voting token
        require(
            votingToken.balanceOf(msg.sender) >= voteTokenCost,
            "Insufficient voting tokens"
        );

        // Burn voting token (atau bisa di-transfer ke contract)
        votingToken.burnFrom(msg.sender, voteTokenCost);

        // Save commit
        voteCommits[msg.sender][eventId] = VoteCommit({
            commitHash: commitHash,
            timestamp: block.timestamp,
            revealed: false
        });

        emit VoteCommitted(msg.sender, eventId, block.timestamp);
    }

    /**
     * @dev Reveal vote (Phase 2: Verify dan count vote)
     * @param eventId ID event
     * @param candidateId ID kandidat yang di-vote
     * @param secret Secret yang digunakan saat commit
     */
    function revealVote(uint256 eventId, uint256 candidateId, bytes32 secret)
        external
        eventExists(eventId)
        duringRevealPhase(eventId)
        nonReentrant
        whenNotPaused
    {
        VoteCommit storage commit = voteCommits[msg.sender][eventId];

        require(commit.commitHash != bytes32(0), "No commit found");
        require(!commit.revealed, "Already revealed");
        require(candidates[candidateId].exists, "Invalid candidate");
        require(candidates[candidateId].eventId == eventId, "Candidate not in this event");

        // Verify commit hash
        bytes32 computedHash = keccak256(abi.encodePacked(candidateId, secret));
        require(computedHash == commit.commitHash, "Invalid reveal");

        // Mark as revealed
        commit.revealed = true;
        hasVoted[msg.sender][eventId] = true;

        // Count vote
        candidates[candidateId].voteCount++;
        events[eventId].totalVotes++;

        emit VoteRevealed(msg.sender, eventId, candidateId);

        // Auto-mint NFT badge (optional - bisa juga via separate function)
        _mintBadgeIfNotClaimed(msg.sender, eventId);
    }

    // ==================== NFT REWARD ====================

    /**
     * @dev Claim NFT badge setelah voting (jika belum auto-mint)
     */
    function claimNFTBadge(uint256 eventId)
        external
        eventExists(eventId)
        nonReentrant
    {
        require(hasVoted[msg.sender][eventId], "Did not vote in this event");
        require(!hasClaimedNFT[msg.sender][eventId], "NFT already claimed");

        hasClaimedNFT[msg.sender][eventId] = true;

        uint256 tokenId = voterBadgeNFT.mintBadge(msg.sender, eventId);

        emit NFTClaimed(msg.sender, eventId, tokenId);
    }

    /**
     * @dev Internal function untuk auto-mint badge
     */
    function _mintBadgeIfNotClaimed(address voter, uint256 eventId) private {
        if (!hasClaimedNFT[voter][eventId]) {
            hasClaimedNFT[voter][eventId] = true;
            uint256 tokenId = voterBadgeNFT.mintBadge(voter, eventId);
            emit NFTClaimed(voter, eventId, tokenId);
        }
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @dev Get event details
     */
    function getEvent(uint256 eventId)
        external
        view
        eventExists(eventId)
        returns (VotingEvent memory)
    {
        return events[eventId];
    }

    /**
     * @dev Get all candidates untuk event
     */
    function getEventCandidates(uint256 eventId)
        external
        view
        eventExists(eventId)
        returns (Candidate[] memory)
    {
        uint256[] memory candidateIds = events[eventId].candidateIds;
        Candidate[] memory eventCandidates = new Candidate[](candidateIds.length);

        for (uint256 i = 0; i < candidateIds.length; i++) {
            eventCandidates[i] = candidates[candidateIds[i]];
        }

        return eventCandidates;
    }

    /**
     * @dev Get voting results untuk event (hanya setelah reveal phase)
     */
    function getResults(uint256 eventId)
        external
        view
        eventExists(eventId)
        returns (uint256[] memory candidateIds, uint256[] memory voteCounts)
    {
        require(
            block.timestamp > events[eventId].revealDeadline,
            "Results not available yet"
        );

        uint256[] memory ids = events[eventId].candidateIds;
        uint256[] memory counts = new uint256[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            counts[i] = candidates[ids[i]].voteCount;
        }

        return (ids, counts);
    }

    /**
     * @dev Get winner dari event
     */
    function getWinner(uint256 eventId)
        external
        view
        eventExists(eventId)
        returns (uint256 winnerId, string memory winnerName, uint256 winnerVotes)
    {
        require(
            block.timestamp > events[eventId].revealDeadline,
            "Results not available yet"
        );

        uint256[] memory candidateIds = events[eventId].candidateIds;
        require(candidateIds.length > 0, "No candidates");

        uint256 maxVotes = 0;
        uint256 winnerCandidateId = 0;

        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 candidateId = candidateIds[i];
            if (candidates[candidateId].voteCount > maxVotes) {
                maxVotes = candidates[candidateId].voteCount;
                winnerCandidateId = candidateId;
            }
        }

        require(winnerCandidateId != 0, "No winner found");

        return (
            winnerCandidateId,
            candidates[winnerCandidateId].name,
            candidates[winnerCandidateId].voteCount
        );
    }

    /**
     * @dev Check apakah user sudah commit vote
     */
    function hasCommitted(address voter, uint256 eventId) external view returns (bool) {
        return voteCommits[voter][eventId].commitHash != bytes32(0);
    }

    /**
     * @dev Check apakah user sudah reveal vote
     */
    function hasRevealed(address voter, uint256 eventId) external view returns (bool) {
        return voteCommits[voter][eventId].revealed;
    }

    /**
     * @dev Get commit details
     */
    function getCommit(address voter, uint256 eventId)
        external
        view
        returns (bytes32 commitHash, uint256 timestamp, bool revealed)
    {
        VoteCommit memory commit = voteCommits[voter][eventId];
        return (commit.commitHash, commit.timestamp, commit.revealed);
    }

    // ==================== ADMIN FUNCTIONS ====================

    /**
     * @dev Update vote token cost
     */
    function setVoteTokenCost(uint256 newCost) external onlyOwner {
        voteTokenCost = newCost;
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency: Deactivate event
     */
    function deactivateEvent(uint256 eventId)
        external
        onlyOwner
        eventExists(eventId)
    {
        events[eventId].isActive = false;
    }
}
