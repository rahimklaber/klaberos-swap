use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    ErrNegative = 2,
    ErrMathApprox = 18,
    ErrAddOverflow = 30,
    ErrSubUnderflow = 31,
    ErrDivInternal = 32,
    ErrMulOverflow = 33,
    ErrCPowBaseTooLow = 34,
    ErrCPowBaseTooHigh = 35,
    ErrNegativeOrZero = 37,
}