# Fairshare: project rules for Claude Code

Fairshare is a Solana hackathon project: event tickets whose price drops as more people join, with early buyers refunded down to the final price. Full spec: `docs/PRD.md`. Build plan and current stage: `docs/PLAN.md`.

## How we work (read this every session)

1. **One stage at a time.** Check `docs/PLAN.md` for the current stage. Only work on that stage. Do not start the next stage until the human says so.
2. **Plan before code.** For any change touching more than one file, first write a short plan (files to change, what, why) and wait for approval.
3. **Small steps.** Make one logical change, then run the relevant checks (below). Never stack several untested changes.
4. **Green before moving on.** A step is done only when its checks pass. If a check fails, fix it before doing anything else.
5. **Two strikes rule.** If the same error survives two fix attempts, stop, explain what you tried and what you think is wrong, and ask the human. Do not keep guessing.
6. **Commit after every green step** with a clear message, e.g. `stage 2: join instruction + tests passing`. Tell the human when a stage is complete so they can tag it.
7. **Update `docs/PLAN.md`** by ticking completed items. Do not rewrite the plan itself.
8. **Don't refactor working code** unless the current stage requires it.

## Checks

| Area | Command | Must pass before commit |
| --- | --- | --- |
| Pricing maths | `cargo test -p fairshare` (inside `programs/fairshare`) | Yes |
| Program | `anchor build && anchor test` | Yes |
| Frontend | `cd app && npm run build && npm run lint` | Yes |

If `anchor build` is slow or crashes, use `CARGO_BUILD_JOBS=4 anchor build`.

## Hard rules (never break these)

- **Never** touch, print, regenerate, or commit `~/.config/solana/id.json` or any keypair file. Never run `solana-keygen new`.
- **Never** deploy to mainnet. Devnet or local (Surfpool) only.
- **Never** run `sudo`, modify files outside this repo, or delete anything except build output (`target/`, `.next/`, `node_modules/`) without asking.
- **Never** `git push --force`, `git reset --hard`, or rewrite history. The human handles rollbacks.
- **Never** commit `.env` or secrets.
- **Never** change an instruction's accounts or arguments without updating the tests and the frontend client in the same step, and telling the human.

## Technical conventions

- **Anchor 1.x.** The TypeScript package is `@anchor-lang/core`, not `@coral-xyz/anchor`. Check the installed version before writing client code.
- **Money is integers.** All amounts in USDC base units (6 decimals) as `u64`. No floats anywhere in the program.
- **Pricing lives in one pure function** in `programs/fairshare/src/pricing.rs`, with unit tests. Instructions call it; nothing else computes prices. Round the price **up** so the vault can never be short.
- **Margin in basis points** (10% = 1000).
- **Checked arithmetic** everywhere in the program (`checked_add`, `checked_mul`, etc.), returning a custom error on overflow.
- **Refunds use a claim pattern.** No loops over attendees in any instruction.
- **Vault invariant:** organiser withdrawal + sum of all refunds must never exceed the amount deposited. There must be a test for this.
- **Frontend** is Next.js + Tailwind + Recharts in `app/`. Mirror the pricing formula in `app/lib/pricing.ts` for display only; the program is the source of truth.

## Repo layout

```
programs/fairshare/   Anchor program (pricing.rs, instructions, state)
tests/                Anchor integration tests
app/                  Next.js frontend
scripts/              Devnet helpers (seed demo event, fund test wallets)
docs/PRD.md           Product spec
docs/PLAN.md          Staged build plan (current stage lives here)
```

## Team split

Two people work in parallel. The chain track owns `programs/` and `tests/`; the app track owns `app/`. Shared interface: the program IDL in `target/idl/`. If you're working on one track, don't edit the other track's folder.
