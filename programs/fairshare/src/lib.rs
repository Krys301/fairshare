pub mod constants;
pub mod error;
pub mod instructions;
pub mod pricing;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("5hqL9x1dqFpLutMWZ6Q1QaqcXAZyZciviw8ConPKLZrh");

#[program]
pub mod fairshare {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        crate::instructions::initialize::handle_initialize(ctx)
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        crate::instructions::increment::handle_increment(ctx)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_id: u64,
        fixed: u64,
        per_head: u64,
        margin_bps: u16,
        p_min: u64,
        p_max: u64,
        n_min: u64,
        n_max: u64,
        deadline: i64,
    ) -> Result<()> {
        crate::instructions::create_event::handle_create_event(
            ctx, event_id, fixed, per_head, margin_bps, p_min, p_max, n_min, n_max, deadline,
        )
    }

    pub fn join(ctx: Context<Join>) -> Result<()> {
        crate::instructions::join::handle_join(ctx)
    }

    pub fn finalize(ctx: Context<Finalize>) -> Result<()> {
        crate::instructions::finalize::handle_finalize(ctx)
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        crate::instructions::claim_refund::handle_claim_refund(ctx)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        crate::instructions::withdraw::handle_withdraw(ctx)
    }
}
