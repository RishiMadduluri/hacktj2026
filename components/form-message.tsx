/* ------------------------------------------------------------------ */
/*  FormMessage — renders success / error / info feedback               */
/* ------------------------------------------------------------------ */

export type Message =
  | { success: string }
  | { error: string }
  | { message: string };

type FormMessageProps = {
  message: Message;
};

export function FormMessage({ message }: FormMessageProps) {
  if ("success" in message) {
    return (
      <div className="flex flex-col gap-2 w-full max-w-md text-sm">
        <div className="text-foreground border-l-2 border-foreground px-4">
          {message.success}
        </div>
      </div>
    );
  }

  if ("error" in message) {
    return (
      <div className="flex flex-col gap-2 w-full max-w-md text-sm">
        <div className="text-destructive-foreground border-l-2 border-destructive-foreground px-4">
          {message.error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-md text-sm">
      <div className="text-foreground border-l-2 px-4">{message.message}</div>
    </div>
  );
}
