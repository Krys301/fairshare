# Start here (for you, not Claude Code)

## What's in this kit

| File | What it does |
| --- | --- |
| `CLAUDE.md` | Rules Claude Code reads automatically every session: work in stages, plan first, test before committing, never touch keypairs or mainnet |
| `docs/PRD.md` | The product spec |
| `docs/PLAN.md` | 8 stages, each with a checklist, a "done when" test, and a prompt to paste |
| `.claude/settings.json` | Permissions: auto-allows safe commands (build, test, git commit), blocks dangerous ones (sudo, keygen, force push, reading your keypair) |

## 1. Set up the repo (once)

In Ubuntu:

```
cd ~
anchor init fairshare
cd fairshare
```

Copy the kit files in, keeping the folder structure (`CLAUDE.md` and `START-HERE.md` in the root, `docs/` and `.claude/` as folders). From Windows you can drag them into `\\wsl$\Ubuntu\home\kstra\fairshare` in File Explorer.

Then:

```
git init
git add -A
git commit -m "stage 0: kit + anchor scaffold"
```

## 2. Run each stage

```
claude
```

Paste the stage's prompt from `docs/PLAN.md`. Useful habits:

- **Plan mode:** press Shift+Tab to cycle into plan mode for the start of each stage, so Claude Code proposes a plan before touching files. Approve, then let it work.
- **Read before approving:** it will still ask about commands not on the allow list. Read them.
- **Fresh context per stage:** run `/clear` when starting a new stage so old context doesn't confuse it. CLAUDE.md reloads automatically.

## 3. Save a checkpoint after every stage

When a stage's "done when" check passes:

```
git tag stage-1
```

and change `**Current stage:**` at the top of `docs/PLAN.md`.

## 4. If something breaks badly

Claude Code is blocked from doing rollbacks, so you do them:

```
git status                # see what changed
git diff                  # see how
git stash                 # park the broken changes (recoverable)
git reset --hard stage-2  # jump back to the last good checkpoint
```

Only use `reset --hard` when you're sure; `stash` first so nothing is lost.

## 5. Working as two people

- Chain person: stages 1 to 4, only touches `programs/`, `tests/`, `scripts/`.
- App person: stage 5 in parallel, only touches `app/`.
- Use one GitHub repo, each on your own branch (`chain`, `app`), and merge into `main` at the 1pm integration check. Separate folders mean merges should be painless.
- Merge together for stages 6 to 8.

## 6. Before you trust it

After stage 3, open `pricing.rs` and the `join`/`claim_refund` instructions and read them properly. You need to be able to explain to judges how the price is enforced and why the vault can't go short.
