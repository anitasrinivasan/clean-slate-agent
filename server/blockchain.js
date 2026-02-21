/**
 * Blockchain integration for Base Sepolia
 * Handles smart contract interaction and agent wallet management
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const CONTRACT_ABI = [
  'function logIndividualHelped(bytes32 sessionHash) external',
  'function payExpense(address payable recipient, uint256 amount, string calldata reason) external',
  'function getAgentStatus() external view returns (uint256 balance, uint256 helped, uint256 assessments, uint256 revenue, uint256 expenses)',
  'function individualsShelped() external view returns (uint256)',
  'function employerAssessments() external view returns (uint256)',
  'function totalRevenue() external view returns (uint256)',
  'function totalExpenses() external view returns (uint256)',
  'function owner() external view returns (address)',
  'event IndividualHelped(address indexed sessionHash, uint256 timestamp)',
  'event EmployerAssessment(address indexed employer, uint256 amount, uint256 timestamp)',
  'event ExpensePaid(address indexed recipient, uint256 amount, string reason)',
];

let provider = null;
let wallet = null;
let contract = null;
let contractAddress = null;

/**
 * Initialize blockchain connection
 */
export function initBlockchain(deployedContractAddress) {
  try {
    const rpcUrl = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
    provider = new ethers.JsonRpcProvider(rpcUrl);

    if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== 'your_key_here') {
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      console.log(`  Wallet address: ${wallet.address}`);
    } else {
      console.log('  ⚠ No private key configured — blockchain writes disabled');
    }

    if (deployedContractAddress) {
      contractAddress = deployedContractAddress;
      contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet || provider);
      console.log(`  Contract: ${contractAddress}`);
    }

    return true;
  } catch (e) {
    console.error('  Blockchain init failed:', e.message);
    return false;
  }
}

/**
 * Log an individual being helped on-chain
 */
export async function logIndividualHelped(sessionId) {
  if (!contract || !wallet) return null;
  try {
    const sessionHash = ethers.id(sessionId);
    const tx = await contract.logIndividualHelped(sessionHash);
    await tx.wait();
    return tx.hash;
  } catch (e) {
    console.error('logIndividualHelped failed:', e.message);
    return null;
  }
}

/**
 * Get agent status from the smart contract
 */
export async function getAgentOnChainStatus() {
  if (!contract) {
    return {
      connected: false,
      contractAddress: contractAddress || 'Not deployed',
      walletAddress: wallet?.address || 'Not configured',
      network: 'Base Sepolia',
      chainId: 84532,
    };
  }
  try {
    const [balance, helped, assessments, revenue, expenses] = await contract.getAgentStatus();
    const walletBalance = await provider.getBalance(wallet?.address || contractAddress);

    return {
      connected: true,
      contractAddress,
      walletAddress: wallet?.address || 'Not configured',
      network: 'Base Sepolia',
      chainId: 84532,
      contractBalance: ethers.formatEther(balance),
      walletBalance: ethers.formatEther(walletBalance),
      individualsHelped: Number(helped),
      employerAssessments: Number(assessments),
      totalRevenue: ethers.formatEther(revenue),
      totalExpenses: ethers.formatEther(expenses),
    };
  } catch (e) {
    console.error('getAgentOnChainStatus failed:', e.message);
    return {
      connected: true,
      contractAddress,
      walletAddress: wallet?.address || 'Not configured',
      network: 'Base Sepolia',
      chainId: 84532,
      error: e.message,
    };
  }
}

/**
 * Get recent transactions for the agent's wallet
 */
export async function getRecentTransactions() {
  if (!provider || !wallet) return [];
  try {
    const blockNumber = await provider.getBlockNumber();
    // Look back ~100 blocks
    const fromBlock = Math.max(0, blockNumber - 100);
    const filter = {
      address: contractAddress,
      fromBlock,
      toBlock: 'latest',
    };
    const logs = await provider.getLogs(filter);
    return logs.map((log) => ({
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      data: log.data,
    }));
  } catch (e) {
    return [];
  }
}

export { provider, wallet, contract, contractAddress };
