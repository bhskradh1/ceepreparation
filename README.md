# CEE Prep Nepal

Timed CEE (Nepal) mock tests, subject drills, instant scoring, and a weekly average-based leaderboard. Admin can import questions from PDF.

**Live (Lovable)**: https://ceepreparation.lovable.app

## Development

```sh
npm i
npm run dev
```

Copy `.env.example` to `.env` and fill in your Supabase keys.

## Deploy on Vercel

This app is TanStack Start + Nitro. Nitro is pinned to the `vercel` preset in `vite.config.ts`.

1. Import the GitHub repo in [Vercel](https://vercel.com/new).
2. Add these **Environment Variables** (Production + Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
3. In the [Supabase dashboard](https://supabase.com/dashboard):
   - Enable **Google** under Authentication → Providers.
   - Add your Vercel URL to **Authentication → URL Configuration → Redirect URLs**, e.g. `https://your-app.vercel.app/**` and `http://localhost:5173/**` for local.
   - Set Site URL to your primary domain.
4. Deploy. Framework detection + Nitro Build Output API handle routing — no custom `vercel.json` required.

On Lovable hosts, Google sign-in still uses Lovable Cloud Auth. On Vercel/localhost it uses Supabase Google OAuth.

## Build with Lovable

Continue in the [Lovable editor](https://lovable.dev/projects/a01c34c4-0bbe-46e1-ab1d-ea6323739fec). Commits sync both ways — avoid force-pushing rewritten history.
