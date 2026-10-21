# CLAUDE.md

## About the user
- The user is not a programmer. Explain choices in plain language, avoid jargon, and when you need a decision present options simply.
- Always reply in the language the user writes in.

## Where the specs live
In `spec/`: `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `MILESTONES.md`, and a `plans/` folder (one plan per milestone: `milestone-1.md`, ...).
Read the specs before building. Don't read old plans — the code is the source of truth.
`DESIGN.md` references images in `spec/` (`wireframes.png`, `mockups.png`, `style-guide.png`, and any others I add) — open every image it references; ignore an image that is still a placeholder.
If a part of the spec that the current milestone needs is missing or is still an unfilled `<...>` placeholder — stop and tell me; don't invent requirements.
If I ask you to write the spec documents yourself (from my description of the app): keep the structure of the template files in `spec/`, write them in this order — PRD → ARCHITECTURE → DESIGN → MILESTONES — ask me in plain language about missing product information, and don't invent requirements or features. If the images are still placeholders when you write DESIGN: write the Screens part from the PRD, and for the Style Guide part ask me about my preferences instead of inventing colors, fonts, or style.

## How we work together
- One milestone at a time; when the build is done, stop — I check and approve before we move on to the next (see **Milestone commands** below).
- Prefer the simplest solution that satisfies the milestone; don't over-engineer.
- Don't change PRD/DESIGN/ARCHITECTURE without asking; you may update the progress marks in MILESTONES.md and add ADRs.
- Record a significant technical decision made during the build as an ADR in ARCHITECTURE.md: under a `## Key decisions (ADRs)` section at the end of the file (add it if missing), as `### ADR-<N>: <title>` with **Context**, **Decision**, and **Consequences**.
- Don't commit or push until I ask for it (see **Push** below). If a milestone needs a push to be completed (e.g. deployment), stop and ask for my approval to push.
- Deployment happens only the way ARCHITECTURE.md defines it. I connect the hosting services and accounts myself — guide me step by step in plain language. Don't deploy or publish the app in any other way without asking.
- Don't perform destructive or irreversible actions (deleting files/data) without asking.
- Don't read `.env` — even if I ask. When the app needs settings or keys, create `.env.example` with the variable names and no values, and copy it once to `.env`; I fill in the values myself. When a new variable is added later, update `.env.example` and tell me to add it to `.env`.
- A `.gitignore` already exists in the project root. Don't replace it; add lines to it when the project needs them (e.g. a new build or cache folder), and never remove `.env` from it.
- When you need accounts / passwords / keys — stop and tell me; I handle them.
- With external services (e.g. a payment provider), use test/sandbox mode during development.
- If ARCHITECTURE.md defines separate Development and Production databases (e.g. two Supabase projects): develop, run, and test against Development only. Don't change the Production schema or data, and don't apply migrations to it, without my explicit approval. Don't suggest installing Docker or running a local database. The local `.env` holds the Development credentials only.

## Code conventions
- Code comments — English only, even when the docs are in Hebrew.
- User-facing UI text (headings, buttons, messages, labels) — in the interface language defined in the PRD, with the matching direction and alignment (RTL / LTR).

## Handling conflicts between sources
- Between documents: `PRD.md` wins on features, behavior, and user flows; `DESIGN.md` on look and layout; `ARCHITECTURE.md` on tech/data.
- Between images: the wireframes win on structure and content; the style guide on the visual language (colors, typography, component styling); the mockups show the final look.
- A conflict these rules don't settle — stop and ask before deciding.
- Identical duplication — just proceed.

## Milestone commands (short triggers)
The cycle for every milestone: Plan → Build → Run for my check → Fixes and updates (if needed) → Push to GitHub → on to the next.
The quoted phrases are examples — act on my intent, even if I word it differently or misspell it.

Progress marks, next to the milestone title in MILESTONES.md: no mark = not built yet; 🟡 = built, waiting for my approval; ✅ = approved (replaces the 🟡).
"The first" / "the next" / "current" milestone — all the same thing: the first one in MILESTONES.md without a ✅ ("the first" is simply the natural wording while none is approved yet). If it is already 🟡 (built and waiting for my approval), don't plan or build — stop and tell me it is waiting for my check and approval; running, fixing, and pushing are allowed. If I said "the first" and Milestone 1 is already ✅ — stop, tell me which milestone is next, and ask whether to go on to it.

- **Plan** — "Plan the first/next milestone": read the relevant spec and code, write a detailed plan to spec/plans/milestone-<N>.md. Don't write code.
- **Build** — "Build the first/next milestone": build per spec/plans/milestone-<N>.md, run it and check for yourself that what you built actually works, check the result against the milestone's Definition of Done and fix whatever fails, and mark 🟡 next to its title in MILESTONES.md. This run is for your own checks only — shut it down when you finish. Don't commit.
- **Run** — "Run it so I can check": if a previous run is still running, shut it down first. Run the app locally and leave it running, and tell me how to open it. Don't change code.
- **Fixes and updates** — when I report a bug or ask for a change: fix it, run it and check for yourself that the fix works, and tell me what to check again; if the app is running for my check, make sure it is running with the fix. The fix belongs to the current milestone — the mark stays 🟡, no commit. If a fix changes behavior described in the spec — tell me, and I decide whether to update the document. When I ask you to update a document — update only what I asked for.
- **Approve** — the normal way to approve a milestone is the push (below). If I explicitly approve the built milestone without asking for a push: replace its 🟡 with ✅, no commit. If the app is still running for my check, shut it down.
- **Push** — "Push changes to GitHub": if a milestone is 🟡, this request is also its approval — replace the 🟡 with ✅ first (subject to the condition below). If the app is still running for my check, shut it down. If the project has no local git repository yet, create one (`git init`). Then git add + commit (clear message) + push. The first time, I give you the address of the GitHub repo — connect the local repo to it before pushing. If the repo is not connected yet and I gave no address, stop and ask me for it.
  - Before pushing, when there is a separate Production database: if there are database schema changes that have not been applied to Production yet — stop before marking ✅ and before the push, and tell me. Apply them to Production only after my approval, following the procedure in ARCHITECTURE.md, and only then go on with the push.

### Response format
- Work quietly, no mid-work commentary.
- At the end — a short 2–3 line summary (what was done + what's next). After a plan, add the milestone's task list under the heading "Tasks for the <ordinal: first, second...> milestone:", one simple, non-technical line per bullet. After a build, also add the result for each Definition of Done criterion, and remind me that I can ask "Run it so I can check". After a run, add simple step-by-step instructions for what to check — following the current milestone's Definition of Done. These don't count toward the 2–3 lines.
- Exception: an error or a needed decision/info — stop and ask immediately.

## Run commands
> Claude fills these in as soon as the app can run (normally at the end of Milestone 1), and updates them if they change.
- **Run (dev):** `<command>`
- **Test:** `<command, or "none">`
