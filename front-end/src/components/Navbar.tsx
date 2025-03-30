import { Component, createSignal, Show, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { connectWallet, disconnectWallet, walletAddress } from '../walletstuff';
import { knownPools } from '../pools';
import { tokens } from '../tokens';
import '../index.css';

const Navbar: Component = () => {
    const [searchInput, setSearchInput] = createSignal('');
    const [showPoolDropdown, setShowPoolDropdown] = createSignal(false);
    const navigate = useNavigate();
    
    const handleSearch = (e: Event) => {
        e.preventDefault();
        if (searchInput().trim()) {
            navigate(`/pool/${searchInput().trim()}`);
            setSearchInput('');
            setShowPoolDropdown(false);
        }
    };
    
    const selectPool = (contractId: string) => {
        navigate(`/pool/${contractId}`);
        setSearchInput('');
        setShowPoolDropdown(false);
    };

    const toggleWalletConnection = async () => {
        if (walletAddress()) {
            await disconnectWallet();
        } else {
            await connectWallet();
        }
    };

    const formatAddress = (address: string) => {
        if (!address) return '';
        return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
    };
    
    const getTokenIcon = (contractId: string) => {
        return tokens().find(t => t.contract === contractId)?.icon || '';
    };

    const handleSearchFocus = () => {
        setShowPoolDropdown(true);
    };
    
    const handleSearchBlur = (e: FocusEvent) => {
        // Delay hiding dropdown to allow for clicking on dropdown items
        setTimeout(() => setShowPoolDropdown(false), 200);
    };

    return (
        <nav class="navbar">
            <div class="navbar-left hide-on-mobile">
                <div class="navbar-brand">Klaberos Swap ♾️</div>
            </div>
            <div class="navbar-center">
                <div class="navbar-search">
                    <form onSubmit={handleSearch}>
                        <div class="search-container">
                            <input 
                                type="text" 
                                placeholder="Search pools by contract ID..." 
                                value={searchInput()} 
                                onInput={(e) => setSearchInput(e.currentTarget.value)}
                                onFocus={handleSearchFocus}
                                onBlur={handleSearchBlur}
                            />
                            <button type="submit">Search</button>
                            
                            <Show when={showPoolDropdown()}>
                                <div class="pools-dropdown">
                                    <For each={knownPools}>
                                        {(pool) => (
                                            <div class="pool-item" onClick={() => selectPool(pool.contractId)}>
                                                <div class="pool-icons">
                                                    <img src={getTokenIcon(pool.tokenXContract)} alt="Token X" class="token-icon" />
                                                    <img src={getTokenIcon(pool.tokenYContract)} alt="Token Y" class="token-icon token-icon-overlap" />
                                                </div>
                                                <div class="pool-info">
                                                    <div class="pool-name">{pool.name}</div>
                                                    <div class="pool-contract">{formatAddress(pool.contractId)}</div>
                                                </div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>
                    </form>
                </div>
            </div>
            <div class="navbar-right hide-on-mobile">
                <button 
                    class={walletAddress() ? "wallet-button connected" : "wallet-button"} 
                    onClick={toggleWalletConnection}
                >
                    {walletAddress() ? `${formatAddress(walletAddress()!)} • Disconnect` : 'Connect Wallet'}
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
