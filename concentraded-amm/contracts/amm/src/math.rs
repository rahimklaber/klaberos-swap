use soroban_fixed_point_math::SorobanFixedPoint;
use soroban_sdk::{assert_with_error, Env, I256};
use crate::error::Error;

pub const BONE: i128 = 10i128.pow(18);
pub const FEE_SCALAR: i128 = 10i128.pow(14);
pub const MIN_CPOW_BASE: i128 = 1;
pub const MAX_CPOW_BASE: i128 = (2 * BONE) - 1;
pub const CPOW_PRECISION: i128 = 10i128.pow(8);

/// constants

/********** Scaling Utils **********/

/// Upscale a number to 18 decimals and 256 bits for use in pool math
///
/// Requires that "amount" is less that 1.7e19 * scalar
///
/// Will fail if `amount` is greater than 1e18 * scalar
pub fn upscale(e: &Env, amount: i128, scalar: i128) -> I256 {
    I256::from_i128(e, amount * scalar)
}

/// Downscale a number from 18 decimals and 256 bits to i128 to represent a token amount.
///
/// Rounds floor if there is any remainder.
pub fn downscale_floor(e: &Env, amount: &I256, scalar: i128) -> i128 {
    let scale_256 = I256::from_i128(e, scalar);
    let one = I256::from_i32(e, 1);
    let result = amount.fixed_div_floor(&e, &scale_256, &one).to_i128();
    assert_with_error!(&e, result.is_some(), Error::ErrMathApprox);
    result.unwrap()
}

/// Descale a number from 18 decimals and 256 bits to i128 to represent a token amount.
///
/// Rounds up if there is any remainder.
pub fn downscale_ceil(e: &Env, amount: &I256, scalar: i128) -> i128 {
    let scale_256 = I256::from_i128(e, scalar);
    let one = I256::from_i32(e, 1);
    let result = amount.fixed_div_ceil(&e, &scale_256, &one).to_i128();
    assert_with_error!(&e, result.is_some(), Error::ErrMathApprox);
    result.unwrap()
}

/// Perform a - b, or panic if a < b
pub fn sub_no_negative(e: &Env, a: &I256, b: &I256) -> I256 {
    assert_with_error!(e, a >= b, Error::ErrSubUnderflow);
    a.sub(&b)
}

/// Calculate base^exp where base and exp are fixed point numbers with 18 decimals.
///
/// Approximates the result such that:
/// -> base^(int exp) * approximate of base^(decimal exp)
pub fn c_pow(e: &Env, base: &I256, exp: &I256, round_up: bool) -> I256 {
    assert_with_error!(
        e,
        base >= &I256::from_i128(e, MIN_CPOW_BASE),
        Error::ErrCPowBaseTooLow
    );
    assert_with_error!(
        e,
        base <= &I256::from_i128(e, MAX_CPOW_BASE),
        Error::ErrCPowBaseTooHigh
    );

    let bone = I256::from_i128(e, BONE);
    let int = exp.div(&bone);
    let remain = exp.sub(&int.mul(&bone));
    let whole_pow = c_powi(e, &base, &(int.to_i128().unwrap() as u32));
    if remain == I256::from_i128(e, 0) {
        return whole_pow;
    }
    let partial_result = c_pow_approx(
        e,
        &base,
        &remain,
        &I256::from_i128(e, CPOW_PRECISION),
        round_up,
    );
    if round_up {
        whole_pow.fixed_mul_ceil(e, &partial_result, &bone)
    } else {
        whole_pow.fixed_mul_floor(e, &partial_result, &bone)
    }
}

// Calculate a^n where n is an integer
fn c_powi(e: &Env, a: &I256, n: &u32) -> I256 {
    let bone = I256::from_i128(e, BONE);
    let mut z = if n % 2 != 0 { a.clone() } else { bone.clone() };

    let mut a = a.clone();
    let mut n = n / 2;
    while n != 0 {
        a = a.fixed_mul_floor(e, &a, &bone);
        if n % 2 != 0 {
            z = z.fixed_mul_floor(e, &a, &bone);
        }
        n = n / 2
    }
    z
}

// Calculate approximate Power Value
fn c_pow_approx(e: &Env, base: &I256, exp: &I256, precision: &I256, round_up: bool) -> I256 {
    // term 0
    let bone = I256::from_i128(e, BONE);
    let zero = I256::from_i32(e, 0);
    let n_1 = I256::from_i32(e, -1);
    let x = base.sub(&bone);
    let mut term = bone.clone();
    let mut sum = term.clone();
    let prec = precision.clone();
    // Capped to limit iterations in the event of a poor approximation
    // Max resource impact at 50 iterations:
    //  -> CPU: 5M inst
    //  -> Mem: 150 kB
    for i in 1..51 {
        let big_k = I256::from_i128(e, i * BONE);
        let c = exp.sub(&big_k.sub(&bone));
        term = term.fixed_mul_floor(e, &c.fixed_mul_floor(e, &x, &bone), &bone);
        term = term.fixed_div_floor(e, &big_k, &bone);
        sum = sum.add(&term);

        let abs_term = if term < zero {
            term.mul(&n_1)
        } else {
            term.clone()
        };
        if abs_term <= prec {
            break;
        }
    }
    // the series has predicatable approximations bounds, so we can adjust the final sum by
    // the final term to (almost) ensure the sum is either an under or over estimate based
    // on the rounding direction.
    if x > zero {
        // series will oscillate due to negative `c` values and a starting positive value.
        if term > zero && !round_up {
            // the final applied term was additive - the current sum is likely an overestimate
            sum = sum.sub(&term);
        } else if term < zero && round_up {
            // the final applied term was subtractive - the current sum is likely an understimate
            sum = sum.sub(&term);
        }
    } else if !round_up {
        // series is monotonically decreasing, so the final term is an overestimate
        sum = sum.add(&term);
    }
    sum
}