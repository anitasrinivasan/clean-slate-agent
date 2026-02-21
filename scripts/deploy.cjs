const hre = require("hardhat");

async function main() {
  console.log("Deploying CleanSlateAgent to Base Sepolia...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

  const CleanSlateAgent = await hre.ethers.getContractFactory("CleanSlateAgent");
  const agent = await CleanSlateAgent.deploy();
  await agent.waitForDeployment();

  const address = await agent.getAddress();
  console.log("CleanSlateAgent deployed to:", address);
  console.log("\n---");
  console.log("Add this to your .env file:");
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log("\nView on BaseScan:");
  console.log(`https://sepolia.basescan.org/address/${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
