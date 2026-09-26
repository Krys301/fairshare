use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    error::ErrorCode,
    pricing,
    state::{Event, EventStatus, Ticket},
};

#[derive(Accounts)]
pub struct Join<'info> {
    #[account(mut)]
    pub attendee: Signer<'info>,

    #[account(
        mut,
        seeds = [EVENT_SEED, event.organiser.as_ref(), event.event_id.to_le_bytes().as_ref()],
        bump = event.bump,
    )]
    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [VAULT_SEED, event.key().as_ref()],
        bump = event.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut, constraint = attendee_token_account.mint == event.mint @ ErrorCode::WrongMint)]
    pub attendee_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = attendee,
        space = 8 + Ticket::INIT_SPACE,
        seeds = [TICKET_SEED, event.key().as_ref(), attendee.key().as_ref()],
        bump
    )]
    pub ticket: Account<'info, Ticket>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_join(ctx: Context<Join>) -> Result<()> {
    let event = &ctx.accounts.event;

    require!(event.status == EventStatus::Open, ErrorCode::EventNotOpen);
    require!(
        Clock::get()?.unix_timestamp <= event.deadline,
        ErrorCode::DeadlinePassed
    );
    require!(
        event.attendee_count < event.n_max,
        ErrorCode::EventAtCapacity
    );

    let new_count = event
        .attendee_count
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;
    let amount = pricing::price(
        new_count,
        event.fixed,
        event.per_head,
        event.margin_bps,
        event.p_min,
        event.p_max,
    )?;

    let cpi_accounts = Transfer {
        from: ctx.accounts.attendee_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.attendee.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(token::ID, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    let ticket = &mut ctx.accounts.ticket;
    ticket.event = event.key();
    ticket.attendee = ctx.accounts.attendee.key();
    ticket.amount_paid = amount;
    ticket.refund_claimed = false;
    ticket.bump = ctx.bumps.ticket;

    let event = &mut ctx.accounts.event;
    event.attendee_count = new_count;

    Ok(())
}
