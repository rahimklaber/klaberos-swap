#![cfg(test)]
extern crate std;
use super::*;
use soroban_sdk::{vec, Env,};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::{StellarAssetClient, TokenClient};
use crate::bin::get_shares_from_position;
use crate::constants::BIN_VEC_SIZE;
use crate::storage::DepositArgs;

#[test]
fn test_get_shares_from_position() {
    let env = Env::default();
    let mut pos = Position{
        bin_shares: vec![&env]
    };
    
    pos.bin_shares.push_back(BinShares{bin_id: 1, shares: 100});
    pos.bin_shares.push_back(BinShares{bin_id: 2, shares: 100});
    pos.bin_shares.push_back(BinShares{bin_id: 4, shares: 100});
    
    let found = get_shares_from_position(&pos, 3);
    
    assert_eq!(found, BinShares{bin_id: 3, shares: 0});
}

#[test]
fn things_work() {
    let env = Env::default();
    env.mock_all_auths();

    let user_1 = Address::generate(&env);


    let token_a = env.register_stellar_asset_contract_v2(user_1.clone());
    let token_b = env.register_stellar_asset_contract_v2(user_1.clone());

    let token_a_admin_client = StellarAssetClient::new(&env, &token_a.address());
    let token_b_admin_client = StellarAssetClient::new(&env, &token_b.address());

    let token_a_client = TokenClient::new(&env, &token_a.address());
    let token_b_client = TokenClient::new(&env, &token_b.address());

    token_a_admin_client.mint(&user_1, &100000_000_000_0);
    token_b_admin_client.mint(&user_1, &100000_000_000_0);

    let contract_id = env.register(Contract, (Config{ token_x: token_a.address(), token_y: token_b.address(), bin_step: 10, active_bin: 0, fee: 0},));
    let client = ContractClient::new(&env, &contract_id);
    
    // let modify_args = vec![&env,
    //                        ActionArgs::Deposit(DepositArgs{bin_id_or_offset: 0, amount: 10_000_000_0}),
    //                        ActionArgs::Deposit(DepositArgs{bin_id_or_offset: 1, amount: 10_000_000_0}),
    // ];

    let modify_args = vec![&env,
                           DepositArgs{is_remove: false, bin_id_or_offset: 0, amount: 10_000_000_0},
                           DepositArgs{is_remove: false, bin_id_or_offset: 1, amount: 10_000_000_0},
    ];

    let amounts = client.modify_liquidity(&user_1, &0,  &modify_args, &false);
    assert_eq!(amounts, (5_000_000_0, 15_000_000_0));

    let shares_vec = client.get_shares_vec(&0);
    // we fill the vec fully with default data.
    assert_eq!(BinShares{bin_id: 0, shares: 10_000_000_0}, shares_vec.get(0).unwrap());
    assert_eq!(BinShares{bin_id: 1, shares: 10_000_000_0}, shares_vec.get(1).unwrap());
    assert!(shares_vec.len() == BIN_VEC_SIZE as u32 && shares_vec.iter().rev().take((BIN_VEC_SIZE - 2) as usize).all(|x| x.shares == 0));

    let bin_vec = client.get_bin_vec(&0);
    // 50 50 distribution at first deposit by default.
    // we fill the vec fully with default data.
    assert_eq!(Bin{bin_id: 0, reserve_x: 5_000_000_0, reserve_y: 5_000_000_0}, bin_vec.get(0).unwrap());
    assert_eq!(Bin{bin_id: 1, reserve_x: 0, reserve_y: 10_000_000_0}, bin_vec.get(1).unwrap());
    assert!(bin_vec.len() == BIN_VEC_SIZE as u32 && bin_vec.iter().rev().take((BIN_VEC_SIZE - 2) as usize).all(|x| x.reserve_x == 0 && x.reserve_y == 0));


    let token_a_balance_before = token_a_client.balance(&user_1);
    let token_b_balance_before = token_b_client.balance(&user_1);

    let swap_res = client.swap_exact_amount_in(&user_1, &6_000_000_0, &0, &token_a.address());

    let token_a_balance_after = token_a_client.balance(&user_1);
    let token_b_balance_after = token_b_client.balance(&user_1);

    assert_eq!(token_a_balance_before - token_a_balance_after, 6_000_000_0);
    assert_eq!(token_b_balance_before - token_b_balance_after, -5_999_000_9);
    // 1_000_000_0
    // 0_000_100_0
    assert_eq!(5_999_000_9, swap_res);
    assert_eq!(1, client.get_config().active_bin);

    let modify_args = vec![&env,
                           DepositArgs{is_remove: true, bin_id_or_offset: 0, amount: 10_000_000_0},
                           DepositArgs{is_remove: true, bin_id_or_offset: 1, amount: 10_000_000_0},
    ];

    let amounts = client.modify_liquidity(&user_1, &0,  &modify_args, &false);
    dbg!(&amounts);
    // we swapped so we got a small amount of fees
    assert!((amounts.0 + amounts.1) < -20_000_000_0);
}

#[test]
fn deposit_multiple_times() {
    let env = Env::default();
    env.mock_all_auths();

    let user_1 = Address::generate(&env);


    let token_a = env.register_stellar_asset_contract_v2(user_1.clone());
    let token_b = env.register_stellar_asset_contract_v2(user_1.clone());

    let token_a_client = StellarAssetClient::new(&env, &token_a.address());
    let token_b_client = StellarAssetClient::new(&env, &token_b.address());

    token_a_client.mint(&user_1, &100000_000_000_0);
    token_b_client.mint(&user_1, &100000_000_000_0);

    let contract_id = env.register(Contract, (Config{ token_x: token_a.address(), token_y: token_b.address(), bin_step: 10, active_bin: 0, fee: 0},));
    let client = ContractClient::new(&env, &contract_id);


    let modify_args = vec![&env,
                           DepositArgs{is_remove: false, bin_id_or_offset: 0, amount: 10_000_000_0},
                           DepositArgs{is_remove: false, bin_id_or_offset: 1, amount: 10_000_000_0},
    ];

    let amounts = client.modify_liquidity(&user_1, &0,  &modify_args, &false);

    let modify_args = vec![&env,
                           DepositArgs{is_remove: false, bin_id_or_offset: 0, amount: 10_000_000_0},
                           DepositArgs{is_remove: false, bin_id_or_offset: 1, amount: 10_000_000_0},
    ];

    let amounts = client.modify_liquidity(&user_1, &0,  &modify_args, &false);

    let position  = client.get_position(&user_1, &0).unwrap();

    let expected_position = Position{
        bin_shares: vec![&env, BinShares{bin_id: 0, shares: 20_000_000_0}, BinShares{bin_id: 1, shares: 20_000_000_0}],
    };
    assert_eq!(expected_position, position);

    let modify_args = vec![&env,
                           DepositArgs{is_remove: true, bin_id_or_offset: 0, amount: 20_000_000_0},
                           DepositArgs{is_remove: true, bin_id_or_offset: 1, amount: 20_000_000_0},
    ];

    let amounts = client.modify_liquidity(&user_1, &0,  &modify_args, &false);
    assert_eq!(amounts, (-10_000_000_0, -30_000_000_0));
}

#[test]
fn deposit_and_remove_in_same_call() {
    let env = Env::default();
    env.mock_all_auths();

    let user_1 = Address::generate(&env);


    let token_a = env.register_stellar_asset_contract_v2(user_1.clone());
    let token_b = env.register_stellar_asset_contract_v2(user_1.clone());

    let token_a_client = StellarAssetClient::new(&env, &token_a.address());
    let token_b_client = StellarAssetClient::new(&env, &token_b.address());

    token_a_client.mint(&user_1, &100000_000_000_0);
    token_b_client.mint(&user_1, &100000_000_000_0);

    let contract_id = env.register(Contract, (Config{ token_x: token_a.address(), token_y: token_b.address(), bin_step: 10, active_bin: 0, fee: 0},));
    let client = ContractClient::new(&env, &contract_id);


    let modify_args = vec![&env,
                           DepositArgs{is_remove: false, bin_id_or_offset: 0, amount: 10_000_000_0},
                           DepositArgs{is_remove: false, bin_id_or_offset: 1, amount: 10_000_000_0},
    ];
    client.modify_liquidity(&user_1, &0,  &modify_args, &false);

    let modify_args = vec![&env,
                           DepositArgs{is_remove: true, bin_id_or_offset: 0, amount: 10_000_000_0},
                           DepositArgs{is_remove: true, bin_id_or_offset: 1, amount: 10_000_000_0},
                           DepositArgs{is_remove: false, bin_id_or_offset: 2, amount: 10_000_000_0},
                           DepositArgs{is_remove: false, bin_id_or_offset: 3, amount: 10_000_000_0},
    ];

    let token_a_client_normal = TokenClient::new(&env, &token_a.address());
    let token_b_client_normal = TokenClient::new(&env, &token_b.address());

    let token_x_balance_before = token_a_client_normal.balance(&user_1);
    let token_y_balance_before = token_b_client_normal.balance(&user_1);

    let amounts = client.modify_liquidity(&user_1, &0,  &modify_args, &false);

    let position = client.get_position(&user_1, &0).unwrap();

    let expected_position = Position{
        bin_shares: vec![&env, BinShares{bin_id: 2, shares: 10_000_000_0}, BinShares{bin_id: 3, shares: 10_000_000_0}],
    };

    assert_eq!(expected_position, position);
    // bin 0 remove (5, 5)
    // bin 1 remove (0, 10)
    // bin 2 add (0, 10)
    // bin 3 add (0, 10)
    // = (-5, 5)
    assert_eq!(amounts, (-5_000_000_0, 5_000_000_0));

    let token_x_balance_after = token_a_client_normal.balance(&user_1);
    let token_y_balance_after = token_b_client_normal.balance(&user_1);

    assert_eq!(token_x_balance_before - token_x_balance_after, -5_000_000_0);
    assert_eq!(token_y_balance_before - token_y_balance_after, 5_000_000_0);
}