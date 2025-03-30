export const BONE = 1000000000000000000n; // 1e18
export const _1e7 = 10000000n;
export const _1e11 = 100000000000n;
export const scalar = 10000000n;
export const ONE = 1n;
export const ZERO = 0n;

export const createFeeAdjustRatio = (fee: number) => (_1e7 - BigInt(Math.floor(fee * 1000))) * _1e11;

const cPowI = (a: bigint, n: number) => {
    let z = BONE;

    if (n % 2 !== 0) {
        z = a;
    }

    let nn = Math.floor(n / 2);
    let aa = a;

    while (nn !== 0) {
        aa = (aa * aa) / BONE;

        if (nn % 2 !== 0) {
            z = (z * aa) / BONE;
        }

        nn = Math.floor(nn / 2);
    }

    return z;
};

const cPowApprox = (base: bigint, exp: bigint, roundUp: boolean) => {
    const precision = 100000000n;

    let term = BONE;
    let sum = term;

    let x = base - BONE;

    for (let i = 1; i <= 50; i++) {
        let bigK = BONE * BigInt(i);
        let c = exp - (bigK - BONE);

        term = (term * ((x * c) / BONE)) / BONE;
        term = (term * BONE) / bigK;
        sum = sum + term;

        let absTerm = term < ZERO ? -term : term;

        if (absTerm <= precision) {
            break;
        }
    }

    if (x > ZERO) {
        if (term > ZERO && !roundUp) {
            sum = sum - term;
        } else if (term < ZERO && roundUp) {
            sum = sum - term;
        }
    } else if (!roundUp) {
        sum = sum + term;
    }

    return sum;
};

export const cPow = (base: bigint, exp: bigint, roundUp: boolean = false) => {
    const int = exp / BONE;
    const remain = exp - (int * BONE);

    let wholePow = cPowI(base, Number(int));
    if (remain === ZERO) {
        return wholePow;
    }

    let partialResult = cPowApprox(base, remain, roundUp);

    if (roundUp) {
        let t = wholePow * partialResult;
        let result = t / BONE;
        const remainder = t % BONE;

        if (remainder > ZERO) {
            result = result + ONE;
        }

        return result;
    }

    return (wholePow * partialResult) / BONE;
};

export const divCeil = (a: bigint, b: bigint): bigint => {
    let result = a / b;
    let remainder = a % b;

    if (remainder !== ZERO) {
        result = result + ONE;
    }

    return result;
};


export const priceFromBin = (binStep: number, id: number, roundUp: boolean): number => {
    const base = BONE + BigInt(Math.sign(id)) * (BigInt(binStep) * BONE / 10000n);
    const exp = BONE * BigInt(Math.abs(id));
    const r = cPow(base, exp, roundUp);

    return Number((r)) / Number(BONE);
};
