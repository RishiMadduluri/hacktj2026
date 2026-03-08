import { resetPasswordAction } from "@/app/actions";
import { FormMessage, type Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ------------------------------------------------------------------ */
/*  Reset Password Page                                                */
/* ------------------------------------------------------------------ */

export default async function ResetPasswordPage(props: {
  searchParams: Promise<Message>;
}) {
  const params = await props.searchParams;

  return (
    <form className="flex flex-col w-full max-w-md p-4 gap-2 [&>input]:mb-4">
      <h1 className="text-2xl font-medium">Reset your password</h1>
      <p className="text-sm text-foreground/60">
        Enter a new password below to update your account.
      </p>

      <Label htmlFor="password">New password</Label>
      <Input
        id="password"
        type="password"
        name="password"
        placeholder="Enter new password"
        required
      />

      <Label htmlFor="confirmPassword">Confirm password</Label>
      <Input
        id="confirmPassword"
        type="password"
        name="confirmPassword"
        placeholder="Re-enter new password"
        required
      />

      <SubmitButton formAction={resetPasswordAction}>
        Update Password
      </SubmitButton>

      <FormMessage message={params} />
    </form>
  );
}
