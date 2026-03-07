import { signUpAction } from "@/app/actions"
import { FormMessage, type Message } from "@/components/form-message"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default async function Signup(props: {
  searchParams: Promise<Message>
}) {
  const searchParams = await props.searchParams
  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-[#0A0A0A]">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-red-600 font-bold tracking-widest text-sm">FIRSTWATCH</span>
          </div>
          <p className="text-zinc-500 text-sm">AI Medical Guardian</p>
        </div>

        <form className="flex flex-col w-full p-8 space-y-6 bg-[#111] rounded-xl border border-[#1F1F1F]">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="text-sm text-zinc-500">
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
                id="email"
                placeholder="you@example.com"
                required
                className="bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder-zinc-600 focus:border-red-600 focus:ring-red-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Input
                type="password"
                name="password"
                id="password"
                placeholder="Min. 6 characters"
                minLength={6}
                required
                className="bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder-zinc-600 focus:border-red-600 focus:ring-red-600"
              />
            </div>
            <SubmitButton
              formAction={signUpAction}
              pendingText="Creating account..."
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
            >
              Create Account
            </SubmitButton>
            <FormMessage message={searchParams} />
          </div>
          <p className="text-center text-xs text-zinc-600">
            After sign-up, you&apos;ll complete your medical profile to activate monitoring.
          </p>
        </form>
      </div>
    </div>
  )
}
