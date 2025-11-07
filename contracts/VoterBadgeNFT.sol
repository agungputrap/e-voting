// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title VoterBadgeNFT
 * @dev ERC-721 NFT yang diberikan sebagai reward/badge kepada voters yang telah berpartisipasi.
 * Setiap event voting akan memiliki NFT badge yang unik dengan metadata berbeda.
 *
 * Features:
 * - Unique NFT per event: Setiap event punya design/metadata berbeda
 * - Soul-bound option: Bisa dikonfigurasi agar NFT tidak bisa di-transfer (permanent badge)
 * - Metadata storage: Support off-chain metadata via tokenURI (IPFS atau server)
 * - Authorized minters: VotingSystem contract bisa mint NFT otomatis setelah voting
 */
contract VoterBadgeNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable, Pausable {
    using Strings for uint256;

    // Token ID counter
    uint256 private _nextTokenId;

    // Mapping dari token ID ke event ID
    mapping(uint256 => uint256) public tokenToEvent;

    // Mapping dari user address dan event ID ke token ID
    // Untuk track apakah user sudah dapat NFT untuk event tertentu
    mapping(address => mapping(uint256 => uint256)) public userEventToToken;

    // Mapping event ID ke base URI untuk metadata event tersebut
    mapping(uint256 => string) public eventBaseURIs;

    // Authorized minters (VotingSystem contract address)
    mapping(address => bool) public authorizedMinters;

    // Apakah NFT ini soul-bound (tidak bisa transfer)?
    bool public isSoulBound;

    // Events
    event BadgeMinted(address indexed voter, uint256 indexed tokenId, uint256 indexed eventId);
    event EventBaseURISet(uint256 indexed eventId, string baseURI);
    event MinterAuthorized(address indexed minter);
    event MinterRevoked(address indexed minter);
    event SoulBoundToggled(bool isSoulBound);

    /**
     * @dev Constructor
     * @param _isSoulBound Apakah NFT ini soul-bound (tidak bisa di-transfer)
     */
    constructor(bool _isSoulBound)
        ERC721("VoterBadge", "VBADGE")
        Ownable(msg.sender)
    {
        isSoulBound = _isSoulBound;
        _nextTokenId = 1; // Start from token ID 1
    }

    // ==================== MODIFIER ====================

    /**
     * @dev Modifier untuk restrict function hanya untuk authorized minters
     */
    modifier onlyAuthorizedMinter() {
        require(
            authorizedMinters[msg.sender] || msg.sender == owner(),
            "Not authorized to mint"
        );
        _;
    }

    // ==================== ADMIN FUNCTIONS ====================

    /**
     * @dev Authorize address untuk mint NFT (biasanya VotingSystem contract)
     * @param minter Address yang akan di-authorize
     */
    function authorizeMinter(address minter) external onlyOwner {
        require(minter != address(0), "Cannot authorize zero address");
        require(!authorizedMinters[minter], "Already authorized");

        authorizedMinters[minter] = true;
        emit MinterAuthorized(minter);
    }

    /**
     * @dev Revoke authorization dari minter
     * @param minter Address yang akan di-revoke
     */
    function revokeMinter(address minter) external onlyOwner {
        require(authorizedMinters[minter], "Not authorized");

        authorizedMinters[minter] = false;
        emit MinterRevoked(minter);
    }

    /**
     * @dev Set base URI untuk event tertentu
     * @param eventId ID dari event
     * @param baseURI Base URI untuk metadata (e.g., ipfs://QmXxx/ atau https://api.example.com/metadata/)
     */
    function setEventBaseURI(uint256 eventId, string memory baseURI) external onlyOwner {
        require(bytes(baseURI).length > 0, "Empty base URI");

        eventBaseURIs[eventId] = baseURI;
        emit EventBaseURISet(eventId, baseURI);
    }

    /**
     * @dev Toggle soul-bound status
     */
    function toggleSoulBound() external onlyOwner {
        isSoulBound = !isSoulBound;
        emit SoulBoundToggled(isSoulBound);
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

    // ==================== MINTING FUNCTIONS ====================

    /**
     * @dev Mint NFT badge untuk voter yang sudah voting di event tertentu
     * @param voter Address voter yang akan menerima NFT
     * @param eventId ID event yang di-vote
     * @return tokenId Token ID yang di-mint
     */
    function mintBadge(address voter, uint256 eventId)
        external
        onlyAuthorizedMinter
        whenNotPaused
        returns (uint256)
    {
        require(voter != address(0), "Cannot mint to zero address");
        require(
            userEventToToken[voter][eventId] == 0,
            "Voter already has badge for this event"
        );

        uint256 tokenId = _nextTokenId++;

        _safeMint(voter, tokenId);

        // Set mappings
        tokenToEvent[tokenId] = eventId;
        userEventToToken[voter][eventId] = tokenId;

        // Set token URI jika event sudah punya base URI
        if (bytes(eventBaseURIs[eventId]).length > 0) {
            string memory uri = string(abi.encodePacked(eventBaseURIs[eventId], tokenId.toString()));
            _setTokenURI(tokenId, uri);
        }

        emit BadgeMinted(voter, tokenId, eventId);

        return tokenId;
    }

    /**
     * @dev Batch mint badges untuk multiple voters (gas efficient)
     * @param voters Array of voter addresses
     * @param eventIds Array of event IDs (harus sama panjangnya dengan voters)
     */
    function batchMintBadges(address[] calldata voters, uint256[] calldata eventIds)
        external
        onlyAuthorizedMinter
        whenNotPaused
    {
        require(voters.length == eventIds.length, "Arrays length mismatch");
        require(voters.length > 0, "Empty arrays");
        require(voters.length <= 100, "Too many mints"); // Gas limit protection

        for (uint256 i = 0; i < voters.length; i++) {
            // Skip jika voter sudah punya badge untuk event ini
            if (userEventToToken[voters[i]][eventIds[i]] == 0) {
                uint256 tokenId = _nextTokenId++;

                _safeMint(voters[i], tokenId);

                tokenToEvent[tokenId] = eventIds[i];
                userEventToToken[voters[i]][eventIds[i]] = tokenId;

                // Set token URI
                if (bytes(eventBaseURIs[eventIds[i]]).length > 0) {
                    string memory uri = string(
                        abi.encodePacked(eventBaseURIs[eventIds[i]], tokenId.toString())
                    );
                    _setTokenURI(tokenId, uri);
                }

                emit BadgeMinted(voters[i], tokenId, eventIds[i]);
            }
        }
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @dev Check apakah user sudah punya badge untuk event tertentu
     * @param voter Address voter
     * @param eventId ID event
     * @return hasBadge True jika user sudah punya badge
     */
    function hasBadgeForEvent(address voter, uint256 eventId) external view returns (bool) {
        return userEventToToken[voter][eventId] != 0;
    }

    /**
     * @dev Get token ID dari badge user untuk event tertentu
     * @param voter Address voter
     * @param eventId ID event
     * @return tokenId Token ID (0 jika belum punya)
     */
    function getBadgeTokenId(address voter, uint256 eventId) external view returns (uint256) {
        return userEventToToken[voter][eventId];
    }

    /**
     * @dev Get event ID dari token ID
     * @param tokenId Token ID
     * @return eventId Event ID
     */
    function getEventId(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenToEvent[tokenId];
    }

    /**
     * @dev Get total supply (total minted tokens)
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ==================== OVERRIDE FUNCTIONS ====================

    /**
     * @dev Override tokenURI untuk support custom metadata per event
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override _update untuk enforce soul-bound dan pause
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        whenNotPaused
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // Jika soul-bound, block transfer kecuali mint (from == address(0)) atau burn (to == address(0))
        if (isSoulBound && from != address(0) && to != address(0)) {
            revert("NFT is soul-bound and cannot be transferred");
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override supportsInterface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
