import { Buffer } from "buffer";
import { Client as ContractClient, Spec as ContractSpec, } from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk';
export * as contract from '@stellar/stellar-sdk/contract';
export * as rpc from '@stellar/stellar-sdk/rpc';
if (typeof window !== 'undefined') {
    //@ts-ignore Buffer exists
    window.Buffer = window.Buffer || Buffer;
}
export const Errors = {
    2: { message: "ErrNegative" },
    18: { message: "ErrMathApprox" },
    30: { message: "ErrAddOverflow" },
    31: { message: "ErrSubUnderflow" },
    32: { message: "ErrDivInternal" },
    33: { message: "ErrMulOverflow" },
    34: { message: "ErrCPowBaseTooLow" },
    35: { message: "ErrCPowBaseTooHigh" },
    37: { message: "ErrNegativeOrZero" }
};
export class Client extends ContractClient {
    options;
    static async deploy(
    /** Constructor/Initialization Args for the contract's `__constructor` method */
    { conf }, 
    /** Options for initalizing a Client as well as for calling a method, with extras specific to deploying. */
    options) {
        return ContractClient.deploy({ conf }, options);
    }
    constructor(options) {
        super(new ContractSpec(["AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABGNvbmYAAAfQAAAABkNvbmZpZwAAAAAAAA==",
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
            "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACQAAAAAAAAALRXJyTmVnYXRpdmUAAAAAAgAAAAAAAAANRXJyTWF0aEFwcHJveAAAAAAAABIAAAAAAAAADkVyckFkZE92ZXJmbG93AAAAAAAeAAAAAAAAAA9FcnJTdWJVbmRlcmZsb3cAAAAAHwAAAAAAAAAORXJyRGl2SW50ZXJuYWwAAAAAACAAAAAAAAAADkVyck11bE92ZXJmbG93AAAAAAAhAAAAAAAAABFFcnJDUG93QmFzZVRvb0xvdwAAAAAAACIAAAAAAAAAEkVyckNQb3dCYXNlVG9vSGlnaAAAAAAAIwAAAAAAAAARRXJyTmVnYXRpdmVPclplcm8AAAAAAAAl"]), options);
        this.options = options;
    }
    fromJSON = {
        upgrade: (this.txFromJSON),
        modify_liquidity: (this.txFromJSON),
        swap_exact_amount_in: (this.txFromJSON),
        get_bin_vec: (this.txFromJSON),
        get_shares_vec: (this.txFromJSON),
        get_position: (this.txFromJSON),
        get_config: (this.txFromJSON)
    };
}
