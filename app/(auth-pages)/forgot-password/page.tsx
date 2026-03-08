import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-[#0A0A0A]">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-red-600 font-bold tracking-widest text-sm">FIRSTWATCH</span>
          </div>
          <p className="text-zinc-500 text-sm">AI Medical Guardian</p>
        </div>

        <form className="flex flex-col w-full p-8 space-y-6 bg-[#111] rounded-xl border border-[#1F1F1F]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Reset Password</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Enter your account email and we&apos;ll send you a reset link.
            </p>
            <p className="text-sm text-zinc-500 mt-2">
              Already have an account?{" "}
              <Link className="text-red-500 hover:text-red-400 font-medium" href="/sign-in">
                Sign in
              </Link>
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                name="email"
                placeholder="you@example.com"
                required
                className="bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder-zinc-600 focus:border-red-600 focus:ring-red-600"
              />
            </div>
            <SubmitButton
              formAction={forgotPasswordAction}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
            >
              Reset Password
            </SubmitButton>
            <FormMessage message={searchParams} />
          </div>
        </form>
      </div>
    </div>
  );
}
