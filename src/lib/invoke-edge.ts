import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export type InvokeEdgeResult<T> = { data: T | null; error: Error | null };

/**
 * Wraps supabase.functions.invoke and surfaces the edge function's actual
 * error message instead of the generic "Edge Function returned a non-2xx
 * status code" string. Use this in place of supabase.functions.invoke at
 * call sites where the user sees the error.
 */
export async function invokeEdge<T = unknown>(
  name: string,
  body?: unknown,
): Promise<InvokeEdgeResult<T>> {
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body: body as Record<string, unknown> | undefined,
  });
  if (!error) return { data: (data ?? null) as T | null, error: null };

  if (error instanceof FunctionsHttpError) {
    try {
      const ctx = error.context as Response | undefined;
      const text = ctx ? await ctx.text() : "";
      let message = text;
      try {
        const parsed = JSON.parse(text);
        message =
          (typeof parsed?.error === "string" && parsed.error) ||
          (typeof parsed?.message === "string" && parsed.message) ||
          text;
      } catch {
        // not JSON — keep raw text
      }
      return { data: null, error: new Error(message || error.message) };
    } catch {
      return { data: null, error };
    }
  }
  return { data: null, error };
}