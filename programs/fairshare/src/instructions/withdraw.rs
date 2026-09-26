use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    error::ErrorCode,
    state::{Event, EventStatus},
};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub organiser: Signer<'info>,

    #[account(
        mut,
        constraint = event.organiser == organiser.key() @ ErrorCode::Unauthorized,
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

    #[account(mut, constraint = organiser_token_account.mint == event.mint @ ErrorCode::WrongMint)]
    pub organiser_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let event = &ctx.accounts.event;

    require!(event.status == EventStatus::Finalised, ErrorCode::EventNotFinalized);
    require!(!event.organiser_withdrawn, ErrorCode::AlreadyWithdrawn);

    let amount = event
        .attendee_count
        .checked_mul(event.final_price)
        .ok_or(ErrorCode::Overflow)?;

    let event_id_bytes = event.event_id.to_le_bytes();
    let event_seeds: &[&[u8]] = &[
        EVENT_SEED,
        event.organiser.as_ref(),
        &event_id_bytes,
        &[event.bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[event_seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.organiser_token_account.to_account_info(),
        authority: ctx.accounts.event.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds);
    token::transfer(cpi_ctx, amount)?;

    ctx.accounts.event.organiser_withdrawn = true;

    Ok(())
}
