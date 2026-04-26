## What I'm seeing

Your screenshot confirms:
- You're in Google Cloud project **"My First Project"** under org **"dominicriddleofficial-org"**
- **Maps JavaScript API**, **Places API**, **Geocoding API**, **Directions API** all show "Disable" (meaning they ARE enabled — that's the action button to disable them)
- You said billing is activated

But the map still fails. There are only a few possible causes left:

### Most likely cause: The new key isn't actually loading yet

The frontend caches the Google Maps API key in a **module-level variable** (`cachedKey` in `useGoogleMapsKey.ts`). After I rotated the secret, that cache only clears with a **hard refresh**. A normal page reload won't do it.

### Other possible causes

1. **Wrong project's key was pasted** — the key `AIzaSyBgYyW_y18lVGVVQ2R1NeCw7REibtMsAaY` might be from a *different* Google Cloud project than the one in your screenshot ("My First Project"). The screenshot project has APIs enabled and billing — but if the key belongs to a different project, that project might still be the one without billing.

2. **API key restrictions blocking the domain** — if the key has HTTP referrer restrictions that don't include `*.lovableproject.com`, `*.lovable.app`, or `gulfcoastpalmservices.com`, every request fails with "RefererNotAllowedMapError" which surfaces as account/key errors.

3. **Billing account is linked but suspended/past-due** — billing being "activated" isn't the same as being in good standing. A suspended billing account on an enabled project still triggers "BillingNotEnabledMapError".

## Plan to fix

### Step 1 — Verify which key the backend is actually serving
I'll call the `maps-config` edge function with your auth token and read back the first/last 6 characters of the key to confirm it matches `AIzaSyBg...MsAaY`. This rules out a stale secret.

### Step 2 — Confirm the key matches the project in your screenshot
You'll go to Google Cloud Console → **APIs & Services → Credentials** in "My First Project" and verify a key beginning with `AIzaSyBg` exists there. If it doesn't, the key belongs to a different project (likely the old suspended one) and we need a fresh key from "My First Project".

### Step 3 — Check & fix API key restrictions
In Google Cloud Console, click the key and confirm:
- **Application restrictions**: Either "None" (for testing) OR HTTP referrers including:
  - `https://*.lovableproject.com/*`
  - `https://*.lovable.app/*`
  - `https://gulfcoastpalmservices.com/*`
  - `https://www.gulfcoastpalmservices.com/*`
- **API restrictions**: Either "Don't restrict key" OR explicitly include Maps JavaScript API, Places API, Geocoding API, Directions API

### Step 4 — Verify billing account is active (not just "activated")
In Google Cloud Console → **Billing**, confirm:
- A billing account is linked to "My First Project"
- The billing account status is **"Active"** (not "Past due", "Suspended", or "Closed")
- Payment method is valid

### Step 5 — Hard refresh the schedule page
After confirming all the above:
- Open `/platform/schedule` or `/ops/schedule`
- Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+F5** (Windows)
- This clears the cached key in `useGoogleMapsKey.ts`

### Step 6 — If still broken, capture the exact error
Open browser DevTools → Console tab on the schedule page. The Google Maps loader will print a specific error like `BillingNotEnabledMapError`, `RefererNotAllowedMapError`, `ApiNotActivatedMapError`, or `InvalidKeyMapError`. That exact error tells us precisely what's wrong, and I can fix it in one shot.

## What I'll do once approved

1. Call the `maps-config` edge function to verify the served key matches what you provided
2. Check edge function logs for any errors
3. Report back the first/last characters of the served key so you can compare against your Google Cloud project
4. Wait for you to hard-refresh the schedule page and share the specific console error if it still fails

## What I can't do from here

I can't read your Google Cloud Console — only you can verify the key belongs to the project in your screenshot, that billing is truly active (not past-due), and that referrer restrictions are correct.
