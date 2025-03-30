import { Component, createEffect, createSignal, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import SwapComponent from '../components/SwapComponent';
import ProvideLiquidity from './ProvideLiquidity';
import PositionInfo from './PositionInfo';
import './Pool.css';
import { Client, Config } from 'bindings';
import { network, rpcUrl, walletAddress, walletKit } from '../walletstuff';
import { tokens } from '../tokens';

const Pool: Component = () => {
    const params = useParams();
    const [activeTab, setActiveTab] = createSignal<'swap' | 'liquidity' | 'positions'>('swap');
    const [loading, setLoading] = createSignal(true);
    const [loadingMessage, setLoadingMessage] = createSignal('Loading pool data');
    const [config, setConfig] = createSignal<Config | null>(null);
    const [showConfig, setShowConfig] = createSignal(false);
    
    // The contract is now accessible via params.contractId
    const contract = () => new Client({
        publicKey: walletAddress() || '',
        contractId: params.contractId,
        networkPassphrase: network,
        rpcUrl: rpcUrl,
        signTransaction: (xdr: string, opts) => walletKit.signTransaction(xdr, opts),
    });

    // Helper function to get token information
    const getTokenInfo = (contractId: string) => {
        return tokens().find((token) => token.contract === contractId) || {
            code: 'Unknown',
            icon: '', 
        };
    };
    
    const tokenX = () => config() ? getTokenInfo(config()!.token_x) : { code: '', icon: '' };
    const tokenY = () => config() ? getTokenInfo(config()!.token_y) : { code: '', icon: '' };

    // Load pool data when component is mounted or when contractId changes
    createEffect(async () => {
        if (!params.contractId) return;
        
        setLoading(true);
        setLoadingMessage('Loading pool data');
        
        try {
            // Fetch pool configuration
            const configResult = await (await contract().get_config()).simulate();
            setConfig(configResult.result);
            
            setLoading(false);
        } catch (error) {
            console.error('Error loading pool data:', error);
            setLoadingMessage('Error loading pool data. Please check the contract ID.');
            // Keep loading state true to show error message
        }
    });

    return (
        <Show when={!loading()} fallback={
            <div class="simple-loader">
                <p>{loadingMessage()}<span class="dots">...</span></p>
            </div>
        }>
        <div class="pool-container">
            <div class="pool-header">
                <div class="pool-title">
                    <div class="token-pair-display">
                        <img src={tokenX().icon} alt={tokenX().code} class="token-icon" />
                        <img src={tokenY().icon} alt={tokenY().code} class="token-icon token-icon-overlap" />
                        <h2>{tokenX().code}/{tokenY().code}</h2>
                    </div>
                    <div class="contract-id">
                        <span class="contract-address">{params.contractId.substring(0, 8)}...{params.contractId.substring(params.contractId.length - 8)}</span>
                    </div>
                </div>
                <button 
                    class="config-toggle-button" 
                    onClick={() => setShowConfig(!showConfig())}
                >
                    {showConfig() ? 'Hide' : 'Config'}
                </button>
            </div>

            <Show when={showConfig()}>
                <div class="config-display">
                    <h3>Pool Details</h3>
                    <pre>{JSON.stringify(config(), null, 2)}</pre>
                </div>
            </Show>

            <div class="pool-tabs">
                <button 
                    class={activeTab() === 'swap' ? 'active' : ''} 
                    onClick={() => setActiveTab('swap')}
                >
                    Swap
                </button>
                <button 
                    class={activeTab() === 'liquidity' ? 'active' : ''} 
                    onClick={() => setActiveTab('liquidity')}
                >
                    Provide Liquidity
                </button>
                <button 
                    class={activeTab() === 'positions' ? 'active' : ''} 
                    onClick={() => setActiveTab('positions')}
                >
                    Positions
                </button>
            </div>
            <div class="pool-content">
                {activeTab() === 'swap' 
                    ? <SwapComponent contract={contract()} config={config()!} /> 
                    : activeTab() === 'liquidity'
                    ? <ProvideLiquidity contract={contract()} config={config()!} />
                    : <PositionInfo contract={contract()} config={config()!} />
                }
            </div>
        </div>
        </Show>

    );
};

export default Pool;
