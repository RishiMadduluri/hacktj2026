"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encodedRedirect } from "@/utils/utils";

// Demo credentials
const DEMO_EMAIL = "demo@firstwatch.com";
const DEMO_PASSWORD = "demo123";

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set("firstwatch_demo_auth", "true", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    cookieStore.set("firstwatch_demo_email", email, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return redirect("/protected");
  }

  return encodedRedirect("error", "/sign-in", "Invalid credentials. Use demo@firstwatch.com / demo123");
};

export const signUpAction = async (formData: FormData) => {
  // For demo, just redirect to sign-in with a message
  return encodedRedirect(
    "success",
    "/sign-in",
    "Demo mode — sign in with demo@firstwatch.com / demo123"
  );
};

export const forgotPasswordAction = async (formData: FormData) => {
  return encodedRedirect(
    "success",
    "/forgot-password",
    "Demo mode — no password reset needed. Use demo@firstwatch.com / demo123"
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  return redirect("/sign-in");
};

export const signOutAction = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("firstwatch_demo_auth");
  cookieStore.delete("firstwatch_demo_email");
  return redirect("/sign-in");
};
