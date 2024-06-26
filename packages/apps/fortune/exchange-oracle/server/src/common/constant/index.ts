import { ChainId } from '@human-protocol/sdk';

export const HEADER_SIGNATURE_KEY = 'human-signature';
export const NS = 'hmt';
export const TOKEN = 'HMT';
export const DEFAULT_MAX_RETRY_COUNT = 5;

export const LOCALHOST_CHAIN_IDS = [ChainId.LOCALHOST];

export const TESTNET_CHAIN_IDS = [
  ChainId.POLYGON_MUMBAI,
  ChainId.BSC_TESTNET,
  ChainId.GOERLI,
];
export const MAINNET_CHAIN_IDS = [
  ChainId.POLYGON,
  ChainId.BSC_MAINNET,
  ChainId.MOONBEAM,
];

export const JWT_KVSTORE_KEY = 'jwt_public_key';
export const KYC_APPROVED = 'APPROVED';
