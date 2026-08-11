import { Link, useRouterState } from "@tanstack/react-router";
import { GraduationCap, LogOut, Menu, Shield } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/tests", label: "Mock Tests" },
  { to: "/leaderboard", label: "Leaderboard" },
] as const;

export function AppHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const name =
    (user?.user_metadata?.["full_name"] as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Student";
  const avatar = user?.user_metadata?.["avatar_url"] as string | undefined;

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            pathname === item.to && "bg-muted text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
      {isAdmin && (
        <Link
          to="/admin"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10",
            pathname.startsWith("/admin") && "bg-primary/10",
          )}
        >
          <Shield className="size-4" />
          Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_20px_-10px_var(--color-primary)] transition-transform group-hover:scale-[1.03]">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold leading-none tracking-tight">
            CEE<span className="text-primary">Prep</span>
          </span>
        </Link>

        <nav className="ml-3 hidden items-center gap-0.5 md:flex">
          <NavLinks />
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {isAdmin && (
            <Badge variant="outline" className="hidden border-gold/70 text-gold sm:inline-flex">
              Admin
            </Badge>
          )}
          {user ? (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <Avatar className="size-8 ring-2 ring-border">
                  {avatar && <AvatarImage src={avatar} alt={name} />}
                  <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="max-w-[9rem] truncate text-sm font-medium">
                  {name.split(" ")[0]}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                className="press"
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="press hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,20rem)]">
              <SheetHeader>
                <SheetTitle className="font-display text-left">
                  CEE<span className="text-primary">Prep</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                <NavLinks onNavigate={() => setOpen(false)} />
                {!user && (
                  <Button asChild className="mt-4" onClick={() => setOpen(false)}>
                    <Link to="/auth">Continue with Google</Link>
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
