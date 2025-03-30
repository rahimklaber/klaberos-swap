import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export type DataKey = {tag: "Config", values: void} | {tag: "BinVec", values: readonly [i32]} | {tag: "BinShareVec", values: readonly [i32]} | {tag: "Position", values: readonly [string, i32]};


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

export const Errors = {
  2: {message:"ErrNegative"},

  18: {message:"ErrMathApprox"},

  30: {message:"ErrAddOverflow"},

  31: {message:"ErrSubUnderflow"},

  32: {message:"ErrDivInternal"},

  33: {message:"ErrMulOverflow"},

  34: {message:"ErrCPowBaseTooLow"},

  35: {message:"ErrCPowBaseTooHigh"},

  37: {message:"ErrNegativeOrZero"}
}

export interface Client {
  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  upgrade: ({wasm_hash}: {wasm_hash: Buffer}, options?: {
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
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a modify_liquidity transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Allows `from` to create or modify an existing position.
   * `offset_from_active` specifies if the `bin_id_or_offset` param of `ActionsArgs` is a pointer to the bin or if it is offset from the current active bin.
   * 
   * returns a pair with the amounts deposited removed or added: (x_token_amount, y_token_amount)
   */
  modify_liquidity: ({from, position_id, args, offset_from_active}: {from: string, position_id: i32, args: Array<DepositArgs>, offset_from_active: boolean}, options?: {
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
  }) => Promise<AssembledTransaction<readonly [i128, i128]>>

  /**
   * Construct and simulate a swap_exact_amount_in transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  swap_exact_amount_in: ({from, amount_in, min_amount_out, in_token}: {from: string, amount_in: i128, min_amount_out: i128, in_token: string}, options?: {
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
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_bin_vec transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_bin_vec: ({vec_id}: {vec_id: i32}, options?: {
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
  }) => Promise<AssembledTransaction<Array<Bin>>>

  /**
   * Construct and simulate a get_shares_vec transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_shares_vec: ({vec_id}: {vec_id: i32}, options?: {
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
  }) => Promise<AssembledTransaction<Array<BinShares>>>

  /**
   * Construct and simulate a get_position transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_position: ({from, position_id}: {from: string, position_id: i32}, options?: {
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
  }) => Promise<AssembledTransaction<Option<Position>>>

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
  }) => Promise<AssembledTransaction<Config>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {conf}: {conf: Config},
    /** Options for initalizing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({conf}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABGNvbmYAAAfQAAAABkNvbmZpZwAAAAAAAA==",
        "AAAAAAAAAAAAAAAHdXBncmFkZQAAAAABAAAAAAAAAAl3YXNtX2hhc2gAAAAAAAPuAAAAIAAAAAA=",
        "AAAAAAAAAS1BbGxvd3MgYGZyb21gIHRvIGNyZWF0ZSBvciBtb2RpZnkgYW4gZXhpc3RpbmcgcG9zaXRpb24uCmBvZmZzZXRfZnJvbV9hY3RpdmVgIHNwZWNpZmllcyBpZiB0aGUgYGJpbl9pZF9vcl9vZmZzZXRgIHBhcmFtIG9mIGBBY3Rpb25zQXJnc2AgaXMgYSBwb2ludGVyIHRvIHRoZSBiaW4gb3IgaWYgaXQgaXMgb2Zmc2V0IGZyb20gdGhlIGN1cnJlbnQgYWN0aXZlIGJpbi4KCnJldHVybnMgYSBwYWlyIHdpdGggdGhlIGFtb3VudHMgZGVwb3NpdGVkIHJlbW92ZWQgb3IgYWRkZWQ6ICh4X3Rva2VuX2Ftb3VudCwgeV90b2tlbl9hbW91bnQpAAAAAAAAEG1vZGlmeV9saXF1aWRpdHkAAAAEAAAAAAAAAARmcm9tAAAAEwAAAAAAAAALcG9zaXRpb25faWQAAAAABQAAAAAAAAAEYXJncwAAA+oAAAfQAAAAC0RlcG9zaXRBcmdzAAAAAAAAAAASb2Zmc2V0X2Zyb21fYWN0aXZlAAAAAAABAAAAAQAAA+0AAAACAAAACwAAAAs=",
        "AAAAAAAAAAAAAAAUc3dhcF9leGFjdF9hbW91bnRfaW4AAAAEAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAJYW1vdW50X2luAAAAAAAACwAAAAAAAAAObWluX2Ftb3VudF9vdXQAAAAAAAsAAAAAAAAACGluX3Rva2VuAAAAEwAAAAEAAAAL",
        "AAAAAAAAAAAAAAALZ2V0X2Jpbl92ZWMAAAAAAQAAAAAAAAAGdmVjX2lkAAAAAAAFAAAAAQAAA+oAAAfQAAAAA0JpbgA=",
        "AAAAAAAAAAAAAAAOZ2V0X3NoYXJlc192ZWMAAAAAAAEAAAAAAAAABnZlY19pZAAAAAAABQAAAAEAAAPqAAAH0AAAAAlCaW5TaGFyZXMAAAA=",
        "AAAAAAAAAAAAAAAMZ2V0X3Bvc2l0aW9uAAAAAgAAAAAAAAAEZnJvbQAAABMAAAAAAAAAC3Bvc2l0aW9uX2lkAAAAAAUAAAABAAAD6AAAB9AAAAAIUG9zaXRpb24=",
        "AAAAAAAAAAAAAAAKZ2V0X2NvbmZpZwAAAAAAAAAAAAEAAAfQAAAABkNvbmZpZwAA",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAABkNvbmZpZwAAAAAAAQAAAAAAAAAGQmluVmVjAAAAAAABAAAABQAAAAEAAAAAAAAAC0JpblNoYXJlVmVjAAAAAAEAAAAFAAAAAQAAAAAAAAAIUG9zaXRpb24AAAACAAAAEwAAAAU=",
        "AAAAAQAAABVzdG9yZWQgYXMgdmVjW3NoYXJlc10AAAAAAAAAAAAACUJpblNoYXJlcwAAAAAAAAIAAAAAAAAABmJpbl9pZAAAAAAABQAAAAAAAAAGc2hhcmVzAAAAAAAL",
        "AAAAAQAAAHdzdG9yZWQgYXMgdmVjW3Jlc2VydmVfeHxyZXNlcnZlX3ldIGlmIG5vdCBhY3RpdmUgYmluCm90aGVyd2lzZSBpZiBhY3RpdmVfYmluLCBpdCBpcyBzdG9yZWQgYXMgdmVjW3Jlc2VydmVfeCwgcmVzZXJ2ZV95XQAAAAAAAAAAA0JpbgAAAAADAAAAAAAAAAZiaW5faWQAAAAAAAUAAAAAAAAACXJlc2VydmVfeAAAAAAAAAsAAAAAAAAACXJlc2VydmVfeQAAAAAAAAs=",
        "AAAAAQAAAP5iaW5faWRfb3Jfb2Zmc2V0IGlzIGVpdGhlciB0aGUgYmluIGlkIG9yIHRoZSBvZmZzZXQgZnJvbSB0aGUgY3VycmVudCBhY3RpdmUgYmluCmFtb3VudCBzcGVjaWZpZXMgdGhlIHRva2VuIGFtb3VudC4gVGhlIHRva2VucyBkZXBlbmRzIG9uIHdoaWNoIHNpZGUgb2YgdGhlIGFjdGl2ZSBiZWVuIGlzCmJlaW5nIGRlcG9zaXRlZC4gSWYgdGhlIGJpbiBpcyB0aGUgYWN0aXZlIGJpbiwgdGhlbiB0aGUgdG9rZW5zIGlzIHNwbGl0IGJhc2VkIG9uIHRoZQAAAAAAAAAAAAtEZXBvc2l0QXJncwAAAAADAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAEGJpbl9pZF9vcl9vZmZzZXQAAAAFAAAAAAAAAAlpc19yZW1vdmUAAAAAAAAB",
        "AAAAAQAAAAAAAAAAAAAABkNvbmZpZwAAAAAABQAAAAAAAAAKYWN0aXZlX2JpbgAAAAAABQAAAAAAAAAIYmluX3N0ZXAAAAAEAAAAAAAAAANmZWUAAAAABAAAAAAAAAAHdG9rZW5feAAAAAATAAAAAAAAAAd0b2tlbl95AAAAABM=",
        "AAAAAQAAAAAAAAAAAAAACFBvc2l0aW9uAAAAAQAAAAAAAAAKYmluX3NoYXJlcwAAAAAD6gAAB9AAAAAJQmluU2hhcmVzAAAA",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACQAAAAAAAAALRXJyTmVnYXRpdmUAAAAAAgAAAAAAAAANRXJyTWF0aEFwcHJveAAAAAAAABIAAAAAAAAADkVyckFkZE92ZXJmbG93AAAAAAAeAAAAAAAAAA9FcnJTdWJVbmRlcmZsb3cAAAAAHwAAAAAAAAAORXJyRGl2SW50ZXJuYWwAAAAAACAAAAAAAAAADkVyck11bE92ZXJmbG93AAAAAAAhAAAAAAAAABFFcnJDUG93QmFzZVRvb0xvdwAAAAAAACIAAAAAAAAAEkVyckNQb3dCYXNlVG9vSGlnaAAAAAAAIwAAAAAAAAARRXJyTmVnYXRpdmVPclplcm8AAAAAAAAl" ]),
      options
    )
  }
  public readonly fromJSON = {
    upgrade: this.txFromJSON<null>,
        modify_liquidity: this.txFromJSON<readonly [i128, i128]>,
        swap_exact_amount_in: this.txFromJSON<i128>,
        get_bin_vec: this.txFromJSON<Array<Bin>>,
        get_shares_vec: this.txFromJSON<Array<BinShares>>,
        get_position: this.txFromJSON<Option<Position>>,
        get_config: this.txFromJSON<Config>
  }
}