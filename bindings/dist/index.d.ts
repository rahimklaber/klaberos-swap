import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions } from '@stellar/stellar-sdk/contract';
import type { u32, i32, i128, Option } from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk';
export * as contract from '@stellar/stellar-sdk/contract';
export * as rpc from '@stellar/stellar-sdk/rpc';
export type DataKey = {
    tag: "Config";
    values: void;
} | {
    tag: "BinVec";
    values: readonly [i32];
} | {
    tag: "BinShareVec";
    values: readonly [i32];
} | {
    tag: "Position";
    values: readonly [string, i32];
};
/**
 * stored as vec[shares]
 */
export interface BinShares {
    bin_id: i32;
    shares: i128;
}
/**
 * stored as vec[reserve_x|reserve_y] if not active bin
 * otherwise if active_bin, it is stored as vec[reserve_x, reserve_y]
 */
export interface Bin {
    bin_id: i32;
    reserve_x: i128;
    reserve_y: i128;
}
/**
 * bin_id_or_offset is either the bin id or the offset from the current active bin
 * amount specifies the token amount. The tokens depends on which side of the active been is
 * being deposited. If the bin is the active bin, then the tokens is split based on the
 */
export interface DepositArgs {
    amount: i128;
    bin_id_or_offset: i32;
    is_remove: boolean;
}
export interface Config {
    active_bin: i32;
    bin_step: u32;
    fee: u32;
    token_x: string;
    token_y: string;
}
export interface Position {
    bin_shares: Array<BinShares>;
}
export declare const Errors: {
    2: {
        message: string;
    };
    18: {
        message: string;
    };
    30: {
        message: string;
    };
    31: {
        message: string;
    };
    32: {
        message: string;
    };
    33: {
        message: string;
    };
    34: {
        message: string;
    };
    35: {
        message: string;
    };
    37: {
        message: string;
    };
};
export interface Client {
    /**
     * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    upgrade: ({ wasm_hash }: {
        wasm_hash: Buffer;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a modify_liquidity transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Allows `from` to create or modify an existing position.
     * `offset_from_active` specifies if the `bin_id_or_offset` param of `ActionsArgs` is a pointer to the bin or if it is offset from the current active bin.
     *
     * returns a pair with the amounts deposited removed or added: (x_token_amount, y_token_amount)
     */
    modify_liquidity: ({ from, position_id, args, offset_from_active }: {
        from: string;
        position_id: i32;
        args: Array<DepositArgs>;
        offset_from_active: boolean;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<readonly [i128, i128]>>;
    /**
     * Construct and simulate a swap_exact_amount_in transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    swap_exact_amount_in: ({ from, amount_in, min_amount_out, in_token }: {
        from: string;
        amount_in: i128;
        min_amount_out: i128;
        in_token: string;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<i128>>;
    /**
     * Construct and simulate a get_bin_vec transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_bin_vec: ({ vec_id }: {
        vec_id: i32;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Array<Bin>>>;
    /**
     * Construct and simulate a get_shares_vec transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_shares_vec: ({ vec_id }: {
        vec_id: i32;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Array<BinShares>>>;
    /**
     * Construct and simulate a get_position transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_position: ({ from, position_id }: {
        from: string;
        position_id: i32;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Option<Position>>>;
    /**
     * Construct and simulate a get_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_config: (options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Config>>;
}
export declare class Client extends ContractClient {
    readonly options: ContractClientOptions;
    static deploy<T = Client>(
    /** Constructor/Initialization Args for the contract's `__constructor` method */
    { conf }: {
        conf: Config;
    }, 
    /** Options for initalizing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions & Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
    }): Promise<AssembledTransaction<T>>;
    constructor(options: ContractClientOptions);
    readonly fromJSON: {
        upgrade: (json: string) => AssembledTransaction<null>;
        modify_liquidity: (json: string) => AssembledTransaction<readonly [bigint, bigint]>;
        swap_exact_amount_in: (json: string) => AssembledTransaction<bigint>;
        get_bin_vec: (json: string) => AssembledTransaction<Bin[]>;
        get_shares_vec: (json: string) => AssembledTransaction<BinShares[]>;
        get_position: (json: string) => AssembledTransaction<Option<Position>>;
        get_config: (json: string) => AssembledTransaction<Config>;
    };
}
