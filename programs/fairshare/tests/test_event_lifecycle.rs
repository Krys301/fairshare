use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{
            clock::Clock, instruction::Instruction, system_instruction, system_program,
        },
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    anchor_spl::token::{spl_token, Mint as MintAccount, TokenAccount},
    fairshare::{
        constants::{EVENT_SEED, TICKET_SEED, VAULT_SEED},
        state::{Event, EventStatus, Ticket},
    },
    litesvm::{types::TransactionResult, LiteSVM},
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const DECIMALS: u8 = 6;

fn send(
    svm: &mut LiteSVM,
    payer: &Keypair,
    ixs: &[Instruction],
    extra_signers: &[&Keypair],
) -> TransactionResult {
    let blockhash = svm.latest_blockhash();
    let mut signers: Vec<&Keypair> = vec![payer];
    signers.extend_from_slice(extra_signers);
    let msg = Message::new_with_blockhash(ixs, Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &signers).unwrap();
    svm.send_transaction(tx)
}

fn set_clock(svm: &mut LiteSVM, unix_timestamp: i64) {
    svm.set_sysvar(&Clock {
        unix_timestamp,
        ..Default::default()
    });
}

fn create_mint(svm: &mut LiteSVM, payer: &Keypair) -> Pubkey {
    let mint_kp = Keypair::new();
    let space = MintAccount::LEN;
    let lamports = svm.minimum_balance_for_rent_exemption(space);
    let create_ix = system_instruction::create_account(
        &payer.pubkey(),
        &mint_kp.pubkey(),
        lamports,
        space as u64,
        &spl_token::ID,
    );
    let init_ix = spl_token::instruction::initialize_mint2(
        &spl_token::ID,
        &mint_kp.pubkey(),
        &payer.pubkey(),
        None,
        DECIMALS,
    )
    .unwrap();
    send(svm, payer, &[create_ix, init_ix], &[&mint_kp]).unwrap();
    mint_kp.pubkey()
}

fn create_token_account(svm: &mut LiteSVM, payer: &Keypair, mint: &Pubkey, owner: &Pubkey) -> Pubkey {
    let account_kp = Keypair::new();
    let space = TokenAccount::LEN;
    let lamports = svm.minimum_balance_for_rent_exemption(space);
    let create_ix = system_instruction::create_account(
        &payer.pubkey(),
        &account_kp.pubkey(),
        lamports,
        space as u64,
        &spl_token::ID,
    );
    let init_ix =
        spl_token::instruction::initialize_account3(&spl_token::ID, &account_kp.pubkey(), mint, owner)
            .unwrap();
    send(svm, payer, &[create_ix, init_ix], &[&account_kp]).unwrap();
    account_kp.pubkey()
}

fn mint_to(svm: &mut LiteSVM, mint_authority: &Keypair, mint: &Pubkey, token_account: &Pubkey, amount: u64) {
    let ix = spl_token::instruction::mint_to(
        &spl_token::ID,
        mint,
        token_account,
        &mint_authority.pubkey(),
        &[],
        amount,
    )
    .unwrap();
    send(svm, mint_authority, &[ix], &[]).unwrap();
}

/// Sets up an SVM with the program loaded, an organiser funded with SOL, and a
/// fresh USDC-like mint (6 decimals) whose mint authority is the organiser.
fn setup() -> (LiteSVM, Keypair, Pubkey) {
    let program_id = fairshare::id();
    let organiser = Keypair::new();
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/fairshare.so"
    ));
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&organiser.pubkey(), 100_000_000_000).unwrap();

    let mint = create_mint(&mut svm, &organiser);

    (svm, organiser, mint)
}

#[allow(clippy::too_many_arguments)]
fn create_event(
    svm: &mut LiteSVM,
    organiser: &Keypair,
    mint: &Pubkey,
    event_id: u64,
    fixed: u64,
    per_head: u64,
    margin_bps: u16,
    p_min: u64,
    p_max: u64,
    n_min: u64,
    n_max: u64,
    deadline: i64,
) -> (Pubkey, Pubkey) {
    let program_id = fairshare::id();
    let event = Pubkey::find_program_address(
        &[
            EVENT_SEED,
            organiser.pubkey().as_ref(),
            &event_id.to_le_bytes(),
        ],
        &program_id,
    )
    .0;
    let vault = Pubkey::find_program_address(&[VAULT_SEED, event.as_ref()], &program_id).0;

    let ix = Instruction::new_with_bytes(
        program_id,
        &fairshare::instruction::CreateEvent {
            event_id,
            fixed,
            per_head,
            margin_bps,
            p_min,
            p_max,
            n_min,
            n_max,
            deadline,
        }
        .data(),
        fairshare::accounts::CreateEvent {
            organiser: organiser.pubkey(),
            event,
            vault,
            mint: *mint,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    send(svm, organiser, &[ix], &[]).unwrap();
    (event, vault)
}

fn join(
    svm: &mut LiteSVM,
    attendee: &Keypair,
    event: &Pubkey,
    vault: &Pubkey,
    attendee_token_account: &Pubkey,
) -> TransactionResult {
    let program_id = fairshare::id();
    let ticket = Pubkey::find_program_address(
        &[TICKET_SEED, event.as_ref(), attendee.pubkey().as_ref()],
        &program_id,
    )
    .0;

    let ix = Instruction::new_with_bytes(
        program_id,
        &fairshare::instruction::Join {}.data(),
        fairshare::accounts::Join {
            attendee: attendee.pubkey(),
            event: *event,
            vault: *vault,
            attendee_token_account: *attendee_token_account,
            ticket,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    send(svm, attendee, &[ix], &[])
}

fn finalize(svm: &mut LiteSVM, payer: &Keypair, event: &Pubkey) -> TransactionResult {
    let program_id = fairshare::id();
    let ix = Instruction::new_with_bytes(
        program_id,
        &fairshare::instruction::Finalize {}.data(),
        fairshare::accounts::Finalize { event: *event }.to_account_metas(None),
    );
    send(svm, payer, &[ix], &[])
}

fn get_event(svm: &LiteSVM, event: &Pubkey) -> Event {
    let account = svm.get_account(event).unwrap();
    let mut data: &[u8] = &account.data;
    Event::try_deserialize(&mut data).unwrap()
}

fn get_ticket(svm: &LiteSVM, ticket: &Pubkey) -> Ticket {
    let account = svm.get_account(ticket).unwrap();
    let mut data: &[u8] = &account.data;
    Ticket::try_deserialize(&mut data).unwrap()
}

fn new_attendee(svm: &mut LiteSVM, organiser: &Keypair, mint: &Pubkey, funding: u64) -> (Keypair, Pubkey) {
    let attendee = Keypair::new();
    svm.airdrop(&attendee.pubkey(), 1_000_000_000).unwrap();
    let token_account = create_token_account(svm, organiser, mint, &attendee.pubkey());
    mint_to(svm, organiser, mint, &token_account, funding);
    (attendee, token_account)
}

const FIXED: u64 = 300_000_000;
const PER_HEAD: u64 = 1_000_000;
const MARGIN_BPS: u16 = 1_000;
const P_MIN: u64 = 1_000_000;
const P_MAX: u64 = 1_000_000_000;
const FUNDING: u64 = 1_000_000_000;

#[test]
fn create_event_and_three_joins_have_decreasing_price() {
    let (mut svm, organiser, mint) = setup();
    let (event, vault) = create_event(
        &mut svm, &organiser, &mint, 1, FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX, 2, 5, 1_000,
    );

    let mut amounts = Vec::new();
    for _ in 0..3 {
        let (attendee, attendee_token_account) = new_attendee(&mut svm, &organiser, &mint, FUNDING);
        let res = join(&mut svm, &attendee, &event, &vault, &attendee_token_account);
        assert!(res.is_ok(), "join failed: {:?}", res);

        let program_id = fairshare::id();
        let ticket = Pubkey::find_program_address(
            &[TICKET_SEED, event.as_ref(), attendee.pubkey().as_ref()],
            &program_id,
        )
        .0;
        amounts.push(get_ticket(&svm, &ticket).amount_paid);
    }

    assert!(amounts[0] > amounts[1], "price did not drop after join 2");
    assert!(amounts[1] > amounts[2], "price did not drop after join 3");

    let event_state = get_event(&svm, &event);
    assert_eq!(event_state.attendee_count, 3);
    assert_eq!(event_state.status, EventStatus::Open);
}

#[test]
fn double_join_is_rejected() {
    let (mut svm, organiser, mint) = setup();
    let (event, vault) = create_event(
        &mut svm, &organiser, &mint, 1, FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX, 2, 5, 1_000,
    );

    let (attendee, attendee_token_account) = new_attendee(&mut svm, &organiser, &mint, FUNDING);
    assert!(join(&mut svm, &attendee, &event, &vault, &attendee_token_account).is_ok());
    assert!(
        join(&mut svm, &attendee, &event, &vault, &attendee_token_account).is_err(),
        "second join by the same attendee should have been rejected"
    );
}

#[test]
fn join_after_deadline_is_rejected() {
    let (mut svm, organiser, mint) = setup();
    let (event, vault) = create_event(
        &mut svm, &organiser, &mint, 1, FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX, 2, 5, 50,
    );

    let (attendee1, token_account1) = new_attendee(&mut svm, &organiser, &mint, FUNDING);
    assert!(join(&mut svm, &attendee1, &event, &vault, &token_account1).is_ok());

    set_clock(&mut svm, 100);

    let (attendee2, token_account2) = new_attendee(&mut svm, &organiser, &mint, FUNDING);
    assert!(
        join(&mut svm, &attendee2, &event, &vault, &token_account2).is_err(),
        "join after the deadline should have been rejected"
    );
}

#[test]
fn join_at_capacity_is_rejected() {
    let (mut svm, organiser, mint) = setup();
    let (event, vault) = create_event(
        &mut svm, &organiser, &mint, 1, FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX, 1, 1, 1_000,
    );

    let (attendee1, token_account1) = new_attendee(&mut svm, &organiser, &mint, FUNDING);
    assert!(join(&mut svm, &attendee1, &event, &vault, &token_account1).is_ok());

    let (attendee2, token_account2) = new_attendee(&mut svm, &organiser, &mint, FUNDING);
    assert!(
        join(&mut svm, &attendee2, &event, &vault, &token_account2).is_err(),
        "join at capacity should have been rejected"
    );
}

#[test]
fn finalize_finalises_when_above_n_min() {
    let (mut svm, organiser, mint) = setup();
    let (event, vault) = create_event(
        &mut svm, &organiser, &mint, 1, FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX, 2, 5, 50,
    );

    let mut last_amount = 0;
    for _ in 0..3 {
        let (attendee, attendee_token_account) = new_attendee(&mut svm, &organiser, &mint, FUNDING);
        let res = join(&mut svm, &attendee, &event, &vault, &attendee_token_account);
        assert!(res.is_ok());
        let program_id = fairshare::id();
        let ticket = Pubkey::find_program_address(
            &[TICKET_SEED, event.as_ref(), attendee.pubkey().as_ref()],
            &program_id,
        )
        .0;
        last_amount = get_ticket(&svm, &ticket).amount_paid;
    }

    set_clock(&mut svm, 100);
    assert!(finalize(&mut svm, &organiser, &event).is_ok());

    let event_state = get_event(&svm, &event);
    assert_eq!(event_state.status, EventStatus::Finalised);
    assert_eq!(event_state.final_price, last_amount);
}

#[test]
fn finalize_cancels_when_below_n_min() {
    let (mut svm, organiser, mint) = setup();
    let (event, vault) = create_event(
        &mut svm, &organiser, &mint, 1, FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX, 5, 10, 50,
    );

    let (attendee, attendee_token_account) = new_attendee(&mut svm, &organiser, &mint, FUNDING);
    assert!(join(&mut svm, &attendee, &event, &vault, &attendee_token_account).is_ok());

    set_clock(&mut svm, 100);
    assert!(finalize(&mut svm, &organiser, &event).is_ok());

    let event_state = get_event(&svm, &event);
    assert_eq!(event_state.status, EventStatus::Cancelled);
}
