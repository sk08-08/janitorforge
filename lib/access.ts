import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentUserAccess(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    return { user: null as null, isAdmin: false };
  }

  const { data: isAdminValue, error: adminError } = await supabase.rpc(
    "is_admin_user",
    { p_user_id: user.id },
  );

  if (adminError) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    return { user, isAdmin: !!profile?.is_admin };
  }

  return { user, isAdmin: !!isAdminValue };
}
