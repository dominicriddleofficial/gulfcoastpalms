// Shared CORS origin logic for edge functions
// Copy this pattern into each edge function

export const ALLOWED_ORIGINS = [
  "https://gulfcoastpalmservices.com",
  "https://www.gulfcoastpalmservices.com",
  "https://gulfcoastpalms.lovable.app",
  "https://id-preview--2e9a44f0-ac4c-4ebd-ad4f-dd591d732484.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

export function getAllowedOrigin(requestOrigin: string | null): string {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGINS[0];
}
