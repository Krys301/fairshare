use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the counter authority can update this counter")]
    Unauthorized,
    #[msg("Counter has reached the maximum value")]
    CounterOverflow,
    #[msg("Attendee count must be greater than zero")]
    ZeroAttendees,
    #[msg("Arithmetic overflow in price calculation")]
    Overflow,
    #[msg("A required parameter is zero")]
    ZeroParameter,
    #[msg("n_min must not be greater than n_max")]
    InvalidAttendeeRange,
    #[msg("p_min must not be greater than p_max")]
    InvalidPriceRange,
    #[msg("p_max is below the price at n_min; the cap would sell below cost")]
    PriceCapBelowCost,
    #[msg("Event is not open")]
    EventNotOpen,
    #[msg("Event deadline has passed")]
    DeadlinePassed,
    #[msg("Event is at capacity")]
    EventAtCapacity,
    #[msg("Event cannot be finalized yet: deadline not reached and capacity not full")]
    CannotFinalizeYet,
    #[msg("Token account mint does not match the event's mint")]
    WrongMint,
    #[msg("Event must be Finalised or Cancelled to claim a refund")]
    NotClaimable,
    #[msg("Refund has already been claimed")]
    AlreadyClaimed,
    #[msg("Event must be Finalised to withdraw")]
    EventNotFinalized,
    #[msg("Organiser has already withdrawn")]
    AlreadyWithdrawn,
    #[msg("Deadline must be in the future")]
    DeadlineInPast,
}
