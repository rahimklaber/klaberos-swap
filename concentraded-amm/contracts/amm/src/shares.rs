use soroban_fixed_point_math::SorobanFixedPoint;
use soroban_sdk::Env;
use crate::storage::{Bin, BinShares};

pub fn calculate_shares_to_mint(
    env: &Env,
    bin_shares: &BinShares,
    bin: &Bin,
    in_amount: i128,
) -> i128 {
    if bin_shares.shares == 0 {
        in_amount as i128
    } else {
        (in_amount as i128).fixed_mul_floor(env, &bin_shares.shares, &(bin.reserve_x + bin.reserve_y))
    }
}