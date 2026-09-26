use anchor_lang::prelude::*;
use anchor_spl::token::{self, InitializeAccount3, Mint, Token, TokenAccount};

use crate::{
    constants::*,
    error::ErrorCode,
    pricing,
    state::{Event, EventStatus},
};

#[derive(Accounts)]
#[instruction(event_id: u64)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub organiser: Signer<'info>,

    #[account(
        init,
        payer = organiser,
        space = 8 + Event::INIT_SPACE,
        seeds = [EVENT_SEED, organiser.key().as_ref(), event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event: Account<'info, Event>,

    /// CHECK: not yet an SPL token account when passed in; created and initialized
    /// by hand in the handler (avoids anchor-spl's `token::` init sugar, which pulls
    /// in the token_2022 feature and its nightly-only build in this toolchain).
    /// Its address is verified by the seeds/bump constraint below.
    #[account(
        mut,
        seeds = [VAULT_SEED, event.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn handle_create_event(
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
    pricing::validate_params(fixed, per_head, margin_bps, p_min, p_max, n_min, n_max)?;
    require!(
        deadline > Clock::get()?.unix_timestamp,
        ErrorCode::DeadlineInPast
    );

    let event_key = ctx.accounts.event.key();
    let vault_bump = ctx.bumps.vault;
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, event_key.as_ref(), &[vault_bump]];
    let signer_seeds: &[&[&[u8]]] = &[vault_seeds];

    let space = TokenAccount::LEN as u64;
    let lamports = Rent::get()?.minimum_balance(space as usize);

    let create_ctx = CpiContext::new_with_signer(
        anchor_lang::system_program::ID,
        anchor_lang::system_program::CreateAccount {
            from: ctx.accounts.organiser.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
        signer_seeds,
    );
    anchor_lang::system_program::create_account(create_ctx, lamports, space, &token::ID)?;

    let init_ctx = CpiContext::new(
        token::ID,
        InitializeAccount3 {
            account: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.event.to_account_info(),
        },
    );
    token::initialize_account3(init_ctx)?;

    let event = &mut ctx.accounts.event;
    event.organiser = ctx.accounts.organiser.key();
    event.event_id = event_id;
    event.mint = ctx.accounts.mint.key();
    event.fixed = fixed;
    event.per_head = per_head;
    event.margin_bps = margin_bps;
    event.p_min = p_min;
    event.p_max = p_max;
    event.n_min = n_min;
    event.n_max = n_max;
    event.deadline = deadline;
    event.attendee_count = 0;
    event.final_price = 0;
    event.status = EventStatus::Open;
    event.organiser_withdrawn = false;
    event.bump = ctx.bumps.event;
    event.vault_bump = vault_bump;

    Ok(())
}
