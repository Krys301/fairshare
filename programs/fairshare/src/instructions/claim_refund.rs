use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    error::ErrorCode,
    state::{Event, EventStatus, Ticket},
};

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub attendee: Signer<'info>,

    #[account(
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
        mut,
        close = attendee,
        constraint = ticket.attendee == attendee.key() @ ErrorCode::Unauthorized,
        seeds = [TICKET_SEED, event.key().as_ref(), attendee.key().as_ref()],
        bump = ticket.bump,
    )]
    pub ticket: Account<'info, Ticket>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
    let event = &ctx.accounts.event;
    let ticket = &ctx.accounts.ticket;

    require!(
        event.status == EventStatus::Finalised || event.status == EventStatus::Cancelled,
        ErrorCode::NotClaimable
    );
    require!(!ticket.refund_claimed, ErrorCode::AlreadyClaimed);

    let refund_amount = if event.status == EventStatus::Finalised {
        ticket
            .amount_paid
            .checked_sub(event.final_price)
            .ok_or(ErrorCode::Overflow)?
    } else {
        ticket.amount_paid
    };

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
        to: ctx.accounts.attendee_token_account.to_account_info(),
        authority: ctx.accounts.event.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds);
    token::transfer(cpi_ctx, refund_amount)?;

    ctx.accounts.ticket.refund_claimed = true;

    Ok(())
}
