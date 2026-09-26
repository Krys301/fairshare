use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub count: u64,
    pub authority: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum EventStatus {
    Open,
    Finalised,
    Cancelled,
}

#[account]
#[derive(InitSpace)]
pub struct Event {
    pub organiser: Pubkey,
    pub event_id: u64,
    pub mint: Pubkey,
    pub fixed: u64,
    pub per_head: u64,
    pub margin_bps: u16,
    pub p_min: u64,
    pub p_max: u64,
    pub n_min: u64,
    pub n_max: u64,
    pub deadline: i64,
    pub attendee_count: u64,
    pub final_price: u64,
    pub status: EventStatus,
    pub organiser_withdrawn: bool,
    pub bump: u8,
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Ticket {
    pub event: Pubkey,
    pub attendee: Pubkey,
    pub amount_paid: u64,
    pub refund_claimed: bool,
    pub bump: u8,
}
