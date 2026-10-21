"use client";
import { useRef } from "react";
/** Keep the same key after an uncertain response; changed input/new successful
 * submission is a separate enquiry. No contact details go into browser storage. */
export function useLeadSubmission() {
  const attempt = useRef<{ body: string; key: string } | null>(null);
  return async (url: string, init: RequestInit) => {
    const body = String(init.body);
    if (!attempt.current || attempt.current.body !== body) attempt.current = { body, key: crypto.randomUUID() };
    const headers = new Headers(init.headers);
    headers.set("idempotency-key", attempt.current.key);
    const response = await fetch(url, { ...init, headers });
    if (response.ok) attempt.current = null;
    return response;
  };
}
