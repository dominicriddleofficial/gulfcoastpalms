## Goal
Replace the existing `GOOGLE_MAPS_API_KEY` backend secret with the new key you provided so the schedule map (`/platform/schedule` and `/ops/schedule`) loads without the "account not in good standing" error.

## What I'll do

1. **Update the `GOOGLE_MAPS_API_KEY` secret** in Lovable Cloud to the new value:
   `AIzaSyBgYyW_y18lVGVVQ2R1NeCw7REibtMsAaY`
   - This secret is read by the `maps-config` edge function and returned to the client via the `useGoogleMapsKey` hook.
   - No code changes are required — just rotating the secret value.

2. **Verify the key works** by calling the `maps-config` edge function and confirming it returns the new key, then checking edge function logs for any errors.

3. **Tell you to hard-refresh** the schedule page (Cmd/Ctrl + Shift + R) since the key is cached client-side in `useGoogleMapsKey.ts` (module-level `cachedKey` variable).

## Important notes about this key

- The key starts with `AIzaSy...` which is a valid Google API key format.
- For this to actually work in production, the Google Cloud project that owns this key must have:
  - **Billing enabled and in good standing** (this was the previous blocker)
  - **Maps JavaScript API**, **Places API**, and **Geocoding API** enabled
  - **HTTP referrer restrictions** that allow your domains:
    - `https://gulfcoastpalms.lovable.app/*`
    - `https://*.lovable.app/*`
    - `https://gulfcoastpalmservices.com/*`
    - `https://www.gulfcoastpalmservices.com/*`
- If this new key is from a **different Google Cloud project** with active billing, the error will go away.
- If it's from the same suspended billing account, it will still fail with the same error — the key isn't the problem, the billing is.

## Security note

You just shared this API key in plain chat. Anyone reading this conversation can use it. After we install it, I recommend you:
- Lock it down with HTTP referrer restrictions in Google Cloud Console (so only your domains can use it)
- Restrict it to only the APIs you need (Maps JS, Places, Geocoding)
- Consider rotating it later once everything is stable

## No code changes needed
All the wiring (`maps-config` edge function → `useGoogleMapsKey` hook → `ScheduleMap` / `RouteView`) is already in place. Only the secret value needs updating.