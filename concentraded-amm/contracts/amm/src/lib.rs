#![no_std]

use crate::bin::{delete_shares_in_position, get_bin_from_vec, get_bin_position_in_vec, get_shares_from_position, is_bin_in_vec, store_bin_in_vec, store_shares_in_position};
use crate::math::{downscale_ceil, downscale_floor, upscale, BONE, FEE_SCALAR};
use crate::price::price_from_bin_and_token;
use crate::shares::calculate_shares_to_mint;
use crate::storage::{get_bin_vec_or_default, get_config, get_position, get_position_or_default, get_shares_vec_or_default, get_vec_id_for_bin, store_bin_vec, store_config, store_position, store_shares_vec, Bin, BinShares, Config, DataKey, DepositArgs, Position};
use crate::token::transfer;
use soroban_fixed_point_math::SorobanFixedPoint;
// use soroban_sdk::testutils::arbitrary::std::dbg;
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Vec, I256};
use soroban_sdk::testutils::arbitrary::std::dbg;

#[contract]
pub struct Contract;


#[contractimpl]
impl Contract {
    pub fn __constructor(env: Env, conf: Config) {
        env.storage().instance().set(&DataKey::Config, &conf);
    }

    pub fn upgrade(env: Env, wasm_hash: BytesN<32>){
        env.deployer().update_current_contract_wasm(wasm_hash);
    }

    /// Allows `from` to create or modify an existing position.
    /// `offset_from_active` specifies if the `bin_id_or_offset` param of `ActionsArgs` is a pointer to the bin or if it is offset from the current active bin.
    ///
    /// returns a pair with the amounts deposited removed or added: (x_token_amount, y_token_amount)
    /// a positive number means that we deposited that amount and a negative number means that we withdrew that amount.
    pub fn modify_liquidity(env: Env, from: Address, position_id: i32, args: Vec<DepositArgs>, offset_from_active: bool) -> (i128, i128) {
        from.require_auth();
        assert!(args.len() > 0);

        let config = get_config(&env);

        let mut x_amount_delta = 0;
        let mut y_amount_delta = 0;

        let bin_offset = if offset_from_active {
            config.active_bin
        } else {
            0
        };

        let mut position = get_position_or_default(&env, DataKey::Position(from.clone(), position_id));
        
        let starting_bin_id = args.first_unchecked().bin_id_or_offset + bin_offset;
            // match args.first_unchecked() {
            // ActionArgs::Deposit(v) => v.bin_id_or_offset + bin_offset,
            // ActionArgs::Remove(v) => v.bin_id_or_offset + bin_offset,
        // };

        let mut cur_vec_id = get_vec_id_for_bin(starting_bin_id);
        let mut cur_bin_vec: Vec<Bin> = get_bin_vec_or_default(&env, cur_vec_id, config.active_bin);
        let mut cur_shares_vec: Vec<BinShares> = get_shares_vec_or_default(&env, cur_vec_id);

        let bone_i256 = I256::from_i128(&env, BONE);

        for i in 0..args.len() {
            let modify_arg = &args.get(i).unwrap();
            
            let bin_id = modify_arg.bin_id_or_offset + bin_offset;
                // match modify_arg {
                // ActionArgs::Deposit(v) => v.bin_id_or_offset,
                // ActionArgs::Remove(v) => v.bin_id_or_offset,
            // } + bin_offset;

            // if the vec does not have the elements,
            if !is_bin_in_vec(bin_id, cur_vec_id) {
                store_bin_vec(&env,cur_vec_id, &cur_bin_vec);
                store_shares_vec(&env, cur_vec_id, &cur_shares_vec);

                cur_vec_id = get_vec_id_for_bin(bin_id);
                cur_bin_vec = get_bin_vec_or_default(&env, cur_vec_id, config.active_bin);
                cur_shares_vec = get_shares_vec_or_default(&env, cur_vec_id);
            }

            let mut bin = get_bin_from_vec(&cur_bin_vec, bin_id);
            let mut bin_shares = get_bin_from_vec(&cur_shares_vec, bin_id);
            let mut user_shares = get_shares_from_position(&position, bin_id);

            match modify_arg.is_remove {
                false => {
                    assert!(modify_arg.amount > 0);
                    let (amount_x, amount_y) = if bin_id == config.active_bin {
                        let total_reserve = bin.reserve_x + bin.reserve_y;

                        if total_reserve == 0 {
                            let half_amount = modify_arg.amount / 2;
                            (half_amount as i128, (modify_arg.amount - half_amount) as i128) // handle odd amounts
                        }else{
                            let x = downscale_floor(
                                &env,
                                &upscale(&env, modify_arg.amount, BONE)
                                    .fixed_mul_floor(&env, &upscale(&env, bin.reserve_x, BONE), &upscale(&env, total_reserve, BONE)),
                                BONE,
                            );
                            (x, (modify_arg.amount - x))
                        }
                    } else if bin_id < config.active_bin {
                        (modify_arg.amount as i128, 0i128)
                    } else if bin_id > config.active_bin {
                        (0i128, modify_arg.amount as i128)
                    }else {
                        panic!("Invalid bin id. my logic is wrong.");
                    };

                    let shares_to_mint = calculate_shares_to_mint(
                        &env,
                        &bin_shares,
                        &bin,
                        modify_arg.amount,
                    );

                    x_amount_delta += amount_x;
                    y_amount_delta += amount_y;

                    bin.reserve_x += amount_x;
                    bin.reserve_y += amount_y;

                    bin_shares.shares += shares_to_mint;
                    user_shares.shares += shares_to_mint;
                    
                    store_shares_in_position(&mut position, user_shares);
                    store_bin_in_vec(&mut cur_bin_vec, bin_id, bin);
                    store_bin_in_vec(&mut cur_shares_vec, bin_id, bin_shares);
                }
                true => {
                    assert!(modify_arg.amount > 0);
                    assert!(user_shares.shares >= modify_arg.amount);

                    let removal_ratio = upscale(&env, modify_arg.amount, BONE)
                        .fixed_div_floor(&env, &upscale(&env, bin_shares.shares, BONE), &bone_i256);

                    let amount_x_to_remove = downscale_floor(
                        &env,
                        &removal_ratio.fixed_mul_floor(
                            &env,
                            &upscale(&env, bin.reserve_x, BONE),
                            &bone_i256,
                        ),
                        BONE,
                    );
                    
                    let amount_y_to_remove = downscale_floor(
                        &env,
                        &removal_ratio.fixed_mul_floor(
                            &env,
                            &upscale(&env, bin.reserve_y, BONE),
                            &bone_i256,
                        ),
                        BONE,
                    );
                    
                    x_amount_delta -= amount_x_to_remove;
                    y_amount_delta -= amount_y_to_remove;
                    
                    bin.reserve_x -= amount_x_to_remove;
                    bin.reserve_y -= amount_y_to_remove;
                    
                    bin_shares.shares -= modify_arg.amount;
                    user_shares.shares -= modify_arg.amount;


                    if user_shares.shares == 0 {
                        delete_shares_in_position(&mut position, user_shares);
                    }else{
                        store_shares_in_position(&mut position, user_shares);
                    }

                    store_bin_in_vec(&mut cur_bin_vec, bin_id, bin);
                    store_bin_in_vec(&mut cur_shares_vec, bin_id, bin_shares);
                }
            };
        }
        store_bin_vec(&env, cur_vec_id, &cur_bin_vec);
        store_shares_vec(&env, cur_vec_id, &cur_shares_vec);
        store_position(&env, DataKey::Position(from.clone(), position_id), &position);
        
        let (x_to, x_from) = if x_amount_delta > 0 {
            (env.current_contract_address(), from.clone())
        }else{
            (from.clone(), env.current_contract_address())
        };
        
        let (y_to, y_from) = if y_amount_delta > 0 {
            (env.current_contract_address(), from.clone())
        }else{
            (from.clone(), env.current_contract_address())
        };
        
        if x_amount_delta != 0 {
            transfer(
                &env,
                config.token_x.clone(),
                x_from,
                x_to,
                x_amount_delta.abs(),
            )
        }
        
        if y_amount_delta != 0 {
            transfer(
                &env,
                config.token_y.clone(),
                y_from,
                y_to,
                y_amount_delta.abs(),
            )
        }
        

        (x_amount_delta, y_amount_delta)
    }


    pub fn swap_exact_amount_in(env: Env, from: Address, amount_in: i128, min_amount_out: i128, in_token: Address) -> i128 {
        from.require_auth();
        let config = get_config(&env);

        assert!(amount_in > 0);
        assert!(min_amount_out >= 0);
        assert!(in_token == config.token_x || in_token == config.token_y);

        transfer(
            &env,
            in_token.clone(),
            from.clone(),
            env.current_contract_address(),
            amount_in,
        );


        let out_token = if in_token == config.token_x {
            config.token_y.clone()
        }else{
            config.token_x.clone()
        };

        let is_x_in = in_token == config.token_x;

        let bone_i256 = I256::from_i128(&env, BONE);
        let zero_i256 = I256::from_i128(&env, 0);

        let upscaled_fee = upscale(&env, config.fee as i128, FEE_SCALAR);

        let mut cur_bin_id = config.active_bin;
        let mut cur_vec_id = get_vec_id_for_bin(cur_bin_id);
        let mut cur_bin_vec: Vec<Bin> = get_bin_vec_or_default(&env, cur_vec_id, config.active_bin);

        let amount_in_scaled = upscale(&env, amount_in, BONE);
        let mut amount_in_remaining = amount_in_scaled.clone();
        let mut amount_out = I256::from_i128(&env, 0);

        // loop through the vecs
        loop {

            //TODO: handle when next vec has no liquidity

            // reverse ranges are hard
            let len = cur_bin_vec.len() as i32;
            let loop_params = if is_x_in {
                (get_bin_position_in_vec(cur_bin_id) as i32, 1)
            } else {
                (get_bin_position_in_vec(cur_bin_id) as i32, -1)
            };

            // here we loop over the bins of the vec
            let mut i = loop_params.0;
            loop {
                if i >= len || i < 0 {
                    break;
                }

                let mut bin = cur_bin_vec.get(i as u32).unwrap();


                // here we check that there is liq for the swap
                if is_x_in {
                    if bin.reserve_y == 0 {
                        i += loop_params.1;
                        continue;
                    }
                }else {
                    if bin.reserve_x == 0 {
                        i += loop_params.1;
                        continue;
                    }
                }


                cur_bin_id = bin.bin_id;

                let price_with_fee = {
                    let _price = price_from_bin_and_token(&env, &config, bin.bin_id, in_token.clone());

                    if config.fee == 0 {
                        _price
                    } else {
                        // price = price - (price * fee_pct / bone))
                        _price.sub(&_price.fixed_mul_ceil(&env, &upscaled_fee, &bone_i256))
                    }
                };


                let potential_amount_out =
                    price_with_fee.fixed_mul_floor(&env, &amount_in_remaining, &bone_i256);

                // TODO: reduce code duplication

                if is_x_in {
                    let scaled_reserve = upscale(&env, bin.reserve_y, BONE);

                    // we can finish the trade
                    if potential_amount_out <= scaled_reserve {
                        amount_out = amount_out.add(&potential_amount_out);

                        bin.reserve_x = bin.reserve_x + downscale_floor(&env, &amount_in_remaining, BONE);
                        bin.reserve_y =
                            downscale_ceil(&env, &scaled_reserve.sub(&potential_amount_out), BONE);

                        amount_in_remaining = zero_i256.clone();

                        cur_bin_vec.set(i as u32, bin);
                        break;
                    } else {
                        amount_out = amount_out.add(&scaled_reserve);

                        let amount_in_consumed = scaled_reserve
                            .fixed_div_floor(&env, &potential_amount_out, &bone_i256)
                            .fixed_mul_ceil(&env, &amount_in_remaining, &bone_i256);

                        amount_in_remaining = amount_in_remaining.sub(&amount_in_consumed);

                        bin.reserve_x = bin.reserve_x + downscale_ceil(&env, &amount_in_consumed, BONE);
                        bin.reserve_y = 0;

                        cur_bin_vec.set(i as u32, bin);
                    }
                } else {
                    let scaled_reserve = upscale(&env, bin.reserve_x, BONE);

                    // we can finish the trade
                    if potential_amount_out <= scaled_reserve {
                        amount_out = amount_out.add(&potential_amount_out);

                        bin.reserve_y = bin.reserve_y + downscale_floor(&env, &amount_in_remaining, BONE);
                        bin.reserve_x =
                            downscale_ceil(&env, &scaled_reserve.sub(&potential_amount_out), BONE);

                        amount_in_remaining = zero_i256.clone();

                        cur_bin_vec.set(i as u32, bin);
                        break;
                    } else {
                        amount_out = amount_out.add(&scaled_reserve);

                        let amount_in_consumed = scaled_reserve
                            .fixed_div_floor(&env, &potential_amount_out, &bone_i256)
                            .fixed_mul_ceil(&env, &amount_in_remaining, &bone_i256);

                        amount_in_remaining = amount_in_remaining.sub(&amount_in_consumed);

                        bin.reserve_y = bin.reserve_y + downscale_ceil(&env, &amount_in_consumed, BONE);
                        bin.reserve_x = 0;

                        cur_bin_vec.set(i as u32, bin);
                    }
                }
                i += loop_params.1;
            }

            store_bin_vec(&env, cur_vec_id, &cur_bin_vec);

            if amount_in_remaining == zero_i256{ break; }

            cur_vec_id += loop_params.1;
            cur_bin_id += loop_params.1;
            cur_bin_vec = get_bin_vec_or_default(&env, cur_vec_id, config.active_bin);
        }

        let mut config = config.clone();
        config.active_bin = cur_bin_id;
        store_config(&env, &config);

        let downscaled_out = downscale_floor(&env, &amount_out, BONE);

        assert!(downscaled_out >= min_amount_out, "Insufficient output amount");

        transfer(
            &env,
            out_token.clone(),
            env.current_contract_address(),
            from.clone(),
            downscaled_out,
        );

        downscaled_out
    }

    pub fn get_bin_vec(env: Env, vec_id: i32) -> Vec<Bin> {
        get_bin_vec_or_default(&env, vec_id, get_config(&env).active_bin)
    }

    pub fn get_shares_vec(env: Env, vec_id: i32) -> Vec<BinShares> {
        get_shares_vec_or_default(&env, vec_id)
    }

    pub fn get_position(env: Env, from: Address, position_id: i32) -> Option<Position> {
        get_position(&env, DataKey::Position(from.clone(), position_id))
    }

    pub fn get_config(env: Env) -> Config {
        get_config(&env)
    }
}

mod test;
mod storage;
mod constants;
mod math;
mod error;
mod bin;
mod shares;
mod token;
mod price;
