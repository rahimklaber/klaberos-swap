use soroban_fixed_point_math::SorobanFixedPoint;
use soroban_sdk::{Address, Env, I256};
use crate::math::{c_pow, BONE};
use crate::storage::Config;

pub fn price_from_bin_and_token(e: &Env, config: &Config, id: i32, token: Address) -> I256 {
    if token == config.token_y {
        price_from_bin(e, config.bin_step, id, false)
    } else {
        let bone_i256 = I256::from_i128(e, BONE);
        bone_i256.fixed_div_floor(
            &e,
            &price_from_bin(e, config.bin_step, id, true),
            &bone_i256,
        )
    }
}

pub fn price_from_bin(e: &Env, bin_step: u32, id: i32, round_up: bool) -> I256 {
    // return (1 + binStep / 10_000) ** (binId - 100_000)
    let base = I256::from_i128(
        e,
        BONE + id.signum() as i128 * (bin_step as i128 * BONE / 10_000),
    );
    let exp = I256::from_i128(e, BONE * id.abs() as i128);
    let r = c_pow(e, &base, &exp, round_up);

    r
}