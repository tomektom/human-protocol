import {
  StakingClient,
  KVStoreClient,
  KVStoreKeys,
  Role,
} from '@human-protocol/sdk';
import { Wallet, ethers } from 'ethers';
import { HMToken__factory } from '@human-protocol/core/typechain-types';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export async function setup(): Promise<void> {
  const privateKey = process.env.WEB3_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Private key is empty');
  }
  const provider = new ethers.JsonRpcProvider('http://0.0.0.0:8545');
  const hmtTokenAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const stakingAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
  const wallet = new Wallet(privateKey, provider);

  const hmtContract = HMToken__factory.connect(hmtTokenAddress, wallet);
  await (
    await hmtContract.approve(stakingAddress, 1, {
      nonce: 0,
    })
  ).wait();

  const stakingClient = await StakingClient.build(wallet);
  await stakingClient.stake(BigInt(1), {
    nonce: 1,
  });
  const kvStoreClient = await KVStoreClient.build(wallet);
  await kvStoreClient.setBulk(
    [KVStoreKeys.role, KVStoreKeys.fee, KVStoreKeys.webhookUrl],
    [Role.JobLauncher, '1', 'http://localhost:5000/webhook'],
    { nonce: 2 },
  );
}

setup();
