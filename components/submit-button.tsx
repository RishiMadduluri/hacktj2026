"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

/* ------------------------------------------------------------------ */
/*  SubmitButton — shows pending state via useFormStatus                */
/* ------------------------------------------------------------------ */

type SubmitButtonProps = ComponentProps<typeof Button> & {
  /** Text shown while the form action is in-flight */
  pendingText?: string;
};

export function SubmitButton({
  children,
  pendingText = "Submitting…",
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" aria-disabled={pending} {...rest}>
      {pending ? pendingText : children}
    </Button>
  );
}
