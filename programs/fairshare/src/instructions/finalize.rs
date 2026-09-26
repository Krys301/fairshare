use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::ErrorCode,
    pricing,
    state::{Event, EventStatus},
};

#[derive(Accounts)]
pub struct Finalize<'info> {
    #[account(
        mut,
        seeds = [EVENT_SEED, event.organiser.as_ref(), event.event_id.to_le_bytes().as_ref()],
        bump = event.bump,
    )]
    pub event: Account<'info, Event>,
}

pub fn handle_finalize(ctx: Context<Finalize>) -> Result<()> {
    let event = &mut ctx.accounts.event;

    require!(event.status == EventStatus::Open, ErrorCode::EventNotOpen);

    let now = Clock::get()?.unix_timestamp;
    let deadline_passed = now > event.deadline;
    let capacity_reached = event.attendee_count >= event.n_max;
    require!(
        deadline_passed || capacity_reached,
        ErrorCode::CannotFinalizeYet
    );

    if event.attendee_count < event.n_min {
        event.status = EventStatus::Cancelled;
    } else {
        event.final_price = pricing::price(
            event.attendee_count,
            event.fixed,
            event.per_head,
            event.margin_bps,
            event.p_min,
            event.p_max,
        )?;
        event.status = EventStatus::Finalised;
    }

    Ok(())
}
