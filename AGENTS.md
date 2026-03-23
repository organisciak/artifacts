# AGENTS

Guidance for anyone (human or AI) dropping in to build or adjust these web toys.

## Project quick facts
- Next.js 15 (App Router) with React 19 and Tailwind 3 + tailwindcss-animate; fonts are Geist Sans/Mono and EB Garamond wired in `src/app/layout.tsx`.
- Entry grid is driven by `src/lib/toys.ts`; add new toys there to surface them on the home page.
- Global tokens and radius live in `src/app/globals.css`; Tailwind config extends colors via CSS vars in that file.
- Scripts: `pnpm dev` (Turbopack), `pnpm build`, `pnpm start`, `pnpm lint`.

## Principles
- Favor playful, self-contained experiments over heavy architecture; keep dependencies minimal and stick to browser APIs when possible.
- Design for both desktop and mobile (many toys use touch/accelerometer).
- Keep accessibility in mind: reasonable contrast, focusable controls, and fallbacks when sensors are unavailable.
- Preserve existing experiments; mark unfinished or unstable ideas with a short inline note instead of deleting.

## Adding or editing a toy
- Add a route under `src/app/<toy>/page.tsx` (or nested folders) using functional components and TypeScript.
- Register the toy in `src/lib/toys.ts` with `id`, `name`, `description`, `iconName`, `path`, `category`, `tags`, and optional `backgroundImage`.
- Shared UI goes in `src/components/...`; reusable logic belongs in `src/hooks` or `src/game/*`.
- Assets live under `public/` (e.g., `public/bg-videos`, `public/images`); use web-safe filenames.

## Coding conventions
- Use Tailwind utility classes; lean on the `font-eb-garamond` class for decorative headings when it fits the vibe.
- Keep state localized; avoid new global state libraries unless essential.
- Comment only where behavior is non-obvious; keep docs concise and in ASCII.

## Validation
- Run `pnpm lint` and, when time allows, `pnpm build` to catch obvious issues.
- Smoke test new routes via `pnpm dev`, checking both desktop and mobile interactions (touch, sensor fallbacks, keyboard).

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

---

## Session Log

### 2026-03-22 (Kimchi)

**Added:** Sight Words game for Nora
- `src/app/sight-words/page.tsx` — main game component
- `src/data/sight-words.ts` — word bank with confusable pairs
- Registered in `src/lib/toys.ts`
- Scoring: +1 correct, -1 wrong, target goal with confetti celebration
- Settings: 2-4 choices, 3-20 target points, category filter

**In Progress:**
- `artifacts-bkw`: Generating word images via nano-banana-pro
- UI polish: sound effects, keyboard nav, word display above image

**Next:**
- Wire up actual images once generated (update WordImage component to use `/sight-words/[word].png`)
- Consider adding difficulty progression (start with 2 choices, increase after streaks)
