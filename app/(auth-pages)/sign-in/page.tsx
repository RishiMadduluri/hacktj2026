import { signInAction } from "@/app/actions"
import { FormMessage, type Message } from "@/components/form-message"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams
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
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Demo credentials hint */}
          <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg">
            <p className="text-xs text-red-400 font-medium mb-1">Demo Credentials</p>
            <p className="text-xs text-zinc-400">
              Email: <span className="text-white font-mono">demo@firstwatch.com</span>
            </p>
            <p className="text-xs text-zinc-400">
              Password: <span className="text-white font-mono">demo123</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                name="email"
                id="email"
                placeholder="demo@firstwatch.com"
                defaultValue="demo@firstwatch.com"
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
                placeholder="demo123"
                defaultValue="demo123"
                required
                className="bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder-zinc-600 focus:border-red-600 focus:ring-red-600"
              />
            </div>
            <SubmitButton
              pendingText="Signing in..."
              formAction={signInAction}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
            >
              Sign in
            </SubmitButton>
            <FormMessage message={searchParams} />
          </div>
        </form>
      </div>
    </div>
  )
}
