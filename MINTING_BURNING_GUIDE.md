# 🪙 Minting & Burning Guide - VotingToken

Panduan lengkap untuk melakukan minting (membuat token baru) dan burning (menghancurkan token) VotingToken.

---

## 📋 Table of Contents

1. [Understanding Minting & Burning](#understanding-minting--burning)
2. [Prerequisites](#prerequisites)
3. [Method 1: Using Scripts (Recommended)](#method-1-using-scripts-recommended)
4. [Method 2: Using Blockscout UI](#method-2-using-blockscout-ui)
5. [Method 3: Using Hardhat Console](#method-3-using-hardhat-console)
6. [Common Use Cases](#common-use-cases)
7. [Troubleshooting](#troubleshooting)

---

## 1. Understanding Minting & Burning

### 🪙 Minting (Membuat Token Baru)

**Apa itu Minting?**
- Proses membuat/menciptakan token baru
- Menambah total supply token
- Hanya bisa dilakukan oleh **owner contract**

**Kapan Perlu Minting?**
- Sebelum voting dimulai (distribute token ke voters)
- Menambah token untuk voter baru
- Reward untuk aktivitas tertentu

**Contoh:**
```
Before Minting:
- Total Supply: 1,000,000 tokens
- Alice balance: 0 tokens

After Minting 100 tokens to Alice:
- Total Supply: 1,000,100 tokens
- Alice balance: 100 tokens
```

---

### 🔥 Burning (Menghancurkan Token)

**Apa itu Burning?**
- Proses menghancurkan/menghilangkan token
- Mengurangi total supply token
- Bisa dilakukan oleh owner atau user (untuk token mereka sendiri)

**Kapan Token Di-burn?**
- ✅ **Otomatis saat user vote** (1 token burned per vote)
- Manual burn jika owner ingin kurangi supply
- User burn token mereka sendiri jika mau

**Contoh:**
```
Before Burning:
- Total Supply: 1,000,100 tokens
- Alice balance: 100 tokens

After Alice votes (burn 1 token):
- Total Supply: 1,000,099 tokens
- Alice balance: 99 tokens
```

---

## 2. Prerequisites

### ✅ Checklist Sebelum Minting

1. **Pastikan Kamu adalah Owner**
   ```bash
   # Check dengan script
   node scripts/check-balance.js
   # Lihat apakah ada "✅ You are the owner (can mint)"
   ```

2. **Punya Cukup ETH untuk Gas**
   ```
   Minimum: 0.01 ETH
   Recommended: 0.05+ ETH
   Get from: https://sepolia-faucet.lisk.com
   ```

3. **Contract Addresses Sudah di .env**
   ```bash
   NEXT_PUBLIC_VOTING_TOKEN_ADDRESS="0x1C949e163CA26b5FbdbD0CA9666062A1D6B94dd2"
   NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS="0xE8B821494E9c1b1Fb5C3C0504D4BA69F3Ec6D093"
   NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS="0x0e379D9E718b4F0E87DFA48b8c15bAF3440F0bfF"
   ```

4. **Private Key di .env**
   ```bash
   PRIVATE_KEY="your_private_key_here_without_0x_prefix"
   ```

---

## 3. Method 1: Using Scripts (Recommended)

### 📝 Step 1: Check Current Balances

```bash
node scripts/check-balance.js
```

**Output Example:**
```
💰 Checking Balances on Lisk Sepolia...

📝 Checking address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
═══════════════════════════════════════════════

🔷 ETH Balance (for gas):
   0.15 ETH
   ✅ Sufficient for transactions

🪙 VotingToken Balance:
   1000000.0 tokens
   Total Supply: 1000000.0 tokens
   ✅ You are the owner (can mint)

✅ Balance check completed!
```

---

### 🪙 Step 2: Mint Tokens

Ada 3 cara minting di script `scripts/mint-tokens.js`:

#### **Option A: Single Mint (Untuk 1 Voter)**

1. Edit file [scripts/mint-tokens.js](scripts/mint-tokens.js:47-48):
```javascript
// Line 47-48
const SINGLE_RECIPIENT = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"; // Address voter
const SINGLE_AMOUNT = ethers.parseEther("100"); // 100 tokens
```

2. Uncomment baris 52-55:
```javascript
const tx1 = await votingToken.mint(SINGLE_RECIPIENT, SINGLE_AMOUNT);
console.log("⏳ Transaction sent:", tx1.hash);
await tx1.wait();
console.log("✅ Single mint successful!\n");
```

3. Run script:
```bash
npx hardhat run scripts/mint-tokens.js --network liskSepolia
```

**Expected Output:**
```
🪙 VotingToken Minting Script

🔑 Using account: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
📄 VotingToken contract: 0x1C949e163CA26b5FbdbD0CA9666062A1D6B94dd2
✅ Ownership verified

📋 OPTION 1: Single Mint
─────────────────────────
Recipient: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Amount: 100.0 tokens

⏳ Transaction sent: 0xabc123...
✅ Single mint successful!
```

---

#### **Option B: Batch Mint (Untuk Banyak Voters - Lebih Efisien)**

1. Edit file [scripts/mint-tokens.js](scripts/mint-tokens.js:66-71):
```javascript
// Line 66-71
const RECIPIENTS = [
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",  // Voter 1
  "0x123456789abcdef123456789abcdef123456789",  // Voter 2
  "0x987654321fedcba987654321fedcba987654321",  // Voter 3
  // Tambah lebih banyak addresses...
];
```

2. Uncomment baris 88-91:
```javascript
const tx2 = await votingToken.batchMint(RECIPIENTS, AMOUNTS);
console.log("⏳ Transaction sent:", tx2.hash);
await tx2.wait();
console.log("✅ Batch mint successful!\n");
```

3. Run script:
```bash
npx hardhat run scripts/mint-tokens.js --network liskSepolia
```

**Why Batch Mint?**
- ✅ **Gas Efficient**: 1 transaction untuk banyak voters (hemat gas!)
- ✅ **Time Saving**: Tidak perlu kirim transaction berkali-kali
- ✅ **Less Error**: Satu kali execute untuk semua

**Cost Comparison:**
```
Single Mint 10 voters: ~10 transactions × 50,000 gas = 500,000 gas
Batch Mint 10 voters:   1 transaction × 150,000 gas = 150,000 gas
                        💰 HEMAT 70% GAS!
```

---

#### **Option C: Custom Amounts (Berbeda-beda per Voter)**

1. Edit file [scripts/mint-tokens.js](scripts/mint-tokens.js:97-108):
```javascript
// Line 97-108
const CUSTOM_RECIPIENTS = [
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",  // Voter 1
  "0x123456789abcdef123456789abcdef123456789",  // Voter 2
  "0x987654321fedcba987654321fedcba987654321",  // Voter 3
];

const CUSTOM_AMOUNTS = [
  ethers.parseEther("50"),   // 50 tokens untuk voter 1
  ethers.parseEther("100"),  // 100 tokens untuk voter 2
  ethers.parseEther("150"),  // 150 tokens untuk voter 3
];
```

2. Uncomment baris 117-120:
```javascript
const tx3 = await votingToken.batchMint(CUSTOM_RECIPIENTS, CUSTOM_AMOUNTS);
console.log("⏳ Transaction sent:", tx3.hash);
await tx3.wait();
console.log("✅ Custom batch mint successful!\n");
```

3. Run script:
```bash
npx hardhat run scripts/mint-tokens.js --network liskSepolia
```

---

### 🔍 Step 3: Verify Minting

```bash
node scripts/check-balance.js
```

Atau check specific address (edit [scripts/check-balance.js](scripts/check-balance.js:124)):
```javascript
// Uncomment lines 124-141
const CHECK_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
console.log(`\n📊 Checking specific address: ${CHECK_ADDRESS}`);
// ...
```

---

## 4. Method 2: Using Blockscout UI

### 🌐 Manual Minting via Blockscout

**Kapan Gunakan Method Ini?**
- Tidak ada akses ke terminal/scripts
- Hanya perlu mint sekali saja
- Ingin lihat UI yang user-friendly

---

### 📝 Step-by-Step Blockscout Minting

#### **Step 1: Open Contract on Blockscout**

1. Buka: https://sepolia-blockscout.lisk.com/address/0x1C949e163CA26b5FbdbD0CA9666062A1D6B94dd2
2. Klik tab **"Contract"**
3. Klik sub-tab **"Write Contract"**

![Blockscout Write Contract](https://via.placeholder.com/800x200?text=Blockscout+Write+Contract+Tab)

---

#### **Step 2: Connect Wallet**

1. Klik button **"Connect Wallet"** di pojok kanan atas
2. Pilih **MetaMask**
3. Approve connection
4. Pastikan network adalah **Lisk Sepolia (Chain ID: 4202)**

✅ **Berhasil connect** jika muncul address kamu di button

---

#### **Step 3: Mint Tokens**

##### **Option A: Single Mint**

1. Scroll ke function **`mint`**
2. Expand function dengan klik nama function
3. Fill in parameters:
   ```
   to (address): 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   amount (uint256): 100000000000000000000
                     ↑ Ini adalah 100 tokens dalam wei (100 × 10^18)
   ```

   **💡 Conversion Helper:**
   ```
   1 token    = 1000000000000000000 (1 × 10^18)
   10 tokens  = 10000000000000000000
   100 tokens = 100000000000000000000
   ```

   **Or use this calculator:**
   ```javascript
   // Di browser console
   (100 * 10**18).toString()
   // Output: "100000000000000000000"
   ```

4. Klik **"Write"**
5. MetaMask popup akan muncul
6. Review gas fee (sekitar 0.0001-0.001 ETH)
7. Klik **"Confirm"**
8. Wait for confirmation (~3-5 seconds)

✅ **Success** jika muncul green notification "Transaction successful"

---

##### **Option B: Batch Mint**

1. Scroll ke function **`batchMint`**
2. Expand function
3. Fill in parameters:
   ```
   recipients (address[]): ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","0x123456789abcdef123456789abcdef123456789"]

   amounts (uint256[]): ["100000000000000000000","100000000000000000000"]
   ```

   **⚠️ IMPORTANT:**
   - Array format: `["item1","item2","item3"]`
   - No spaces after commas
   - Must use quotes for each item
   - recipients.length === amounts.length

4. Klik **"Write"**
5. Confirm di MetaMask
6. Wait for confirmation

---

#### **Step 4: Verify Transaction**

1. Setelah transaction confirmed, scroll ke atas
2. Lihat notification atau klik transaction hash
3. Di transaction details, lihat:
   - **Status**: ✅ Success
   - **From**: Your address (owner)
   - **To**: VotingToken contract
   - **Logs**: Akan ada `Transfer` event

---

#### **Step 5: Check Balance**

1. Klik tab **"Read Contract"**
2. Scroll ke function **`balanceOf`**
3. Input address yang di-mint:
   ```
   account (address): 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   ```
4. Klik **"Query"**
5. Lihat result (dalam wei, divide by 10^18 untuk get token amount)

**Example:**
```
Query Result: 100000000000000000000
÷ 10^18 = 100 tokens ✅
```

---

### 🔥 Burning via Blockscout

**⚠️ Note:** Burning biasanya **OTOMATIS** terjadi saat user vote. Manual burning jarang diperlukan.

#### **If You Need to Burn Manually:**

##### **Option A: Burn Your Own Tokens**

1. Tab **"Write Contract"**
2. Function **`burn`**
3. Parameters:
   ```
   amount (uint256): 100000000000000000000
                     ↑ 100 tokens
   ```
4. Write → Confirm

##### **Option B: Burn from Another Address (Owner Only)**

1. Function **`burnFrom`**
2. Parameters:
   ```
   from (address): 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   amount (uint256): 100000000000000000000
   ```
3. Write → Confirm

**⚠️ IMPORTANT:**
- Target address **must have approved** your address to burn their tokens
- Or you must be the owner
- Used automatically by VotingSystem when user votes

---

## 5. Method 3: Using Hardhat Console

### 🖥️ Interactive Console (For Advanced Users)

```bash
npx hardhat console --network liskSepolia
```

**In console:**

```javascript
// 1. Get contract instance
const VotingToken = await ethers.getContractFactory("VotingToken");
const votingToken = VotingToken.attach("0x1C949e163CA26b5FbdbD0CA9666062A1D6B94dd2");

// 2. Check your balance
const [signer] = await ethers.getSigners();
const balance = await votingToken.balanceOf(signer.address);
console.log("Balance:", ethers.formatEther(balance), "tokens");

// 3. Mint to address
const recipient = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
const amount = ethers.parseEther("100");
const tx = await votingToken.mint(recipient, amount);
await tx.wait();
console.log("✅ Minted 100 tokens to", recipient);

// 4. Check new balance
const newBalance = await votingToken.balanceOf(recipient);
console.log("New balance:", ethers.formatEther(newBalance), "tokens");

// 5. Batch mint
const recipients = [
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "0x123456789abcdef123456789abcdef123456789"
];
const amounts = recipients.map(() => ethers.parseEther("100"));
const tx2 = await votingToken.batchMint(recipients, amounts);
await tx2.wait();
console.log("✅ Batch minted to", recipients.length, "addresses");

// 6. Check total supply
const totalSupply = await votingToken.totalSupply();
console.log("Total Supply:", ethers.formatEther(totalSupply), "tokens");

// Exit console
.exit
```

---

## 6. Common Use Cases

### 🎯 Use Case 1: Prepare for New Voting Event

**Scenario:** Kamu punya list 50 eligible voters untuk event "Presidential Election 2024"

**Solution:** Batch Mint

```javascript
// 1. Collect addresses (dari database atau whitelist)
const voters = [
  "0x111...",
  "0x222...",
  "0x333...",
  // ... 47 more
];

// 2. Each voter gets 5 tokens (dapat vote 5x)
const amounts = voters.map(() => ethers.parseEther("5"));

// 3. Batch mint
const tx = await votingToken.batchMint(voters, amounts);
await tx.wait();

// 4. Verify
console.log(`✅ Distributed ${5 * voters.length} tokens to ${voters.length} voters`);
```

**Gas Cost:** ~$0.50-2.00 untuk 50 voters (vs $25-100 for 50 single transactions)

---

### 🎯 Use Case 2: Add New Voter Mid-Event

**Scenario:** Event sudah running, ada 1 voter baru perlu ditambah

**Solution:** Single Mint via Blockscout

1. Open Blockscout Write Contract
2. Function `mint`
3. Parameters:
   - `to`: New voter address
   - `amount`: `100000000000000000000` (100 tokens)
4. Write → Confirm

Fast, simple, UI-friendly ✅

---

### 🎯 Use Case 3: Reward Active Voters

**Scenario:** Give bonus tokens to top 10 most active voters

**Solution:** Custom Amount Batch Mint

```javascript
const topVoters = [
  "0xaaa...", // Rank 1 → 50 tokens
  "0xbbb...", // Rank 2 → 40 tokens
  "0xccc...", // Rank 3 → 30 tokens
  // ...
];

const bonusAmounts = [
  ethers.parseEther("50"),
  ethers.parseEther("40"),
  ethers.parseEther("30"),
  // ...
];

const tx = await votingToken.batchMint(topVoters, bonusAmounts);
await tx.wait();
```

---

### 🎯 Use Case 4: Emergency Token Recovery

**Scenario:** User accidentally sent tokens to wrong address, need to fix

**Solution:**
1. **Check if tokens still there:**
```javascript
const wrongAddress = "0xwrong...";
const balance = await votingToken.balanceOf(wrongAddress);
console.log("Stuck tokens:", ethers.formatEther(balance));
```

2. **If you control that address:**
```javascript
// Transfer from wrong address to correct address
const correctAddress = "0xcorrect...";
const tx = await votingToken.connect(wrongAddressSigner).transfer(correctAddress, balance);
await tx.wait();
```

3. **If you DON'T control that address (lost forever):**
```javascript
// Just mint new tokens to correct address
const tx = await votingToken.mint(correctAddress, balance);
await tx.wait();
// Note: This increases total supply
```

---

## 7. Troubleshooting

### ❌ Error: "Ownable: caller is not the owner"

**Cause:** Kamu bukan owner contract

**Solution:**
```bash
# 1. Check who is owner
node scripts/check-balance.js
# Look for owner address

# 2. Make sure .env PRIVATE_KEY matches owner account
# 3. Or, transfer ownership:
```

```javascript
const newOwner = "0xYourNewOwnerAddress";
const tx = await votingToken.transferOwnership(newOwner);
await tx.wait();
```

---

### ❌ Error: "ERC20: mint to the zero address"

**Cause:** Recipient address adalah `0x0000...` atau invalid

**Solution:**
- Check address format: Must be 42 characters (0x + 40 hex)
- Tidak boleh `0x0000000000000000000000000000000000000000`
- Copy paste dengan hati-hati (no extra spaces)

---

### ❌ Error: "Array length mismatch"

**Cause:** Batch mint dengan recipients.length ≠ amounts.length

**Solution:**
```javascript
// ❌ Wrong
const recipients = ["0xaaa", "0xbbb", "0xccc"]; // 3 items
const amounts = [100, 200]; // 2 items

// ✅ Correct
const recipients = ["0xaaa", "0xbbb", "0xccc"]; // 3 items
const amounts = [
  ethers.parseEther("100"),
  ethers.parseEther("100"),
  ethers.parseEther("100")
]; // 3 items
```

---

### ❌ Error: "Insufficient gas"

**Cause:** Tidak cukup ETH untuk gas fee

**Solution:**
```bash
# 1. Check ETH balance
node scripts/check-balance.js

# 2. If low, get testnet ETH
# Go to: https://sepolia-faucet.lisk.com
# Input your address
# Wait 1-2 minutes

# 3. Verify received
node scripts/check-balance.js
```

---

### ❌ Error: "Transaction underpriced"

**Cause:** Gas price terlalu rendah

**Solution:**
```javascript
// Add gas parameters manually
const tx = await votingToken.mint(recipient, amount, {
  gasLimit: 100000,
  gasPrice: ethers.parseUnits("20", "gwei")
});
```

Or wait a few minutes and try again (network congestion)

---

### ❌ Error: "Nonce too low"

**Cause:** Transaction conflict or pending transaction

**Solution:**
```bash
# 1. Wait for pending transaction to complete
# 2. Or reset account in MetaMask:
#    Settings → Advanced → Reset Account
# 3. Try again
```

---

### ⚠️ Warning: "Max supply exceeded"

**Cause:** Trying to mint more than MAX_SUPPLY (1 billion tokens)

**Check:**
```javascript
const maxSupply = await votingToken.MAX_SUPPLY();
const currentSupply = await votingToken.totalSupply();
const available = maxSupply - currentSupply;
console.log("Available to mint:", ethers.formatEther(available));
```

**Solution:**
- Mint less tokens
- Or modify contract to increase MAX_SUPPLY (requires redeployment)

---

## 📊 Minting Best Practices

### ✅ DO's

1. **Always Check Balance First**
   ```bash
   node scripts/check-balance.js
   ```

2. **Use Batch Mint for Multiple Recipients**
   - Save gas (up to 70%)
   - Faster execution
   - Less error-prone

3. **Verify Transaction on Blockscout**
   - Check status is "Success"
   - Verify correct amount minted
   - Save transaction hash for records

4. **Keep Records**
   ```javascript
   // Log minting activity
   console.log(`Minted ${amount} tokens to ${recipient} at ${new Date()}`);
   // Save to CSV or database
   ```

5. **Test on Small Amount First**
   ```javascript
   // First time? Test dengan 1 token dulu
   const testAmount = ethers.parseEther("1");
   ```

---

### ❌ DON'Ts

1. **Don't Mint to Zero Address**
   ```javascript
   // ❌ BAD
   await votingToken.mint("0x0000000000000000000000000000000000000000", amount);
   ```

2. **Don't Hardcode Private Keys**
   ```javascript
   // ❌ BAD
   const privateKey = "0x1234567890abcdef...";

   // ✅ GOOD - Use .env
   const privateKey = process.env.PRIVATE_KEY;
   ```

3. **Don't Ignore Gas Estimates**
   ```javascript
   // Check gas estimate first
   const gasEstimate = await votingToken.mint.estimateGas(recipient, amount);
   console.log("Estimated gas:", gasEstimate.toString());
   ```

4. **Don't Mint Without Verification**
   - Always verify owner first
   - Check recipient address is valid
   - Verify amount is correct (beware of decimals!)

5. **Don't Spam Transactions**
   - Wait for previous transaction to confirm
   - Use batch operations instead of multiple single mints

---

## 🎓 Quick Reference

### Token Decimals Conversion

```
Human Readable → Wei (Smart Contract Format)
─────────────────────────────────────────────
1 token        → 1000000000000000000
10 tokens      → 10000000000000000000
100 tokens     → 100000000000000000000
1000 tokens    → 1000000000000000000000

Wei → Human Readable
─────────────────────────────────────────────
1000000000000000000 → 1 token
```

**JavaScript Helper:**
```javascript
// To wei
ethers.parseEther("100") // "100000000000000000000"

// From wei
ethers.formatEther("100000000000000000000") // "100.0"
```

---

### Quick Commands Cheat Sheet

```bash
# Check balances
node scripts/check-balance.js

# Mint tokens (after editing script)
npx hardhat run scripts/mint-tokens.js --network liskSepolia

# Test interaction
npx hardhat run scripts/test-interaction.js --network liskSepolia

# Compile contracts (if modified)
npx hardhat compile

# Open console
npx hardhat console --network liskSepolia
```

---

### Contract Addresses (Quick Copy)

```bash
VotingToken:       0x1C949e163CA26b5FbdbD0CA9666062A1D6B94dd2
VoterBadgeNFT:     0xE8B821494E9c1b1Fb5C3C0504D4BA69F3Ec6D093
VotingSystem:      0x0e379D9E718b4F0E87DFA48b8c15bAF3440F0bfF

Blockscout:        https://sepolia-blockscout.lisk.com
RPC:               https://rpc.sepolia-api.lisk.com
Chain ID:          4202
Faucet:            https://sepolia-faucet.lisk.com
```

---

## 🎯 Summary

**Minting Options:**
1. ✅ **Scripts** (Recommended) - Automated, efficient, repeatable
2. 🌐 **Blockscout UI** - User-friendly, good for one-time mints
3. 🖥️ **Hardhat Console** - Advanced, for developers

**When to Mint:**
- Before voting events (distribute to voters)
- Add new eligible voters
- Reward mechanisms
- Testing

**Burning:**
- ✅ Happens automatically when user votes
- Rarely need manual burning
- Reduces total supply permanently

**Key Takeaway:**
- Use **batch mint** for efficiency (save up to 70% gas)
- Always **verify** ownership before minting
- **Check balances** before and after minting
- Keep **transaction records** for auditing

---

**Need Help?**
- Check [CONTRACTS_README.md](CONTRACTS_README.md) for full API
- See [DEMO_DAY_PRESENTATION.md](DEMO_DAY_PRESENTATION.md) for system overview
- Review [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) for frontend usage

Happy Minting! 🪙🚀
