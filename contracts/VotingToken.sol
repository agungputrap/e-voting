// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title VotingToken
 * @dev ERC-20 token yang digunakan sebagai voting power dalam sistem voting.
 * Setiap 1 token = 1 vote. User bisa mendapatkan token ini untuk voting.
 *
 * Features:
 * - Mintable: Owner bisa mint token baru untuk didistribusikan ke voters
 * - Burnable: Token bisa di-burn setelah digunakan untuk voting (optional)
 * - Pausable: Owner bisa pause transfer dalam kondisi emergency
 * - Transfer restrictions: Bisa dikustomisasi jika perlu whitelist voters
 */
contract VotingToken is ERC20, ERC20Burnable, Ownable, Pausable {

    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event TokensDistributed(address[] recipients, uint256[] amounts);

    // Maximum supply (optional - untuk prevent unlimited minting)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens

    /**
     * @dev Constructor untuk inisialisasi token
     * @param initialSupply Jumlah token yang di-mint saat deployment
     */
    constructor(uint256 initialSupply)
        ERC20("VotingToken", "VOTE")
        Ownable(msg.sender)
    {
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds max supply");
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
            emit TokensMinted(msg.sender, initialSupply);
        }
    }

    /**
     * @dev Mint token baru. Hanya owner yang bisa mint.
     * @param to Address yang akan menerima token
     * @param amount Jumlah token yang akan di-mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Minting would exceed max supply");

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Batch mint token ke multiple addresses sekaligus.
     * Useful untuk distribute token ke banyak voters.
     * @param recipients Array of addresses yang akan menerima token
     * @param amounts Array of amounts untuk setiap recipient
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts)
        external
        onlyOwner
    {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        require(recipients.length <= 200, "Too many recipients"); // Gas limit protection

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Batch mint would exceed max supply");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Cannot mint to zero address");
            _mint(recipients[i], amounts[i]);
        }

        emit TokensDistributed(recipients, amounts);
    }

    /**
     * @dev Burn token dari address tertentu.
     * Bisa digunakan oleh VotingSystem contract setelah token digunakan untuk vote.
     * @param from Address yang token-nya akan di-burn
     * @param amount Jumlah token yang akan di-burn
     */
    function burnFrom(address from, uint256 amount) public override {
        super.burnFrom(from, amount);
        emit TokensBurned(from, amount);
    }

    /**
     * @dev Pause all token transfers. Emergency use only.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Hook yang dipanggil sebelum setiap transfer.
     * Enforce pause mechanism.
     */
    function _update(address from, address to, uint256 amount)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, amount);
    }

    /**
     * @dev Decimals untuk token ini. Standard ERC-20 adalah 18.
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
