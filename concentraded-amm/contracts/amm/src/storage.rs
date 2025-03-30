use crate::bin::{default_bin_vec, default_shares_vec};
use crate::constants::BIN_VEC_SIZE;
use soroban_sdk::{contracttype, vec, Address, Env, TryIntoVal, Val, Vec};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Config,
    BinVec(i32),
    BinShareVec(i32),
    Position(Address, i32),
}

/// stored as vec[shares]
#[contracttype]
#[derive(Clone, Debug, Default, Copy, PartialEq)]
pub struct BinShares {
    pub bin_id: i32,
    pub shares: i128,
}

/// stored as vec[reserve_x|reserve_y] if not active bin
/// otherwise if active_bin, it is stored as vec[reserve_x, reserve_y]
#[contracttype]
#[derive(Clone, Debug, Default, Copy, PartialEq)]
pub struct Bin {
    pub bin_id: i32,
    pub reserve_x: i128,
    pub reserve_y: i128,
}

// pub fn get_bin_vec<T>(env: &Env, key: DataKey) -> Option<Vec<T>>
// where
//     Val: TryFromVal<Env, T>,
//     T: TryFromVal<Env, Val>,
// {
//     env.storage().persistent().get(&key)
// }

pub fn get_bin_vec(env: &Env, vec_id: i32, active_bin: i32) -> Option<Vec<Bin>> {
    let raw: Option<Vec<Vec<i128>>> = env.storage().persistent().get(&DataKey::BinVec(vec_id));

    if raw.is_none() {
        return None;
    }

    let raw_vec = raw.unwrap();
    let mut bin_array = [Bin::default(); BIN_VEC_SIZE as usize];

    for i in 0..raw_vec.len() {
        let mut raw_bin: Vec<i128> = raw_vec.get_unchecked(i);

        let bin_id: i32 = get_first_bin_id_in_vec(vec_id) + i as i32;

        let reserve_x = if bin_id < active_bin || bin_id == active_bin{
            raw_bin.get_unchecked(0).try_into_val(env).unwrap()
        } else {
            0
        };

        let reserve_y = if bin_id > active_bin {
            raw_bin.get_unchecked(0).try_into_val(env).unwrap()
        } else if bin_id == active_bin {
            raw_bin.get_unchecked(1).try_into_val(env).unwrap()
        }else {
            0
        };

        bin_array[i as usize] = Bin{bin_id, reserve_x, reserve_y};
    }

    Some(Vec::from_array(&env, bin_array))
}

pub fn get_shares_vec(env: &Env, vec_id: i32) -> Option<Vec<BinShares>> {
    let raw: Option<Vec<i128>> = env.storage().persistent().get(&DataKey::BinShareVec(vec_id));

    if raw.is_none() {
        return None;
    }

    let raw_vec = raw.unwrap();
    let mut bin_array = [BinShares::default(); BIN_VEC_SIZE as usize];

    for i in 0..raw_vec.len() {
        let shares: i128 = raw_vec.get_unchecked(i);

        let bin_id: i32 = get_first_bin_id_in_vec(vec_id) + i as i32;

        bin_array[i as usize] = BinShares{bin_id, shares};
    }

    // dbg!(&bin_array);

    Some(Vec::from_array(&env, bin_array))
}

pub fn get_bin_vec_or_default(env: &Env, vec_id: i32, active_bin: i32) -> Vec<Bin> {
    get_bin_vec(env, vec_id, active_bin).unwrap_or_else(|| default_bin_vec(env, vec_id))
}

pub fn get_shares_vec_or_default(env: &Env, vec_id: i32) -> Vec<BinShares> {
    get_shares_vec(env,vec_id)
        .unwrap_or_else(|| default_shares_vec(env, vec_id))
}

pub fn bin_to_vec(env: &Env, bin: &Bin) -> Vec<i128>{
    if bin.reserve_x > 0 && bin.reserve_y > 0 {
        Vec::from_array(&env, [bin.reserve_x, bin.reserve_y])
    }else{
        let reserve = if bin.reserve_x > 0 {bin.reserve_x} else {bin.reserve_y};
        Vec::from_array(&env, [reserve])
    }
}

pub fn store_bin_vec(env: &Env, vec_id: i32, vec: &Vec<Bin>) {
    let mut array = [Val::default(); BIN_VEC_SIZE as usize];

    for i in 0..BIN_VEC_SIZE as usize{
        let bin_val = bin_to_vec(env, &vec.get_unchecked(i as u32));

        array[i] = bin_val.to_val(); // not actually sure if this is better :shrug:
    }

    env.storage()
        .persistent()
        .set(&DataKey::BinVec(vec_id), &Vec::from_array(env, array))
}

pub fn store_shares_vec(env: &Env, vec_id: i32, vec: &Vec<BinShares>) {
    let mut array = [0i128; BIN_VEC_SIZE as usize];

    for i in 0..BIN_VEC_SIZE as usize{

        array[i] = vec.get_unchecked(i as u32).shares;
    }

    env.storage()
        .persistent()
        .set(&DataKey::BinShareVec(vec_id), &Vec::from_array(env, array))
}

/// bin_id_or_offset is either the bin id or the offset from the current active bin
/// amount specifies the token amount or the amount of shares, depending on the value of `is_remove`
/// I didn't like how the DepositArgs showed up in stellar expert, so I changed it from a sum type to a struct
#[contracttype]
#[derive(Clone, Debug)]
pub struct DepositArgs {
    pub is_remove: bool,
    pub bin_id_or_offset: i32,
    pub amount: i128,
}


// #[contracttype]
// #[derive(Clone)]
// pub struct RemoveArgs {
//     pub bin_id_or_offset: i32,
//     pub shares: i128,
// }

#[contracttype]
#[derive(Clone, Debug)]
pub struct Config {
    pub token_x: Address,
    pub token_y: Address,
    pub bin_step: u32,
    pub active_bin: i32,
    pub fee: u32,
    // pub protocol_fee: u32,
    // pub fee_recipient: Address,
}

pub fn get_config(env: &Env) -> Config {
    env.storage().instance().get(&DataKey::Config).unwrap()
}

pub fn store_config(env: &Env, config: &Config) {
    env.storage().instance().set(&DataKey::Config, config);
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Position {
    pub bin_shares: Vec<BinShares>,
}

pub fn get_position(env: &Env, key: DataKey) -> Option<Position> {
    env.storage().persistent().get(&key)
}

pub fn get_position_or_default(env: &Env, key: DataKey) -> Position {
    get_position(env, key).unwrap_or_else(|| Position {
        bin_shares: vec![&env],
    })
}

pub fn store_position(env: &Env, key: DataKey, position: &Position) {
    env.storage().persistent().set(&key, position);
}

/// We store bins in lists of size `BIN_VEC_SIZE`
/// This function finds the id of the list for a given `bin_id`
pub fn get_vec_id_for_bin(bin_id: i32) -> i32 {
    if bin_id < 0 {
        return bin_id / BIN_VEC_SIZE - 1;
    }
    bin_id / BIN_VEC_SIZE
}

pub fn get_first_bin_id_in_vec(vec_id: i32) -> i32 {
    vec_id * BIN_VEC_SIZE
}