import { redirect } from "next/navigation";
import { z } from "zod";
import { toMinor } from "./money";

/** Reads a FormData into a plain object and validates it. */
export function parseForm<T extends z.ZodTypeAny>(schema: T, form: FormData): z.SafeParseReturnType<unknown, z.infer<T>> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") obj[k] = v.trim();
  }
  return schema.safeParse(obj);
}

export function firstError(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Please check the form and try again.";
  const field = issue.path.join(".");
  return field ? `${label(field)}: ${issue.message}` : issue.message;
}

function label(field: string): string {
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

/** Redirects back to a page with a one-line message shown by <Flash>. */
export function back(path: string, kind: "ok" | "error", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message.slice(0, 300))}`);
}

export const zText = (min = 1, max = 200) => z.string().min(min, "is required").max(max, `must be ${max} characters or fewer`);
export const zEmail = z.string().email("must be a valid email address").max(200).transform((e) => e.toLowerCase());
export const zInt = (min: number, max: number) => z.coerce.number({ invalid_type_error: "must be a number" }).int("must be a whole number").min(min, `must be at least ${min}`).max(max, `must be at most ${max}`);
/** A taka amount typed by a person, converted to minor units. */
export const zTaka = (minTaka: number, maxTaka: number) =>
  z.coerce
    .number({ invalid_type_error: "must be a number" })
    .min(minTaka, `must be at least ৳${minTaka.toLocaleString("en-IN")}`)
    .max(maxTaka, `must be at most ৳${maxTaka.toLocaleString("en-IN")}`)
    .transform(toMinor);
export const zFormat = z.enum(["ONLINE", "ONSITE", "EITHER"], { errorMap: () => ({ message: "choose a format" }) });
