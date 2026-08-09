import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  loading: true,
  session: null,
  user: null,
  isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const user = session?.user;
    if (!user) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data } = await supabase.rpc("is_admin");
      if (!cancelled) setIsAdmin(Boolean(data));

      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name:
            (user.user_metadata?.["full_name"] as string | undefined) ??
            (user.user_metadata?.["name"] as string | undefined) ??
            user.email?.split("@")[0] ??
            "Student",
          avatar_url: (user.user_metadata?.["avatar_url"] as string | undefined) ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{ loading, session, user: session?.user ?? null, isAdmin, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
