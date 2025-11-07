# 🚀 Deployment Guide - E-Voting Smart Contracts

Guide lengkap untuk deploy smart contracts ke Lisk Sepolia Testnet.

## 📋 Prerequisites

Sebelum deploy, pastikan kamu sudah punya:

1. **Metamask atau wallet lain** dengan private key
2. **Lisk Sepolia ETH** untuk gas fees
   - Dapatkan dari faucet: https://sepolia-faucet.lisk.com
3. **Node.js & npm** terinstall

## ⚙️ Setup Environment

### 1. Copy file .env.example ke .env

```bash
cp .env.example .env
```

### 2. Edit file .env dan isi dengan data kamu:

```env
# Blockchain Configuration
LISK_RPC_URL="https://rpc.sepolia-api.lisk.com"
PRIVATE_KEY="your_private_key_here_WITHOUT_0x_prefix"

# Frontend Configuration (isi setelah deploy)
NEXT_PUBLIC_LISK_RPC_URL="https://rpc.sepolia-api.lisk.com"
NEXT_PUBLIC_PANNA_API_KEY="your_panna_api_key"
NEXT_PUBLIC_VOTING_TOKEN_ADDRESS=""
NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS=""
NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS=""
```

**⚠️ PENTING: Cara mendapatkan PRIVATE_KEY:**
1. Buka Metamask
2. Klik 3 titik di pojok kanan atas
3. Account details → Show private key
4. Copy private key **TANPA prefix 0x**
5. Paste ke file .env

**🔒 KEAMANAN:**
- Jangan commit file .env ke Git!
- File .env sudah ada di .gitignore
- Jangan share private key ke siapapun!

### 3. Pastikan punya Lisk Sepolia ETH

Check balance di Metamask atau:
```bash
npx hardhat run scripts/check-balance.js --network liskSepolia
```

Kalau balance kosong, claim dari faucet:
https://sepolia-faucet.lisk.com

## 🚀 Deploy Contracts

### 1. Compile contracts (pastikan tidak ada error)

```bash
npx hardhat compile
```

Output:
```
Compiled 29 Solidity files successfully
```

### 2. Deploy ke Lisk Sepolia

```bash
npx hardhat run scripts/deploy.js --network liskSepolia
```

Script ini akan:
1. Deploy VotingToken (ERC-20)
2. Deploy VoterBadgeNFT (ERC-721)
3. Deploy VotingSystem (main contract)
4. Setup permissions (authorize VotingSystem to mint NFTs)
5. Save deployment info ke `deployment-info.json`

**Output yang kamu dapatkan:**
```
🚀 Starting deployment to Lisk Sepolia...

📝 Deploying contracts with account: 0x...
💰 Account balance: 0.5 ETH

📦 Deploying VotingToken (ERC-20)...
✅ VotingToken deployed to: 0xABC123...

📦 Deploying VoterBadgeNFT (ERC-721)...
✅ VoterBadgeNFT deployed to: 0xDEF456...

📦 Deploying VotingSystem...
✅ VotingSystem deployed to: 0xGHI789...

🔐 Setting up permissions...
✅ VotingSystem authorized to mint NFT badges

🎉 DEPLOYMENT SUCCESSFUL!
```

### 3. Copy contract addresses ke .env

Setelah deploy berhasil, copy 3 addresses yang muncul ke file `.env`:

```env
NEXT_PUBLIC_VOTING_TOKEN_ADDRESS="0xABC123..."
NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS="0xGHI789..."
NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS="0xDEF456..."
```

## ✅ Verify Contracts on Blockscout

Verify contracts agar source code bisa dibaca publik (requirement dari tugas).

### Cara 1: Otomatis dengan script

```bash
npx hardhat run scripts/verify.js --network liskSepolia
```

### Cara 2: Manual (jika otomatis gagal)

```bash
# Verify VotingToken
npx hardhat verify --network liskSepolia <VOTING_TOKEN_ADDRESS> "1000000000000000000000000"

# Verify VoterBadgeNFT
npx hardhat verify --network liskSepolia <VOTER_BADGE_NFT_ADDRESS> false

# Verify VotingSystem
npx hardhat verify --network liskSepolia <VOTING_SYSTEM_ADDRESS> <VOTING_TOKEN_ADDRESS> <VOTER_BADGE_NFT_ADDRESS> "1000000000000000000"
```

**Setelah verify berhasil**, buka Blockscout dan check:
https://sepolia-blockscout.lisk.com/address/YOUR_CONTRACT_ADDRESS

Kamu akan lihat tab "Contract" dengan source code Solidity.

## 📖 Deployed Contracts Overview

### 1. VotingToken (ERC-20)
- **Address**: Lihat di deployment-info.json
- **Symbol**: VOTE
- **Initial Supply**: 1,000,000 VOTE tokens
- **Fungsi**: Token untuk voting power (1 token = 1 vote)

### 2. VoterBadgeNFT (ERC-721)
- **Address**: Lihat di deployment-info.json
- **Symbol**: VBADGE
- **Fungsi**: NFT badge reward untuk voters yang sudah voting

### 3. VotingSystem (Main Contract)
- **Address**: Lihat di deployment-info.json
- **Fungsi**: Main voting logic dengan commit-reveal pattern

## 🧪 Testing Deployed Contracts

### 1. Distribute VOTE tokens ke test voters

Gunakan Hardhat console:
```bash
npx hardhat console --network liskSepolia
```

Dalam console:
```javascript
const VotingToken = await ethers.getContractFactory("VotingToken");
const votingToken = await VotingToken.attach("YOUR_VOTING_TOKEN_ADDRESS");

// Transfer 100 VOTE tokens ke voter
await votingToken.transfer("0xVoterAddress", ethers.parseEther("100"));
```

### 2. Create voting event

```javascript
const VotingSystem = await ethers.getContractFactory("VotingSystem");
const votingSystem = await VotingSystem.attach("YOUR_VOTING_SYSTEM_ADDRESS");

// Get current time
const now = Math.floor(Date.now() / 1000);

// Create event (starts in 1 hour, lasts for 1 day)
await votingSystem.createEvent(
  "President Election 2024",
  "Vote for your favorite candidate",
  now + 3600,        // startTime
  now + 3600 + 86400, // endTime (24 hours later)
  3600               // revealDuration (1 hour)
);

// Add candidates
await votingSystem.addCandidates(1, ["Alice", "Bob", "Charlie"]);
```

### 3. Test voting flow

Lihat di frontend atau gunakan Hardhat console untuk simulate commit-reveal voting.

## 📊 Monitoring

### View contract on Blockscout
- VotingToken: https://sepolia-blockscout.lisk.com/address/YOUR_TOKEN_ADDRESS
- VoterBadgeNFT: https://sepolia-blockscout.lisk.com/address/YOUR_NFT_ADDRESS
- VotingSystem: https://sepolia-blockscout.lisk.com/address/YOUR_SYSTEM_ADDRESS

### Check transactions
Setiap transaksi akan muncul di Blockscout dengan gas usage dan event logs.

## ❓ Troubleshooting

### Error: "insufficient funds"
- Claim Lisk Sepolia ETH dari faucet: https://sepolia-faucet.lisk.com
- Pastikan address kamu punya minimal 0.1 ETH

### Error: "invalid private key"
- Pastikan private key TANPA prefix "0x"
- Check tidak ada space atau karakter aneh

### Verification failed
- Tunggu beberapa menit setelah deploy
- Coba verify lagi dengan script
- Check constructor arguments sudah benar

### Transaction stuck / pending
- Check di Metamask atau Blockscout
- Mungkin gas price terlalu rendah
- Tunggu atau cancel & retry dengan gas lebih tinggi

## 🎉 Next Steps

Setelah deploy berhasil:

1. ✅ **Copy contract addresses** ke .env
2. ✅ **Verify contracts** di Blockscout
3. 🔄 **Integrate frontend** dengan Panna SDK
4. 🎨 **Connect wallet** di UI
5. ⚡ **Test voting flow** end-to-end
6. 📝 **Prepare demo** for Demo Day

## 📞 Support

Kalau ada issue:
- Check Hardhat docs: https://hardhat.org/docs
- Check Lisk docs: https://docs.lisk.com
- Check deployment-info.json untuk contract addresses
- Review transaction on Blockscout

---

Good luck with your deployment! 🚀
