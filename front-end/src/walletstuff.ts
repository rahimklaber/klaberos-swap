import {
    StellarWalletsKit,
    WalletNetwork,
    allowAllModules,
    ALBEDO_ID
  } from '@creit.tech/stellar-wallets-kit';
import { createSignal } from 'solid-js';

import {Networks, rpc} from '@stellar/stellar-sdk';

export const network = Networks.TESTNET

// TODO: Don't hard code this stuff 🤷‍♀️
export const rpcUrl = 'https://soroban-testnet.stellar.org'
export const rpcClient = new rpc.Server(rpcUrl)

export const walletKit: StellarWalletsKit = new StellarWalletsKit({
    network: WalletNetwork.TESTNET,
    selectedWalletId: ALBEDO_ID,
    modules: allowAllModules(),
  });

export const [walletAddress, setWalletAddress] = createSignal<null | string>(null);

export async function connectWallet(){
   try {
     walletKit.openModal({
        onWalletSelected: async (wallet) => {
            walletKit.setWallet(wallet.id);
            console.log('selected wallet:', wallet.id);
            let address = (await walletKit.getAddress()).address
            setWalletAddress(address);

            console.log('Connected wallet address:', address);
        }
    });
    } catch (error) {
        window.alert('Failed to connect wallet');
        console.error('Failed to connect wallet', error);
    }
}

export async function disconnectWallet(){
    try {
        setWalletAddress(null);
        console.log('Wallet disconnected');
    } catch (error) {
        window.alert('Failed to disconnect wallet');
        console.error('Failed to disconnect wallet', error);
    }
}