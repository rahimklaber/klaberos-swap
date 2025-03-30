import { tokens } from './tokens';

export interface PoolInfo {
    contractId: string;
    name: string;
    tokenXContract: string;
    tokenYContract: string;
}

export const knownPools: PoolInfo[] = [
    {
        contractId: 'CCGJUUOFMNXOC75YLJSDWA74BULL7Y6V2LJFTRJLXENIBICECJ5TMCTZ',
        name: 'USDC/XLM Pool',
        tokenXContract: 'CCIT3EN2HLFDV325RZZMHNVVPJGY74YC3HOVYX5MTWTQGNHZPIYQGTIG',
        tokenYContract: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'
    }
];

export function getPoolName(contractId: string): string {
    const pool = knownPools.find(p => p.contractId === contractId);
    if (!pool) return 'Unknown Pool';
    
    const tokenX = tokens().find(t => t.contract === pool.tokenXContract);
    const tokenY = tokens().find(t => t.contract === pool.tokenYContract);
    
    if (tokenX && tokenY) {
        return `${tokenX.code}/${tokenY.code} Pool`;
    }
    
    return pool.name;
}

export function getPoolTokens(contractId: string): {tokenX: string, tokenY: string} {
    const pool = knownPools.find(p => p.contractId === contractId);
    if (!pool) return {tokenX: '', tokenY: ''};
    
    return {
        tokenX: pool.tokenXContract,
        tokenY: pool.tokenYContract
    };
}
