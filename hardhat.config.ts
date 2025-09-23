import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";
import { config as dotenvConfig } from "dotenv";

import "./tasks/accounts";
import "./tasks/PrivateGradeSystem";

// Load environment variables
dotenvConfig();

const PRIVATE_KEY: string = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000001";
const INFURA_API_KEY: string = process.env.INFURA_API_KEY || "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    sepolia: {
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      // Use Blast public endpoint to avoid provider timeouts
      url: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.public.blastapi.io',
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
