"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function loginWithPin(username: string, pin: string) {
  const supabase = await createClient();

  const clean = username.toLowerCase().trim();
  const email = `${clean}@janitorforge.local`;
  const password = `${pin}${clean}`; // deterministic, simple password so users only need PIN+username

  // Sign in via Supabase Auth to establish a real Supabase session cookie (RLS will see this)
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError || !signInData?.user) {
    return { success: false, error: "Incorrect username or PIN" };
  }

  const authUser = signInData.user;

  // Ensure profile exists (fallback if trigger didn't fire)
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from("profiles").upsert({
      id: authUser.id,
      username: clean,
      display_name: clean,
    });
  } else if (!existingProfile.username) {
    await supabase
      .from("profiles")
      .update({ username: clean, display_name: clean })
      .eq("id", authUser.id);
  }

  // Optionally keep a simple janitorforge_session cookie for app-level info
  const cookieStore = await cookies();
  cookieStore.set(
    "janitorforge_session",
    JSON.stringify({
      userId: authUser.id,
      username: clean,
      loggedInAt: new Date().toISOString(),
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    },
  );

  return { success: true, user: { id: authUser.id, username: clean } };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("janitorforge_session");
  return { success: true };
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("janitorforge_session");

  if (!session?.value) {
    return null;
  }

  try {
    return JSON.parse(session.value) as {
      userId: string;
      username: string;
      loggedInAt: string;
    };
  } catch {
    return null;
  }
}

export async function registerUser(username: string, pin: string) {
  if (pin.length !== 4 || !/^\d+$/.test(pin)) {
    return { success: false, error: "PIN must be 4 digits" };
  }
  const supabase = await createClient();
  const clean = username.toLowerCase().trim();
  const email = `${clean}@janitorforge.local`;
  const password = `${pin}${clean}`; // deterministic password derived from PIN+username

  // Try to sign in first (avoids sending sign-up confirmation emails if user exists)
  const { data: signInExisting, error: _signInExistingError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInExisting?.user) {
    const existingUser = signInExisting.user;
    const cookieStore = await cookies();
    cookieStore.set(
      "janitorforge_session",
      JSON.stringify({
        userId: existingUser.id,
        username: clean,
        loggedInAt: new Date().toISOString(),
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      },
    );
    return { success: true, user: { id: existingUser.id, username: clean } };
  }

  // Not signed in yet; attempt signup
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: clean, display_name: clean },
    },
  });

  if (signUpError) {
    const msg = (signUpError as any)?.message || "Error registering user";
    if (String(msg).toLowerCase().includes("rate")) {
      return {
        success: false,
        error:
          "Email rate limit exceeded: disable email confirmations in Supabase Auth settings or configure SMTP to avoid rate limits.",
      };
    }
    return { success: false, error: msg };
  }

  // Immediately sign in to create session cookie after successful signup
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInError || !signInData?.user) {
    return {
      success: false,
      error: (signInError as any)?.message || "Error creating session",
    };
  }

  const authUser = signInData.user;

  // Set our simple janitorforge_session cookie for app usage
  const cookieStore = await cookies();
  cookieStore.set(
    "janitorforge_session",
    JSON.stringify({
      userId: authUser.id,
      username: clean,
      loggedInAt: new Date().toISOString(),
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    },
  );

  return { success: true, user: { id: authUser.id, username: clean } };
}
