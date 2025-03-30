use crate::constants::BIN_VEC_SIZE;
use crate::storage::{get_vec_id_for_bin, Bin, BinShares, Position};
use soroban_sdk::{Env, TryFromVal, Val, Vec};

pub fn is_bin_in_vec(bin_id: i32, vec_id: i32) -> bool {
    get_vec_id_for_bin(bin_id) == vec_id
}

pub fn default_bin_vec(env: &Env, vec_id: i32) -> Vec<Bin>
{
    let mut array: [Bin; BIN_VEC_SIZE as usize] = [Bin::default(); BIN_VEC_SIZE as usize];
    let bin_id_at_zero = vec_id * BIN_VEC_SIZE;
    
    for i in 0..BIN_VEC_SIZE {
        array[i as usize].bin_id = bin_id_at_zero + i;
    }
    
    Vec::from_array(&env, array)
}

pub fn default_shares_vec(env: &Env, vec_id: i32) -> Vec<BinShares>
{
    let mut array: [BinShares; BIN_VEC_SIZE as usize] = [BinShares::default(); BIN_VEC_SIZE as usize];
    let bin_id_at_zero = vec_id * BIN_VEC_SIZE;

    for i in 0..BIN_VEC_SIZE {
        array[i as usize].bin_id = bin_id_at_zero + i;
    }

    Vec::from_array(&env, array)
}

pub fn get_bin_position_in_vec(bin_id: i32) -> u32 {
    let r = bin_id % BIN_VEC_SIZE;

    (if r < 0 { r + BIN_VEC_SIZE } else { r }) as u32
}

pub fn get_bin_from_vec<T>(vec: &Vec<T>, bin_id: i32) -> T
where
    T: TryFromVal<Env, Val>,
    Val: TryFromVal<Env, T>,
{
    vec.get(get_bin_position_in_vec(bin_id)).unwrap()
}

pub fn store_bin_in_vec<T>(vec: &mut Vec<T>, bin_id: i32, bin: T)
where
    T: TryFromVal<Env, Val>,
    Val: TryFromVal<Env, T>,
{
    vec.set(get_bin_position_in_vec(bin_id), bin)
}

/// We check if all the elements have no deposits
pub fn is_bin_vec_empty(vec: &Vec<Bin>) -> bool {
    vec.iter()
        .all(|bin| bin.reserve_x == 0 && bin.reserve_y == 0)
}
pub fn get_shares_from_position(position: &Position, bin_id: i32) -> BinShares {
    let res = position
        .bin_shares
        .iter().find(|shares| shares.bin_id == bin_id)
        .unwrap_or(BinShares { bin_id, shares: 0 });

    res
}

pub fn store_shares_in_position(position: &mut Position, bin_shares: BinShares) {
    let res = position.bin_shares
        .iter().position(|shares| shares.bin_id >= bin_shares.bin_id);

    let ele = if res.is_some() {
        Some(position.bin_shares.get_unchecked(res.unwrap() as u32))
    }else {None};

    if ele.is_some(){
        let unwrapped = ele.unwrap();
        if unwrapped.bin_id == bin_shares.bin_id {
            position.bin_shares.set(res.unwrap() as u32, bin_shares);
        }else{
            position.bin_shares.insert(res.unwrap() as u32, bin_shares);
        }
    } else {
        position.bin_shares.push_back(bin_shares);
    }
}

pub fn delete_shares_in_position(position: &mut Position, bin_shares: BinShares) {
    let res = position
        .bin_shares
        .iter().position(|shares| shares.bin_id == bin_shares.bin_id);

    if res.is_some() {
        position.bin_shares.remove(res.unwrap() as u32);
    }
}