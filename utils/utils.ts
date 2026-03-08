import { redirect } from "next/navigation";

/**
 * Redirect to `path` with an encoded status message appended as a query param.
 *
 * @param kind  - "error" | "success"
 * @param path  - target route
 * @param msg   - human-readable status message
 */
export function encodedRedirect(
  kind: "error" | "success",
  path: string,
  msg: string,
): never {
  return redirect(`${path}?${kind}=${encodeURIComponent(msg)}`);
}
