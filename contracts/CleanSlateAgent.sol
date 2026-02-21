// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// A self-sustaining AI agent smart wallet on Base Sepolia
// Demonstrates the autonomous economic model: employers pay, individuals get free help
// Based on the ERC-4337 SimpleAccount concept (simplified for hackathon)

import "@openzeppelin/contracts/access/Ownable.sol";

contract CleanSlateAgent is Ownable {

    // Track agent activity
    uint256 public individualsHelped;
    uint256 public employerAssessments;
    uint256 public totalRevenue;
    uint256 public totalExpenses;

    event IndividualHelped(address indexed sessionHash, uint256 timestamp);
    event EmployerAssessment(address indexed employer, uint256 amount, uint256 timestamp);
    event ExpensePaid(address indexed recipient, uint256 amount, string reason);

    constructor() Ownable(msg.sender) {}

    // Receive payments from employers
    receive() external payable {
        employerAssessments++;
        totalRevenue += msg.value;
        emit EmployerAssessment(msg.sender, msg.value, block.timestamp);
    }

    // Log when an individual is helped (called by backend)
    function logIndividualHelped(bytes32 sessionHash) external onlyOwner {
        individualsHelped++;
        emit IndividualHelped(address(uint160(uint256(sessionHash))), block.timestamp);
    }

    // Pay operating expenses (Claude API costs, etc.)
    function payExpense(address payable recipient, uint256 amount, string calldata reason) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        totalExpenses += amount;
        recipient.transfer(amount);
        emit ExpensePaid(recipient, amount, reason);
    }

    // View agent's financial health
    function getAgentStatus() external view returns (
        uint256 balance,
        uint256 helped,
        uint256 assessments,
        uint256 revenue,
        uint256 expenses
    ) {
        return (address(this).balance, individualsHelped, employerAssessments, totalRevenue, totalExpenses);
    }
}
