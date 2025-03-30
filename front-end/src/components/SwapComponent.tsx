import { Component, createEffect, createSignal, onCleanup } from 'solid-js';
import './SwapComponent.css';
import { Client, Config } from 'bindings';
import { walletAddress, connectWallet } from '../walletstuff';
import { Token, tokens } from '../tokens';
import LoadingOverlay from './LoadingOverlay';

interface SwapComponentProps {
  contract: Client;
  config: Config;
}

const SwapComponent: Component<SwapComponentProps> = (props) => {
    const [showPicker, setShowPicker] = createSignal(false);
    const [search, setSearch] = createSignal('');
    const [fromCurrency, setFromCurrency] = createSignal(tokens()[0]);
    const [toCurrency, setToCurrency] = createSignal(tokens()[1]);
    const [currentPicker, setCurrentPicker] = createSignal<'from' | 'to'>('from');
    const [inputAmount, setInputAmount] = createSignal('0.0');
    const [outputAmount, setOutputAmount] = createSignal('0.0');
    const [exchangeRate, setExchangeRate] = createSignal(10); // Mock exchange rate, should come from contract
    const [calculatingOutput, setCalculatingOutput] = createSignal(false);
    const [inputTimer, setInputTimer] = createSignal<number | null>(null);
    const [isTransacting, setIsTransacting] = createSignal(false);
    const [transactionMessage, setTransactionMessage] = createSignal('');

    const filteredTokens = () => tokens().filter(token => token.code.toLowerCase().includes(search().toLowerCase()));

    const handleTokenSelection = (token: Token) => {
        if (currentPicker() === 'from') {
            setFromCurrency(token);
        } else {
            setToCurrency(token);
        }
        setShowPicker(false);
    };

    createEffect(async () => {
        let {result} = await props.contract.swap_exact_amount_in({
            amount_in: 1_000_000_0n,
            from: walletAddress()!!,
            in_token: fromCurrency().contract,
            min_amount_out: 0n
        }, {simulate: true});

        setExchangeRate(Number(result) / 1e7);
    })

    const handleInputChange = (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        setInputAmount(value);
        
        // Clear any existing timer
        if (inputTimer()) {
            window.clearTimeout(inputTimer()!);
        }
        
        // Set calculating state to indicate to the user that the calculation is pending
        setCalculatingOutput(true);
        
        // Set a new timer to calculate the output after 1 second of idle time
        setInputTimer(window.setTimeout(async () => {
            await calculateOutput();
            setCalculatingOutput(false);
        }, 500));
    };

    const calculateOutput = async () => {
        const input = parseFloat(inputAmount());
        if (!isNaN(input)) {
            const {result} = await props.contract.swap_exact_amount_in(
                {
                    from: walletAddress()!!,
                    in_token: fromCurrency().contract,
                    amount_in: BigInt((input *1e7).toFixed(0)),
                    min_amount_out: 0n,
                },
                {
                    simulate: true
                }
            )

            console.log('raw swap out', result);
            setOutputAmount((Number(result) / 1e7 ).toFixed(7));
        } else {
            setOutputAmount('0.0');
        }
    };

    // Clean up any pending timeouts when component unmounts
    onCleanup(() => {
        if (inputTimer()) {
            window.clearTimeout(inputTimer()!);
        }
    });

    const handleSwapTokens = () => {
        // Swap the tokens
        const fromToken = fromCurrency();
        const toToken = toCurrency();
        const fromAmount = inputAmount();
        const toAmount = outputAmount();
        
        setFromCurrency(toToken);
        setToCurrency(fromToken);
        setInputAmount(toAmount);
        setOutputAmount(fromAmount);
        
        // Calculate new output after a brief delay
        if (inputTimer()) {
            window.clearTimeout(inputTimer()!);
        }
        
        setCalculatingOutput(true);
        setInputTimer(window.setTimeout(async () => {
            await calculateOutput();
            setCalculatingOutput(false);
        }, 500));
    };

    const handleSwapClick = async () => {
        if (!walletAddress()) {
            await connectWallet();
        } else {
            // Validate amounts
            const amount = parseFloat(inputAmount());
            if (isNaN(amount) || amount <= 0) {
                alert('Please enter a valid amount');
                return;
            }

            // Show loading overlay
            setIsTransacting(true);
            setTransactionMessage(`Swapping ${inputAmount()} ${fromCurrency().code} for ${outputAmount()} ${toCurrency().code}`);

            try {
                const bigIntAmount = BigInt((amount *1e7).toFixed(0))
                let minOut = BigInt((parseFloat(outputAmount()) *1e7).toFixed(0))
                minOut = minOut - minOut / 50n

                // Perform the swap transaction
                console.log(`Swapping ${inputAmount()} ${fromCurrency().code} for ${outputAmount()} ${toCurrency().code}`);
                console.log(bigIntAmount - bigIntAmount / 100n)
                const tx = await props.contract.swap_exact_amount_in(
                    {
                        from: walletAddress()!!,
                        in_token: fromCurrency().contract,
                        amount_in: bigIntAmount,
                        min_amount_out: minOut,
                    },
                    {
                        simulate: true,
                    }
                )

                setTransactionMessage('Confirming transaction...');
                await tx.signAndSend();
                
                // Reset input fields after successful swap
                setInputAmount('0.0');
                setOutputAmount('0.0');
                
                // Hide loading overlay
                setIsTransacting(false);
            } catch (error) {
                console.error('Error during swap:', error);
                setIsTransacting(false);
                alert('Swap failed. Please try again.');
            }
        }
    };

    return (
        <div class="swap-container">
            <div class="swap-box">
                <div class="swap-section">
                    <div class="swap-label">From</div>
                    <div class="swap-input">
                        <input 
                            type="number" 
                            placeholder="0.0" 
                            value={inputAmount()}
                            onInput={handleInputChange}
                            min="0"
                            step="0.0000001"
                        />
                        <div class="swap-currency" onClick={() => { setShowPicker(true); setCurrentPicker('from'); }}>
                            <img src={fromCurrency().icon} alt={fromCurrency().code} />
                            <span class="currency-text">{fromCurrency().code}</span>
                        </div>
                    </div>
                </div>
                
                {/* Removing the swap direction toggle */}
                
                <div class="swap-section">
                    <div class="swap-label">To</div>
                    <div class="swap-input">
                        <input 
                            type="number" 
                            placeholder="0.0" 
                            value={outputAmount()}
                            readOnly
                            disabled
                            min="0"
                            step="0.0000001"
                        />
                        <div class="swap-currency" onClick={() => { setShowPicker(true); setCurrentPicker('to'); }}>
                            {calculatingOutput() ? (
                                <div class="calculating-indicator">Calculating...</div>
                            ) : (
                                <>
                                    <img src={toCurrency().icon} alt={toCurrency().code} />
                                    <span class="currency-text">{toCurrency().code}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <button class="swap-button" onClick={handleSwapClick}>
                    {walletAddress() ? 'SWAP' : 'CONNECT WALLET'}
                </button>
                <div class="swap-info">
                    <p>Exchange Rate: 1 {fromCurrency().code} = {exchangeRate()} {toCurrency().code}</p>
                    <p>fee          : {props.config.fee / 100}%</p>
                </div>
            </div>
            {showPicker() && (
                <div class="currency-picker">
                    <div class="currency-picker-overlay" onClick={() => setShowPicker(false)}></div>
                    <div class="currency-picker-content">
                        <input
                            type="text"
                            placeholder="Search token"
                            value={search()}
                            onInput={(e) => setSearch(e.currentTarget.value)}
                        />
                        <ul>
                            {filteredTokens().map(token => (
                                <li onClick={() => handleTokenSelection(token)}>
                                    <img src={token.icon} alt={token.code} />
                                    <span>{token.code}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            {isTransacting() && <LoadingOverlay message={transactionMessage()} />}
        </div>
    );
};

export default SwapComponent;
