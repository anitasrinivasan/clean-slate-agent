require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ override: true });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_key_here"
        ? [process.env.PRIVATE_KEY]
        : [],
      chainId: 84532,
    },
  },
};
