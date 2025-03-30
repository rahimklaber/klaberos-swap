import { Component, createSignal, Show, createEffect, For } from 'solid-js';
import './ProvideLiquidity.css';
import { priceFromBin } from '../math';
import { Client, Config, DepositArgs } from 'bindings';
import { walletAddress, connectWallet } from '../walletstuff';
import { tokens } from '../tokens';
import { AssembledTransaction, i128 } from '@stellar/stellar-sdk/contract';
import { Contract, nativeToScVal, xdr, scValToNative } from '@stellar/stellar-sdk';
import LoadingOverlay from '../components/LoadingOverlay';

interface ProvideLiquidityProps {
    contract: Client;
    config: Config;
}

const ProvideLiquidity: Component<ProvideLiquidityProps> = (props) => {
    const range = 200;
    const [shape, setShape] = createSignal<'spot'|'curve'|'bid-ask'>('spot');
    const [loading, setLoading] = createSignal(false);
    const [loadingMessage, setLoadingMessage] = createSignal('');
    const [binRange, setBinRange] = createSignal({ 
        min: props.config.active_bin - 100,
        max: props.config.active_bin + 100
    });
    const [tokenAAmount, setTokenAAmount] = createSignal('0.0');
    const [tokenBAmount, setTokenBAmount] = createSignal('0.0');
    const [positionId, setPositionId] = createSignal('0'); // Position ID, '0' for new position
    const [binDistribution, setBinDistribution] = createSignal<{bin: number, amount: number}[]>([]);
    const [isTransacting, setIsTransacting] = createSignal(false);
    const [transactionMessage, setTransactionMessage] = createSignal('');

    const handleShapeChange = (event: Event) => {
        setShape((event.target as HTMLInputElement).value as any);
    };

    const handlePriceRangeChange = (event: Event) => {
        const value = parseInt((event.target as HTMLInputElement).value);
        const name = (event.target as HTMLInputElement).name;
        setBinRange({ ...binRange(), [name]: value });
    };

    // Add manual bin range input handlers
    const handleBinRangeInputChange = (event: Event) => {
        const value = (event.target as HTMLInputElement).value;
        const name = (event.target as HTMLInputElement).name;
        // Only update if value is a valid number
        if (value !== '' && !isNaN(parseInt(value))) {
            setBinRange({ ...binRange(), [name]: parseInt(value) });
        }
    };

    const handlePositionIdChange = (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        setPositionId(value === '' ? '0' : value); // Default to '0' if empty
    };

    const handleProvideLiquidity = async () => {
        if (!walletAddress()) {
            return await connectWallet();
        } 

        // Validate amounts are entered
        if (parseFloat(tokenAAmount()) <= 0 || parseFloat(tokenBAmount()) <= 0) {
            alert('Please enter valid amounts for both tokens');
            return;
        }

        // Validate position ID
        if (isNaN(parseInt(positionId()))) {
            alert('Please enter a valid position ID');
            return;
        }

        setLoading(true);
        setLoadingMessage('Preparing transaction...');
        // Show transaction loading overlay
        setIsTransacting(true);
        setTransactionMessage(`Adding liquidity: ${tokenAAmount()} ${tokenA().code} and ${tokenBAmount()} ${tokenB().code}`);

        try {
            const selectedShape = shape();
            console.log(`Providing liquidity with: ${tokenAAmount()} of token A and ${tokenBAmount()} of token B, with shape ${selectedShape}`);

            let xAmount = parseFloat(tokenAAmount());
            let yAmount = parseFloat(tokenBAmount());

            const minBin = binRange().min;
            const maxBin = binRange().max;
            const activeBin = props.config.active_bin;

            let accountForActiveBin = (minBin <= activeBin && maxBin >= activeBin) ? 1 : 0;

            let leftBinsAmount = 0n;
            if(minBin >= activeBin) {
                leftBinsAmount = 0n
            }else{
                const leftBins = activeBin - minBin + accountForActiveBin;
                leftBinsAmount = BigInt(((xAmount / leftBins) * 1e7).toFixed(0)) 
            }

            let rightBinsAmount = 0n;
            if(maxBin <= activeBin) {
                rightBinsAmount = 0n
            }else{
                const rightBins = maxBin - activeBin + accountForActiveBin;
                rightBinsAmount = BigInt(((yAmount / rightBins) * 1e7).toFixed(0)) 
            }

            const activeBinAmount = BigInt((leftBinsAmount + rightBinsAmount) / 3n) // FIXME: This is a placeholder value

            let depositArgs: DepositArgs[] = []
            for (let bin = minBin; bin <= maxBin; bin++) {
                depositArgs.push({
                    is_remove: false,
                    bin_id_or_offset: bin,
                    amount: bin < activeBin ? leftBinsAmount : bin > activeBin ? rightBinsAmount : activeBinAmount
                })

            }


            // Update transaction message for signing step
            setTransactionMessage('Please confirm the transaction in your wallet...');
            
            await props.contract.modify_liquidity({ from: walletAddress()!!, position_id: parseInt(positionId()), args: depositArgs, offset_from_active: false }, {simulate: true}).then(async (x) => x.signAndSend())
            
            // Reset values after successful transaction
            setTokenAAmount('0.0');
            setTokenBAmount('0.0');
            
            // Reset loading states
            setLoading(false);
            setLoadingMessage('');
            setIsTransacting(false);
        } catch (error) {
            console.error('Error providing liquidity:', error);
            setLoading(false);
            setLoadingMessage('');
            setIsTransacting(false);
            alert('Failed to provide liquidity. Please try again.');
        }
    };

    // Helper function to get token information
    const getTokenInfo = (contractId: string) => {
        return tokens().find((token) => token.contract === contractId) || {
            code: 'Unknown',
            icon: '', // Default placeholder icon could be added here
        };
    };

    const tokenA = () => getTokenInfo(props.config.token_x);
    const tokenB = () => getTokenInfo(props.config.token_y);

    const activeBinPrice = () => priceFromBin(10, props.config.active_bin, false).toFixed(7);
    
    // Update the resetToActiveBin function to center the range around the active bin
    const resetToActiveBin = () => {
        // Use an equal range on both sides of the active bin
        const offset = 50;
        setBinRange({ 
            min: props.config.active_bin - offset, 
            max: props.config.active_bin + offset 
        });
    };

    // Calculate the bin distribution whenever relevant inputs change
    createEffect(() => {
        if (parseFloat(tokenAAmount()) <= 0) {
            setBinDistribution([]);
            return;
        }

        const minBin = binRange().min;
        const maxBin = binRange().max;
        const activeBin = props.config.active_bin;
        const xAmount = parseFloat(tokenAAmount());
        const yAmount = parseFloat(tokenBAmount());


        const distribution: {bin: number, amount: number}[] = [];
        let accountForActiveBin = (minBin <= activeBin && maxBin >= activeBin) ? 1 : 0;

        const leftBins = activeBin - minBin + accountForActiveBin;
        const rightBins = maxBin - activeBin + accountForActiveBin;
        // Calculate left bins amount
        if (minBin < activeBin) {
            
            const amountPerBin = xAmount / leftBins;
            
            for (let bin = minBin; bin < Math.min(activeBin, maxBin); bin++) {
                distribution.push({ bin, amount: amountPerBin });
            }
        }

        // Add active bin with a special amount
        if (minBin <= activeBin && maxBin >= activeBin) {
            
            const activeBinAmount = (xAmount / leftBins) + (yAmount / rightBins);
            distribution.push({ bin: activeBin, amount: activeBinAmount });
        }

        // Calculate right bins amount
        if (maxBin > activeBin) {
           
            const amountPerBin = yAmount / rightBins;
            
            for (let bin = Math.max(minBin, activeBin) + 1; bin <= maxBin; bin++) {
                distribution.push({ bin, amount: amountPerBin });
            }
        }



        setBinDistribution(distribution);
    });

    return (
        <div class="provide-liquidity-container">
            <Show when={!loading()} fallback={
                <div class="simple-loader">
                    <p>{loadingMessage()}<span class="dots">...</span></p>
                </div>
            }>
                <div class="token-inputs">
                    <div class="token-input-group">
                        <div class="token-input">
                            <input 
                                type="number" 
                                value={tokenAAmount()} 
                                onInput={(e) => setTokenAAmount(e.currentTarget.value)}
                                min="0" 
                                step="0.0000001"
                                placeholder="0.0"
                            />
                            <div class="token-display">
                                {tokenA().icon && <img src={tokenA().icon} alt={tokenA().code} class="token-icon" />}
                                <div class="token-symbol">{tokenA().code}</div>
                            </div>
                        </div>
                    </div>
                    <div class="token-input-group">
                        <div class="token-input">
                            <input 
                                type="number" 
                                value={tokenBAmount()} 
                                onInput={(e) => setTokenBAmount(e.currentTarget.value)}
                                min="0" 
                                step="0.0000001"
                                placeholder="0.0"
                            />
                            <div class="token-display">
                                {tokenB().icon && <img src={tokenB().icon} alt={tokenB().code} class="token-icon" />}
                                <div class="token-symbol">{tokenB().code}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="position-id-input">
                    <label>Position ID</label>
                    <input 
                        type="number" 
                        value={positionId()} 
                        onInput={handlePositionIdChange}
                        min="0" 
                        step="1"
                        placeholder="0"
                    />
                </div>

                <div class="shape-picker">
                    <label>
                        <input type="radio" name="shape" value="spot" checked={shape() === 'spot'} onChange={handleShapeChange} />
                        Spot
                    </label>
                    <label class="disabled-option">
                        <input type="radio" name="shape" value="curve" checked={shape() === 'curve'} onChange={handleShapeChange} disabled />
                        Curve <small>(coming soon)</small>
                    </label>
                    <label class="disabled-option">
                        <input type="radio" name="shape" value="bid-ask" checked={shape() === 'bid-ask'} onChange={handleShapeChange} disabled />
                        Bid-Ask <small>(coming soon)</small>
                    </label>
                </div>
                <div class="price-range-picker">
                    <div class="active-bin-info">
                        <button class="active-bin-link" onClick={resetToActiveBin}>
                            Active Bin: {props.config.active_bin} (Price: {activeBinPrice()})
                        </button>
                    </div>
                    <div class="slider-container" style={{ 
                        '--min': binRange().min,
                        '--max': binRange().max,
                        '--range-min': props.config.active_bin - range,
                        '--range-max': props.config.active_bin + range,
                        '--active-bin': props.config.active_bin
                    }}>
                        <input 
                            type="range"
                            name="min"
                            min={props.config.active_bin - range}
                            max={props.config.active_bin + range}
                            value={binRange().min}
                            onInput={handlePriceRangeChange}
                        />
                        <input
                            type="range"
                            name="max"
                            min={props.config.active_bin - range}
                            max={props.config.active_bin + range}
                            value={binRange().max}
                            onInput={handlePriceRangeChange}
                        />
                        <div class="active-bin-marker" title={`Active Bin: ${props.config.active_bin} (${activeBinPrice()})`}></div>
                    </div>
                    <div class="price-range-values">
                        <div>
                            <div class="bin-input-group">
                                <span>Min Bin:</span>
                                <input 
                                    type="number" 
                                    name="min"
                                    value={binRange().min}
                                    onInput={handleBinRangeInputChange}
                                    min={props.config.active_bin - range}
                                    max={props.config.active_bin + range}
                                    step="1"
                                />
                            </div>
                            <div>Min Price: {priceFromBin(10, binRange().min, false).toFixed(7)}</div>
                        </div>
                        <div>
                            <div class="bin-input-group">
                                <span>Max Bin:</span>
                                <input 
                                    type="number" 
                                    name="max"
                                    value={binRange().max}
                                    onInput={handleBinRangeInputChange}
                                    min={props.config.active_bin - range}
                                    max={props.config.active_bin + range}
                                    step="1"
                                />
                            </div>
                            <div>Max Price: {priceFromBin(10, binRange().max, false).toFixed(7)}</div>
                        </div>
                    </div>
                </div>

                {/* Add the bin distribution graph */}
                <Show when={binDistribution().length > 0}>
                    <div class="bin-distribution-container">
                        <h3>Bin Distribution</h3>
                        <div class="bin-distribution-graph">
                            <For each={binDistribution()}>
                                {(item) => {
                                    const maxAmount = Math.max(...binDistribution().map(d => d.amount));
                                    const barHeight = (item.amount / maxAmount) * 100;
                                    const isActiveBin = item.bin === props.config.active_bin;
                                    
                                    return (
                                        <div 
                                            class={`bin-bar ${isActiveBin ? 'active-bin' : ''}`} 
                                            style={{ 
                                                height: `${barHeight}%`,
                                                'background-color': isActiveBin ? '#eebf4e' : '#666'
                                            }}
                                            title={`Bin ${item.bin}: ${item.amount.toFixed(7)} ${tokenA().code}`}
                                        >
                                            <div class="bin-tooltip">
                                                <div>Bin: {item.bin}</div>
                                                <div>Amount: {item.amount.toFixed(7)}</div>
                                                <div>Price: {priceFromBin(10, item.bin, false).toFixed(7)}</div>
                                            </div>
                                        </div>
                                    );
                                }}
                            </For>
                        </div>
                        <div class="bin-distribution-legend">
                            <div class="bin-legend-item">
                                <div class="bin-legend-color active-bin"></div>
                                <div>Active Bin</div>
                            </div>
                            <div class="bin-legend-item">
                                <div class="bin-legend-color"></div>
                                <div>Other Bins</div>
                            </div>
                        </div>
                    </div>
                </Show>

                <button class="provide-liquidity-button" onClick={handleProvideLiquidity}>
                    {walletAddress() ? 'Provide Liquidity' : 'Connect Wallet'}
                </button>
            </Show>
            {isTransacting() && <LoadingOverlay message={transactionMessage()} />}
        </div>
    );
};

export default ProvideLiquidity;
