# Treetiti — Premium AI Agency (V2 Cinematic)

> Single brand spelling: **Treetiti**. Never `Treetiti` / `treetiti` in UI. Env vars / package names stay lowercase `treetiti`.

Premium international AI agency: AI websites, automation, AI systems, UGC, cinematic content, marketing, branding, documentaries.

## Stack
Vite + React 19 + TypeScript strict + Tailwind v4 + Framer Motion + GSAP + Lenis + Three Fiber + Supabase + i18next (en, fa, ru, ar, tr)

## Dev
```bash
cd treetiti
npm install
cp .env.example .env.local
npm run dev
```

## Quality gates (must pass before commit)
```bash
npm run build
npm run lint
npm run typecheck
```

## i18n rule
No hardcoded strings. All copy in `src/i18n/{en,fa,ru,ar,tr}.ts`. RTL: fa, ar.

## Structure
`src/app/` pages, `src/components/` shared, `src/i18n/`, `src/lib/supabase.ts`, `supabase/migrations/`

## Deploy
Frontend: Vercel (`treetiti/` root). Backend: Supabase prod. Videos: Cloudflare R2, never git.
