import * as dotenv from 'dotenv';

import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat';
import 'xdeployer';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-contract-sizer';
import * as tdly from '@tenderly/hardhat-tenderly';
import 'hardhat-abi-exporter';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-dependency-compiler';

dotenv.config();

// Turning off the automatic Tenderly verification
tdly.setup({ automaticVerifications: false });

task('accounts', 'Prints the list of accounts', async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    // eslint-disable-next-line no-console
    console.log(account.address);
  }
});

task(
  'balances',
  'Prints the list of accounts and their balances',
  async (_, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
      // eslint-disable-next-line no-console
      console.log(
        account.address +
          ' ' +
          (await hre.ethers.provider.getBalance(account.address))
      );
    }
  }
);

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.9',
    settings: { optimizer: { enabled: true, runs: 1000000 } },
  },
  defaultNetwork: 'hardhat',
  networks: {
    localhost: {
      url: `http://127.0.0.1:${process.env.RPC_PORT || '8545'}`,
    },
    hardhat: {
      forking: process.env.FORKING_URL
        ? {
            url: process.env.FORKING_URL,
          }
        : undefined,
      chainId: 1338,
    },
    tenderly: {
      url: `https://rpc.tenderly.co/fork/${process.env.TENDERLY_FORK_ID}`,
    },
    mainnet: {
      chainId: 1,
      url: process.env.ETH_MAINNET_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    goerli: {
      chainId: 5,
      url: process.env.ETH_GOERLI_TESTNET_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    polygon: {
      chainId: 137,
      url: process.env.ETH_POLYGON_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    polygonMumbai: {
      chainId: 80001,
      url: process.env.ETH_POLYGON_MUMBAI_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    bsc: {
      chainId: 56,
      url: process.env.ETH_BSC_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    bscTestnet: {
      chainId: 97,
      url: process.env.ETH_BSC_TESTNET_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    moonbeam: {
      chainId: 1284,
      timeout: 2000000,
      url: process.env.ETH_MOONBEAM_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    moonbaseAlpha: {
      chainId: 1287,
      timeout: 2000000,
      url: process.env.ETH_MOONBASE_ALPHA_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    avalancheTestnet: {
      chainId: 43113,
      timeout: 2000000,
      url: 'https://api.avax-test.network/ext/C/rpc',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    avalanche: {
      chainId: 43114,
      timeout: 2000000,
      url: 'https://api.avax.network/ext/bc/C/rpc',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    skale: {
      chainId: 1273227453,
      timeout: 2000000,
      url: process.env.ETH_SKALE_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
    strict: true,
    only: [],
    except: [],
  },
  abiExporter: {
    path: './abis',
    runOnCompile: true,
    clear: true,
    flat: true,
    only: [],
    spacing: 2,
    format: 'json',
  },
  etherscan: {
    apiKey: {
      // For Mainnet, Goerli
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      goerli: process.env.ETHERSCAN_API_KEY || '',
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || '',
      bsc: process.env.BSC_API_KEY || '',
      bscTestnet: process.env.BSC_API_KEY || '',
      moonbeam: process.env.MOONSCAN_API_KEY || '',
      moonbaseAlpha: process.env.MOONSCAN_API_KEY || '',
      skale: process.env.SKALE_API_KEY || '',
    },
    customChains: [
      {
        network: 'skale',
        chainId: 1273227453,
        urls: {
          apiURL: process.env.SKALE_BROWSER_API_URL || '',
          browserURL: process.env.SKALE_BROWSER_URL || '',
        },
      },
    ],
  },
  mocha: {
    timeout: 200000,
  },
  dependencyCompiler: {
    paths: ['@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol'],
  },
};

export default config;
