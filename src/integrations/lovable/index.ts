import { supabase } from "@/integrations/supabase/client";

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: string, options?: { redirect_uri?: string }) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: options?.redirect_uri,
        },
      });
      return { data, error };
    },
  },
};
