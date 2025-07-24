// Web3 Wallet Dashboard JavaScript

// Global variables
let web3;
let userAccount;
let isConnected = false;

// DOM Elements
const connectWalletBtn = document.getElementById('connect-wallet');
const disconnectWalletBtn = document.getElementById('disconnect-wallet');
const retryConnectionBtn = document.getElementById('retry-connection');
const themeToggle = document.getElementById('theme-toggle');

// State elements
const notConnectedState = document.getElementById('not-connected');
const connectingState = document.getElementById('connecting');
const connectionErrorState = document.getElementById('connection-error');
const walletDashboard = document.getElementById('wallet-dashboard');
const errorMessage = document.getElementById('error-message');

// Wallet info elements
const walletAddress = document.getElementById('wallet-address');
const ethBalance = document.getElementById('eth-balance');
const ethUsdValue = document.getElementById('eth-usd-value');
const currentNetwork = document.getElementById('current-network');
const networkStatus = document.getElementById('network-status');
const networkName = document.getElementById('network-name');

// Transaction elements
const sendForm = document.getElementById('send-form');
const recipientAddress = document.getElementById('recipient-address');
const sendAmount = document.getElementById('send-amount');
const sendButton = document.getElementById('send-button');

// Action buttons
const refreshBalanceBtn = document.getElementById('refresh-balance');
const viewEtherscanBtn = document.getElementById('view-etherscan');
const addTokenBtn = document.getElementById('add-token');
const refreshTransactionsBtn = document.getElementById('refresh-transactions');
const copyAddressBtn = document.getElementById('copy-address');

// Transaction list elements
const transactionsList = document.getElementById('transactions-list');
const transactionsLoading = document.getElementById('transactions-loading');
const noTransactions = document.getElementById('no-transactions');

// Transaction modal elements
const transactionModal = document.getElementById('transaction-modal');
const txStatusIcon = document.getElementById('tx-status-icon');
const txStatusTitle = document.getElementById('tx-status-title');
const txStatusMessage = document.getElementById('tx-status-message');
const txHashSection = document.getElementById('tx-hash-section');
const txHash = document.getElementById('tx-hash');
const closeTxModal = document.getElementById('close-tx-modal');

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('web3-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
  
  if (shouldBeDark) {
    document.documentElement.classList.add('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('web3-theme', isDark ? 'dark' : 'light');
}

// Utility Functions
function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatEther(wei) {
  return web3.utils.fromWei(wei, 'ether');
}

function showState(state) {
  // Hide all states
  notConnectedState.classList.add('hidden');
  connectingState.classList.add('hidden');
  connectionErrorState.classList.add('hidden');
  walletDashboard.classList.add('hidden');
  
  // Show requested state
  switch(state) {
    case 'not-connected':
      notConnectedState.classList.remove('hidden');
      break;
    case 'connecting':
      connectingState.classList.remove('hidden');
      break;
    case 'error':
      connectionErrorState.classList.remove('hidden');
      break;
    case 'connected':
      walletDashboard.classList.remove('hidden');
      networkStatus.classList.remove('hidden');
      break;
  }
}

function showError(message) {
  errorMessage.textContent = message;
  showState('error');
}

function showTransactionModal(status, title, message, hash = null) {
  const icons = {
    pending: '⏳',
    success: '✅',
    error: '❌'
  };
  
  txStatusIcon.textContent = icons[status] || '⏳';
  txStatusTitle.textContent = title;
  txStatusMessage.textContent = message;
  
  if (hash) {
    txHash.textContent = hash;
    txHashSection.classList.remove('hidden');
  } else {
    txHashSection.classList.add('hidden');
  }
  
  transactionModal.classList.remove('hidden');
}

function hideTransactionModal() {
  transactionModal.classList.add('hidden');
}

// Web3 Connection Functions
async function checkMetaMaskInstalled() {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }
  
  if (!window.ethereum.isMetaMask) {
    throw new Error('Please use MetaMask to connect your wallet.');
  }
}

async function connectWallet() {
  try {
    showState('connecting');
    
    await checkMetaMaskInstalled();
    
    // Initialize Web3
    web3 = new Web3(window.ethereum);
    
    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    
    if (accounts.length === 0) {
      throw new Error('No accounts found. Please make sure MetaMask is unlocked.');
    }
    
    userAccount = accounts[0];
    isConnected = true;
    
    // Update UI
    await updateWalletInfo();
    await loadTransactions();
    showState('connected');
    
    console.log('✅ Wallet connected successfully:', userAccount);
    
  } catch (error) {
    console.error('Connection error:', error);
    
    if (error.code === 4001) {
      showError('Connection rejected. Please approve the connection in MetaMask.');
    } else if (error.code === -32002) {
      showError('Connection request pending. Please check MetaMask.');
    } else {
      showError(error.message || 'Failed to connect to MetaMask. Please try again.');
    }
  }
}

function disconnectWallet() {
  userAccount = null;
  isConnected = false;
  web3 = null;
  
  // Clear UI
  walletAddress.textContent = '0x...';
  ethBalance.textContent = '0.0000';
  ethUsdValue.textContent = '$0.00 USD';
  transactionsList.innerHTML = '';
  
  showState('not-connected');
  console.log('👋 Wallet disconnected');
}

// Wallet Info Functions
async function updateWalletInfo() {
  try {
    // Update address display
    walletAddress.textContent = shortenAddress(userAccount);
    
    // Get ETH balance
    const balance = await web3.eth.getBalance(userAccount);
    const ethAmount = formatEther(balance);
    ethBalance.textContent = parseFloat(ethAmount).toFixed(4);
    
    // Get ETH price (simplified - in production, use CoinGecko API)
    const ethPrice = await getEthPrice();
    const usdValue = (parseFloat(ethAmount) * ethPrice).toFixed(2);
    ethUsdValue.textContent = `$${usdValue} USD`;
    
    // Get network info
    const networkId = await web3.eth.net.getId();
    const networkInfo = getNetworkInfo(networkId);
    currentNetwork.textContent = networkInfo.name;
    networkName.textContent = networkInfo.name;
    
    console.log('📊 Wallet info updated');
    
  } catch (error) {
    console.error('Error updating wallet info:', error);
  }
}

async function getEthPrice() {
  try {
    // This is a simplified version - in production, use a proper API
    // For demo purposes, we'll return a mock price
    return 2000; // Mock ETH price in USD
    
    /* Real implementation would be:
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await response.json();
    return data.ethereum.usd;
    */
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    return 2000; // Fallback price
  }
}

function getNetworkInfo(networkId) {
  const networks = {
    1: { name: 'Ethereum Mainnet', explorer: 'https://etherscan.io' },
    5: { name: 'Goerli Testnet', explorer: 'https://goerli.etherscan.io' },
    11155111: { name: 'Sepolia Testnet', explorer: 'https://sepolia.etherscan.io' },
    137: { name: 'Polygon', explorer: 'https://polygonscan.com' }
  };
  
  return networks[networkId] || { name: 'Unknown Network', explorer: '#' };
}

// Transaction Functions
async function sendTransaction(to, amount) {
  try {
    const amountWei = web3.utils.toWei(amount.toString(), 'ether');
    
    // Estimate gas
    const gasEstimate = await web3.eth.estimateGas({
      from: userAccount,
      to: to,
      value: amountWei
    });
    
    // Get gas price
    const gasPrice = await web3.eth.getGasPrice();
    
    // Send transaction
    const txHash = await web3.eth.sendTransaction({
      from: userAccount,
      to: to,
      value: amountWei,
      gas: gasEstimate,
      gasPrice: gasPrice
    });
    
    return txHash;
    
  } catch (error) {
    throw error;
  }
}

async function loadTransactions() {
  try {
    transactionsLoading.classList.remove('hidden');
    noTransactions.classList.add('hidden');
    
    // Get latest block
    const latestBlock = await web3.eth.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 1000); // Last ~1000 blocks
    
    // This is a simplified version - in production, you'd use an API like Etherscan
    // For demo purposes, we'll show mock transactions
    const mockTransactions = [
      {
        hash: '0x1234...5678',
        from: '0xabcd...efgh',
        to: userAccount,
        value: '0.1',
        type: 'received',
        status: 'success',
        timestamp: Date.now() - 3600000 // 1 hour ago
      },
      {
        hash: '0x8765...4321',
        from: userAccount,
        to: '0x1111...2222',
        value: '0.05',
        type: 'sent',
        status: 'success',
        timestamp: Date.now() - 7200000 // 2 hours ago
      }
    ];
    
    displayTransactions(mockTransactions);
    
  } catch (error) {
    console.error('Error loading transactions:', error);
    noTransactions.classList.remove('hidden');
  } finally {
    transactionsLoading.classList.add('hidden');
  }
}

function displayTransactions(transactions) {
  transactionsList.innerHTML = '';
  
  if (transactions.length === 0) {
    noTransactions.classList.remove('hidden');
    return;
  }
  
  transactions.forEach(tx => {
    const txElement = document.createElement('div');
    txElement.className = 'transaction-item';
    
    const typeIcon = tx.type === 'sent' ? '📤' : '📥';
    const typeColor = tx.type === 'sent' ? 'text-red-400' : 'text-green-400';
    const statusClass = `status-${tx.status}`;
    
    txElement.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex items-center space-x-3">
          <div class="text-2xl">${typeIcon}</div>
          <div>
            <div class="font-medium ${typeColor}">${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</div>
            <div class="text-sm text-gray-400">
              ${tx.type === 'sent' ? 'To' : 'From'}: ${shortenAddress(tx.type === 'sent' ? tx.to : tx.from)}
            </div>
            <div class="text-xs text-gray-500">
              ${new Date(tx.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
        <div class="text-right">
          <div class="font-bold ${typeColor}">
            ${tx.type === 'sent' ? '-' : '+'}${tx.value} ETH
          </div>
          <div class="text-xs ${statusClass} capitalize">${tx.status}</div>
        </div>
      </div>
    `;
    
    // Add click handler to view on explorer
    txElement.addEventListener('click', () => {
      const networkId = 1; // Simplified
      const explorer = getNetworkInfo(networkId).explorer;
      window.open(`${explorer}/tx/${tx.hash}`, '_blank');
    });
    
    transactionsList.appendChild(txElement);
  });
}

// Event Listeners
function setupEventListeners() {
  // Connection buttons
  connectWalletBtn.addEventListener('click', connectWallet);
  disconnectWalletBtn.addEventListener('click', disconnectWallet);
  retryConnectionBtn.addEventListener('click', connectWallet);
  
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
  // Send transaction form
  sendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const recipient = recipientAddress.value.trim();
    const amount = parseFloat(sendAmount.value);
    
    // Validation
    if (!web3.utils.isAddress(recipient)) {
      alert('Invalid recipient address');
      return;
    }
    
    if (!amount || amount <= 0) {
      alert('Invalid amount');
      return;
    }
    
    try {
      sendButton.disabled = true;
      sendButton.textContent = 'Sending...';
      
      showTransactionModal('pending', 'Sending Transaction', 'Please confirm the transaction in MetaMask...');
      
      const txHash = await sendTransaction(recipient, amount);
      
      showTransactionModal('success', 'Transaction Sent!', 'Your transaction has been broadcast to the network.', txHash);
      
      // Clear form
      recipientAddress.value = '';
      sendAmount.value = '';
      
      // Refresh data
      setTimeout(() => {
        updateWalletInfo();
        loadTransactions();
      }, 2000);
      
    } catch (error) {
      console.error('Transaction error:', error);
      
      let errorMsg = 'Transaction failed. Please try again.';
      if (error.code === 4001) {
        errorMsg = 'Transaction rejected by user.';
      } else if (error.message.includes('insufficient funds')) {
        errorMsg = 'Insufficient funds for transaction.';
      }
      
      showTransactionModal('error', 'Transaction Failed', errorMsg);
      
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = 'Send Transaction';
    }
  });
  
  // Action buttons
  refreshBalanceBtn.addEventListener('click', updateWalletInfo);
  
  viewEtherscanBtn.addEventListener('click', () => {
    const networkId = 1; // Simplified
    const explorer = getNetworkInfo(networkId).explorer;
    window.open(`${explorer}/address/${userAccount}`, '_blank');
  });
  
  addTokenBtn.addEventListener('click', () => {
    alert('Token management feature coming soon!');
  });
  
  refreshTransactionsBtn.addEventListener('click', loadTransactions);
  
  copyAddressBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(userAccount);
      copyAddressBtn.textContent = '✅';
      setTimeout(() => {
        copyAddressBtn.textContent = '📋';
      }, 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  });
  
  // Modal close
  closeTxModal.addEventListener('click', hideTransactionModal);
  
  // Close modal on outside click
  transactionModal.addEventListener('click', (e) => {
    if (e.target === transactionModal) {
      hideTransactionModal();
    }
  });
}

// MetaMask Event Listeners
function setupMetaMaskListeners() {
  if (typeof window.ethereum !== 'undefined') {
    // Account changed
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== userAccount) {
        userAccount = accounts[0];
        if (isConnected) {
          updateWalletInfo();
          loadTransactions();
        }
      }
    });
    
    // Network changed
    window.ethereum.on('chainChanged', (chainId) => {
      if (isConnected) {
        updateWalletInfo();
        loadTransactions();
      }
    });
    
    // Connection changed
    window.ethereum.on('connect', (connectInfo) => {
      console.log('MetaMask connected:', connectInfo);
    });
    
    window.ethereum.on('disconnect', (error) => {
      console.log('MetaMask disconnected:', error);
      disconnectWallet();
    });
  }
}

// Auto-connect if previously connected
async function autoConnect() {
  try {
    if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length > 0) {
        web3 = new Web3(window.ethereum);
        userAccount = accounts[0];
        isConnected = true;
        
        await updateWalletInfo();
        await loadTransactions();
        showState('connected');
        
        console.log('🔄 Auto-connected to wallet:', userAccount);
      }
    }
  } catch (error) {
    console.error('Auto-connect failed:', error);
  }
}

// System theme change listener
function initSystemThemeListener() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('web3-theme')) {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  });
}

// Initialize Application
async function initApp() {
  console.log('🔗 Web3 Wallet Dashboard Initialized');
  
  // Initialize theme
  initTheme();
  
  // Setup event listeners
  setupEventListeners();
  setupMetaMaskListeners();
  initSystemThemeListener();
  
  // Try to auto-connect
  await autoConnect();
  
  console.log('✅ Web3 Dashboard ready!');
  
  // Development hints
  console.log(`
    🚀 Development Tips:
    
    1. Make sure MetaMask is installed and unlocked
    2. Use testnet (Goerli/Sepolia) for testing
    3. Get testnet ETH from faucets for testing
    4. Check browser console for detailed logs
    
    Ready to connect your wallet!
  `);
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
