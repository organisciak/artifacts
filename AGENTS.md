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
