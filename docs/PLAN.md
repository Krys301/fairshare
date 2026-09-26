# Fairshare build plan

**Current stage: 0**

Each stage has a prompt to paste into Claude Code and a "done when" check. Don't start a stage until the previous one is done, committed, and tagged.

Chain track: stages 1 to 4. App track: stage 5 runs in parallel with 1 to 4. Both: stages 6 onward.

---

## Stage 0: Repo ready

- [x] Anchor project named `fairshare` exists, `anchor build` and `anchor test` pass on the starter program
- [x] `docs/PRD.md`, `docs/PLAN.md`, `CLAUDE.md`, `.claude/settings.json` in the repo
- [x] `.gitignore` covers `target/`, `node_modules/`, `.next/`, `.env`, `*.json` keypairs outside `target/idl`
- [x] First commit made, tagged `stage-0`

**Prompt:**
> Read CLAUDE.md and docs/PLAN.md. We are on stage 0. Verify the Anchor project builds and the starter test passes, check the .gitignore covers everything in the stage 0 checklist, then commit. Don't write any features.

---

## Stage 1: Pricing function (chain)

- [x] `programs/fairshare/src/pricing.rs` with `pub fn price(n, fixed, per_head, margin_bps, p_min, p_max) -> Result<u64>`
- [x] Rounds up, uses checked maths, clamps to [p_min, p_max], errors on n = 0
- [x] `pub fn validate_params(...)` rejecting p_max < price(n_min), p_min > p_max, n_min > n_max, zero values
- [x] Unit tests: the PRD worked example (50, 100, 200, 400 sign-ups), clamping at both ends, price never increases as n increases (loop n = 1..=1000), organiser revenue n × price(n) ≥ (F + c·n) for every n ≥ n_min

**Done when:** `cargo test` passes. Tag `stage-1`.

**Prompt:**
> Read CLAUDE.md and the "Pricing algorithm" section of docs/PRD.md. We are on stage 1 in docs/PLAN.md. Plan first, then implement pricing.rs as a pure function module with the unit tests listed in the plan. No instructions or accounts yet.

---

## Stage 2: create_event, join, finalize (chain)

- [x] State: `Event`, `Ticket` accounts as in the PRD; `EventStatus` enum (Open, Finalised, Cancelled)
- [x] `create_event`: validates params, creates Event PDA and USDC vault owned by a PDA
- [x] `join`: computes price(count + 1), transfers USDC from attendee to vault, creates Ticket PDA (prevents double join), increments count; rejects if not Open, past deadline, or full
- [x] `finalize`: callable by anyone after deadline or at capacity; sets Finalised + final_price, or Cancelled if below n_min
- [x] Tests on local validator with a test USDC mint: create, 3 joins with decreasing price, double-join rejected, join after deadline rejected, finalize both paths

**Done when:** `anchor test` passes. Tag `stage-2`.

**Prompt:**
> We are on stage 2 in docs/PLAN.md. Read the "Solana program design" section of docs/PRD.md. Plan the accounts and instructions first and show me. After I approve, implement one instruction at a time, adding its tests and running anchor test after each one. Use a locally created test mint for USDC in tests.

---

## Stage 3: claim_refund, withdraw (chain)

- [ ] `claim_refund`: Finalised → pays amount_paid − final_price; Cancelled → pays amount_paid; marks claimed; rejects double claim
- [ ] `withdraw`: organiser only, once, Finalised only, takes attendee_count × final_price
- [ ] **Vault invariant test:** with 10+ attendees at different prices, after everyone claims and the organiser withdraws, vault balance ≥ 0 and all balances add up exactly
- [ ] Cancelled path test: everyone gets their full deposit back

**Done when:** `anchor test` passes including the invariant test. Tag `stage-3`.

**Prompt:**
> We are on stage 3 in docs/PLAN.md. Implement claim_refund, then withdraw, one at a time with tests. Then write the vault invariant test described in the plan. Stop and tell me if the invariant ever fails; do not change the pricing function to make it pass without asking.

---

## Stage 4: Devnet deploy + demo script (chain)

- [ ] Program deployed to devnet, program ID updated in `Anchor.toml` and `lib.rs`
- [ ] `scripts/seed-demo.ts`: creates a demo event with a short deadline (e.g. 10 minutes) using devnet USDC, and joins it from 3 test wallets
- [ ] IDL copied to `app/` for the frontend

**Done when:** seed script runs and the event is visible on Solana Explorer (devnet). Tag `stage-4`.

**Prompt:**
> We are on stage 4 in docs/PLAN.md. Deploy to devnet (check my SOL balance first and tell me if it's under 3). Then write scripts/seed-demo.ts as described. Use devnet USDC mint from the env var USDC_MINT. Never touch my keypair file directly; use the Anchor provider wallet.

---

## Stage 5: Frontend on mock data (app, parallel with 1 to 4)

- [ ] Pages: home (event cards), event page, create event form, my tickets
- [ ] Event page: cover gradient, title, date/location/organiser, big Join button with current price, live price card with attendee count and progress bar to next price drop, price curve chart with current point highlighted
- [ ] `app/lib/pricing.ts` mirrors the formula (display only) with a few tests matching the PRD example
- [ ] All data from `app/lib/mock.ts` behind a small interface (`getEvent`, `listEvents`, `joinEvent`...) so stage 6 only swaps the implementation
- [ ] Looks good on a phone

**Done when:** `npm run build` passes and pages look right on desktop and phone. Tag `stage-5`.

**Prompt:**
> We are on stage 5 in docs/PLAN.md (app track). Only work inside app/. Build the frontend on mock data. Design direction: clean, minimal event pages in the style of modern event platforms: single centred column around 640px wide, soft gradient cover with rounded corners, big bold title, small muted details with icons, one prominent Join button showing the price, rounded cards with soft shadows, generous whitespace, dark mode by default, Inter font, fully responsive. Use Next.js, Tailwind and Recharts. Put all data access behind app/lib/api.ts backed by app/lib/mock.ts. Build one page at a time and run npm run build after each.

---

## Stage 6: Wire frontend to devnet (both)

- [ ] Wallet adapter (Phantom) connected
- [ ] `app/lib/api.ts` swapped from mock to real program calls using the IDL
- [ ] Event page polls or subscribes to the Event account so price updates live
- [ ] Create, join, finalize, claim refund, withdraw all work from the UI with Explorer links shown

**Done when:** full lifecycle works in the browser on devnet. Tag `stage-6`.

**Prompt:**
> We are on stage 6 in docs/PLAN.md. Replace the mock implementation in app/lib/api.ts with real calls to the devnet program using the IDL. Keep the same function signatures so pages don't change. Wire one action at a time (read event, then join, then finalize, then claim, then withdraw) and test each in the browser before the next.

---

## Stage 7: Solana Pay QR (both)

- [ ] Next.js API route returning a Solana Pay transaction request that builds the `join` transaction for the scanning wallet
- [ ] QR shown on the event page
- [ ] Tested by scanning with Phantom on a real phone on devnet

**Done when:** a phone can join by scanning. Tag `stage-7`.

**Prompt:**
> We are on stage 7 in docs/PLAN.md. Add a Solana Pay transaction request API route that builds the join transaction for the account that scans it, and show its QR on the event page. Explain how I test it from my phone once it's done.

---

## Stage 8: Demo polish (freeze at 4:30pm)

- [ ] Presenter view: big price, attendee count, price curve, QR
- [ ] Deployed to Vercel with a public URL
- [ ] Backup video recorded
- [ ] Seed script run fresh before the demo

**Rule:** after 4:30pm, bug fixes only. No new features.
