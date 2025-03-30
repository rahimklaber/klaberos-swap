import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { Client, Config, Position } from 'bindings';
import {scValToNative} from '@stellar/stellar-sdk';
import { walletAddress, connectWallet } from '../walletstuff';
import './PositionInfo.css';
import { tokens } from '../tokens';
import { priceFromBin } from '../math';

interface PositionInfoProps {
    contract: Client;
    config: Config;
}

interface PositionData {
    position: Position;
    id: number;
}

const PositionInfo: Component<PositionInfoProps> = (props) => {
    const [loading, setLoading] = createSignal(true);
    const [loadingMessage, setLoadingMessage] = createSignal('Loading positions');
    const [positions, setPositions] = createSignal<PositionData[]>([]);
    const [positionId, setPositionId] = createSignal('');
    const [errorMessage, setErrorMessage] = createSignal('');
    
    // Load position when component mounts or when wallet changes
    createEffect(async () => {
        if (!walletAddress()) {
            setPositions([]);
            setLoading(false);
            return;
        }
    });
    
    const loadPositionById = async () => {
        if (!positionId() || isNaN(parseInt(positionId()))) {
            setErrorMessage('Please enter a valid position ID');
            return;
        }
        
        setLoading(true);
        setLoadingMessage(`Loading position #${positionId()}`);
        setErrorMessage('');
        
        try {
            const id = parseInt(positionId());
            const result = await props.contract.get_position({
                from: walletAddress()!,
                position_id: id
            }, {simulate: true});

            const retvalXdr = result.simulation.result.retval;

            const manuallyParsed = scValToNative(retvalXdr)
           
            
            if (manuallyParsed) {
                // Wrap position in PositionData structure
                setPositions([{
                    position: manuallyParsed,
                    id: id
                }]);
            } else {
                setErrorMessage(`Position #${id} not found.`);
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Error loading position by ID:', error);
            setLoading(false);
            setErrorMessage(`Position #${positionId()} not found.`);
        }
    };
    
    const getTokenInfo = (contractId: string) => {
        return tokens().find((token) => token.contract === contractId) || {
            code: 'Unknown',
            icon: '', 
        };
    };
    
    const tokenX = () => getTokenInfo(props.config.token_x);
    const tokenY = () => getTokenInfo(props.config.token_y);
    
    const getBinRange = (position: Position) => {
        const binIds = position.bin_shares.map((value) => value.bin_id) || [];
        if (binIds.length === 0) return 'No bins';
        
        const min = Math.min(...binIds);
        const max = Math.max(...binIds);
        return `${min} to ${max}`;
    };
    
    const getPriceRange = (position: Position) => {
        const binIds = position.bin_shares.map((value) => value.bin_id) || [];
        if (binIds.length === 0) return 'N/A';
        
        const min = Math.min(...binIds);
        const max = Math.max(...binIds);
        
        return `${priceFromBin(10, min, false).toFixed(7)} to ${priceFromBin(10, max, false).toFixed(7)}`;
    };
    
    const handleConnectWallet = async () => {
        await connectWallet();
    };
    
    const handlePositionIdChange = (e: Event) => {
        setPositionId((e.target as HTMLInputElement).value);
    };
    
    const handlePositionIdSubmit = (e: Event) => {
        e.preventDefault();
        loadPositionById();
    };
    
    return (
        <div class="position-info-container">
            <h2>Your Positions</h2>
            
            <Show when={walletAddress()} fallback={
                <div class="connect-prompt">
                    <p>Connect your wallet to view your positions</p>
                    <button class="connect-wallet-button" onClick={handleConnectWallet}>
                        Connect Wallet
                    </button>
                </div>
            }>
                <form class="position-id-form" onSubmit={handlePositionIdSubmit}>
                    <div class="position-id-input-container">
                        <input 
                            type="number" 
                            placeholder="Enter position ID" 
                            value={positionId()} 
                            onInput={handlePositionIdChange}
                            min="0"
                            step="1"
                        />
                        <button type="submit">Load</button>
                    </div>
                </form>
                
                {errorMessage() && <div class="error-message">{errorMessage()}</div>}
                
                <Show when={!loading()} fallback={
                    <div class="simple-loader">
                        <p>{loadingMessage()}<span class="dots">...</span></p>
                    </div>
                }>
                    <Show when={positions().length > 0} fallback={
                        <div class="no-positions">
                            {/* <p>You don't have any positions in this pool yet.</p> */}
                            <p>Go to the "Provide Liquidity" tab to create a position.</p>
                        </div>
                    }>
                        <div class="positions-list">
                            <For each={positions()}>
                                {(posData) => (
                                    <div class="position-card">
                                        <div class="position-header">
                                            <div class="position-id">Position #{posData.id}</div>
                                            <div class="position-tokens">
                                                <div class="token-pair">
                                                    <img src={tokenX().icon} alt={tokenX().code} class="token-icon" />
                                                    <img src={tokenY().icon} alt={tokenY().code} class="token-icon token-icon-overlap" />
                                                    <span>{tokenX().code}/{tokenY().code}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="position-details">
                                            <div class="detail">
                                                <div class="detail-label">Bin Range:</div>
                                                <div class="detail-value">{getBinRange(posData.position)}</div>
                                            </div>
                                            <div class="detail">
                                                <div class="detail-label">Price Range:</div>
                                                <div class="detail-value">{getPriceRange(posData.position)}</div>
                                            </div>
                                            <div class="detail">
                                                <div class="detail-label">{tokenX().code} Amount:</div>
                                                {/* <div class="detail-value">{Number(posData.position.amount_x) / 1e7}</div> */}
                                            </div>
                                            <div class="detail">
                                                <div class="detail-label">{tokenY().code} Amount:</div>
                                                {/* <div class="detail-value">{Number(posData.position.amount_y) / 1e7}</div> */}
                                            </div>
                                        </div>
                                        <div class="position-actions">
                                            <button 
                                                class="remove-liquidity-button disabled"
                                                disabled={true}
                                                title="This feature is coming soon"
                                            >
                                                Remove Liquidity <span class="coming-soon-badge">Coming Soon</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </Show>
            </Show>
        </div>
    );
};

export default PositionInfo;
