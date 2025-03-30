use soroban_sdk::{Address, Env};
use soroban_sdk::token::TokenClient;

pub fn transfer(e: &Env, token: Address, from: Address, recipient: Address, amount: i128) {
    TokenClient::new(e, &token).transfer(&from, &recipient, &amount);
}