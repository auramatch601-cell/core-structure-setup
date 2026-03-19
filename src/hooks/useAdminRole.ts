import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Returns whether the current user has the 'admin' role.
 * Uses has_role() SECURITY DEFINER function — no RLS recursion.
 */
export function useAdminRole() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        setIsAdmin(!error && data === true);
        setLoading(false);
      });
  }, [user]);

  return { isAdmin, loading };
}
