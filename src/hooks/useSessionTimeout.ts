import { useEffect } from "react";

export function useSessionTimeout() {
  useEffect(() => {
    // Intentionally no forced timeout: the auth client persists and refreshes
    // sessions so trusted devices stay signed in until the user manually logs out.
  }, []);
}
