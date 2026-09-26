use crate::error::ErrorCode;
use anchor_lang::prelude::*;

const BPS_DENOMINATOR: u128 = 10_000;

/// price(n) = clamp( (fixed / n + per_head) * (1 + margin_bps / 10000), p_min, p_max ),
/// rounded up so the vault can never end up short.
pub fn price(
    n: u64,
    fixed: u64,
    per_head: u64,
    margin_bps: u16,
    p_min: u64,
    p_max: u64,
) -> Result<u64> {
    let raw = raw_price(n, fixed, per_head, margin_bps)?;
    Ok(clamp(raw, p_min, p_max))
}

/// The unclamped (fixed / n + per_head) * (1 + margin_bps / 10000), rounded up.
/// Used directly by validate_params so a low p_max is judged against the true
/// cost-covering price rather than a value already clamped down to p_max.
fn raw_price(n: u64, fixed: u64, per_head: u64, margin_bps: u16) -> Result<u64> {
    require!(n > 0, ErrorCode::ZeroAttendees);

    let n128 = n as u128;

    let cost = (per_head as u128)
        .checked_mul(n128)
        .ok_or(ErrorCode::Overflow)?
        .checked_add(fixed as u128)
        .ok_or(ErrorCode::Overflow)?;

    let margin_multiplier = BPS_DENOMINATOR
        .checked_add(margin_bps as u128)
        .ok_or(ErrorCode::Overflow)?;

    let numerator = cost
        .checked_mul(margin_multiplier)
        .ok_or(ErrorCode::Overflow)?;

    let denominator = n128
        .checked_mul(BPS_DENOMINATOR)
        .ok_or(ErrorCode::Overflow)?;

    let raw = ceil_div(numerator, denominator)?;

    raw.try_into().map_err(|_| error!(ErrorCode::Overflow))
}

/// Rejects parameter combinations that would make an event unwinnable or unsafe:
/// zero values, an inverted attendee/price range, or a cap that would sell below cost.
pub fn validate_params(
    fixed: u64,
    per_head: u64,
    margin_bps: u16,
    p_min: u64,
    p_max: u64,
    n_min: u64,
    n_max: u64,
) -> Result<()> {
    require!(
        n_min != 0 && n_max != 0 && p_min != 0 && p_max != 0,
        ErrorCode::ZeroParameter
    );
    require!(n_min <= n_max, ErrorCode::InvalidAttendeeRange);
    require!(p_min <= p_max, ErrorCode::InvalidPriceRange);

    let price_at_n_min = raw_price(n_min, fixed, per_head, margin_bps)?;
    require!(p_max >= price_at_n_min, ErrorCode::PriceCapBelowCost);

    Ok(())
}

fn clamp(value: u64, min: u64, max: u64) -> u64 {
    if value < min {
        min
    } else if value > max {
        max
    } else {
        value
    }
}

fn ceil_div(numerator: u128, denominator: u128) -> Result<u128> {
    require!(denominator > 0, ErrorCode::Overflow);
    let sum = numerator
        .checked_add(denominator - 1)
        .ok_or(ErrorCode::Overflow)?;
    Ok(sum / denominator)
}

#[cfg(test)]
mod tests {
    use super::*;

    // PRD worked example: F=2000, c=5, margin=10%, p_min=10, p_max=50 (USDC, 6 decimals).
    const FIXED: u64 = 2_000_000_000;
    const PER_HEAD: u64 = 5_000_000;
    const MARGIN_BPS: u16 = 1_000;
    const P_MIN: u64 = 10_000_000;
    const P_MAX: u64 = 50_000_000;
    const N_MIN: u64 = 50;
    const N_MAX: u64 = 400;

    fn worked_price(n: u64) -> u64 {
        price(n, FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX).unwrap()
    }

    #[test]
    fn worked_example_matches_prd() {
        assert_eq!(worked_price(50), 49_500_000);
        assert_eq!(worked_price(100), 27_500_000);
        assert_eq!(worked_price(200), 16_500_000);
        assert_eq!(worked_price(400), 11_000_000);
    }

    #[test]
    fn clamps_to_p_max_for_small_n() {
        assert_eq!(worked_price(1), P_MAX);
    }

    #[test]
    fn clamps_to_p_min_for_large_n() {
        assert_eq!(worked_price(100_000), P_MIN);
    }

    #[test]
    fn zero_attendees_errors() {
        assert!(price(0, FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX).is_err());
    }

    #[test]
    fn price_never_increases_as_n_increases() {
        let mut previous = worked_price(1);
        for n in 2..=1000u64 {
            let current = worked_price(n);
            assert!(
                current <= previous,
                "price rose from {} to {} at n={}",
                previous,
                current,
                n
            );
            previous = current;
        }
    }

    #[test]
    fn organiser_always_covers_costs() {
        for n in N_MIN..=1000u64 {
            let p = worked_price(n);
            let revenue = n.checked_mul(p).unwrap();
            let cost = FIXED + PER_HEAD * n;
            assert!(
                revenue >= cost,
                "revenue {} < cost {} at n={}",
                revenue,
                cost,
                n
            );
        }
    }

    #[test]
    fn validate_params_accepts_worked_example() {
        assert!(validate_params(FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX, N_MIN, N_MAX).is_ok());
    }

    #[test]
    fn validate_params_rejects_zero_values() {
        assert!(validate_params(FIXED, PER_HEAD, MARGIN_BPS, 0, P_MAX, N_MIN, N_MAX).is_err());
        assert!(validate_params(FIXED, PER_HEAD, MARGIN_BPS, P_MIN, 0, N_MIN, N_MAX).is_err());
        assert!(validate_params(FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX, 0, N_MAX).is_err());
        assert!(validate_params(FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX, N_MIN, 0).is_err());
    }

    #[test]
    fn validate_params_rejects_inverted_attendee_range() {
        assert!(validate_params(FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX, 400, 50).is_err());
    }

    #[test]
    fn validate_params_rejects_inverted_price_range() {
        assert!(validate_params(FIXED, PER_HEAD, MARGIN_BPS, 50_000_000, 10_000_000, N_MIN, N_MAX).is_err());
    }

    #[test]
    fn validate_params_rejects_cap_below_cost() {
        assert!(validate_params(FIXED, PER_HEAD, MARGIN_BPS, 1_000_000, 5_000_000, N_MIN, N_MAX).is_err());
    }
}
