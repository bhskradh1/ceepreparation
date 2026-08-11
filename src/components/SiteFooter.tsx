import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="relative mt-auto border-t border-border/80 bg-secondary text-secondary-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-xl font-semibold tracking-tight">
            CEE<span className="text-gold">Prep</span>
          </p>
          <p className="mt-2 max-w-sm text-sm opacity-75">
            Built for Nepal&apos;s CEE aspirants — timed mocks, honest scoring, weekly ranks.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm opacity-85">
          <Link to="/tests" className="hover:text-gold">
            Mock tests
          </Link>
          <Link to="/leaderboard" className="hover:text-gold">
            Leaderboard
          </Link>
          <Link to="/auth" className="hover:text-gold">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
