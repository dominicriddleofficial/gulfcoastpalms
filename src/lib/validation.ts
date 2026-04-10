import { z } from "zod";

// === Sanitization ===
export const sanitizeText = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
};

const sanitized = z.string().transform(sanitizeText);

// === Reusable field schemas ===
const nameField = sanitized.pipe(z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be under 100 characters"));
const phoneField = z.string().regex(/^[\d\s\-\(\)\+]{7,20}$/, "Invalid phone number").optional().or(z.literal(""));
const emailField = z.string().email("Invalid email").max(255).optional().or(z.literal(""));
const messageField = sanitized.pipe(z.string().max(2000, "Message must be under 2000 characters")).optional().or(z.literal(""));
const cityField = sanitized.pipe(z.string().max(100)).optional().or(z.literal(""));
const serviceField = sanitized.pipe(z.string().max(100)).optional().or(z.literal(""));

// === Public lead form ===
export const leadFormSchema = z.object({
  name: nameField,
  phone: phoneField,
  email: emailField,
  message: messageField,
  service: serviceField,
  location: cityField,
  source: z.string().max(255).optional(),
  sqft: z.number().int().min(0).max(1000000).optional(),
});

// === Emergency form ===
export const emergencyFormSchema = z.object({
  name: nameField,
  phone: z.string().regex(/^[\d\s\-\(\)\+]{7,20}$/, "Phone number is required"),
  address: sanitized.pipe(z.string().min(2).max(255)),
  damage: sanitized.pipe(z.string().max(2000)).optional().or(z.literal("")),
});

// === Holiday lighting form ===
export const holidayLightingSchema = z.object({
  name: nameField,
  phone: z.string().regex(/^[\d\s\-\(\)\+]{7,20}$/, "Phone number is required"),
  email: emailField,
  address: sanitized.pipe(z.string().max(255)).optional().or(z.literal("")),
  propertyType: z.string().max(50).optional().or(z.literal("")),
  roofline: z.string().max(50).optional().or(z.literal("")),
  notes: messageField,
});

// === Career application ===
export const careerApplicationSchema = z.object({
  full_name: nameField,
  age: z.string().max(3).optional().or(z.literal("")),
  phone: z.string().regex(/^[\d\s\-\(\)\+]{7,20}$/, "Phone number is required"),
  email: emailField,
  city: cityField,
  has_transportation: z.string().max(10).optional().or(z.literal("")),
  has_experience: z.string().max(50).optional().or(z.literal("")),
  work_experience: sanitized.pipe(z.string().max(2000)).optional().or(z.literal("")),
  comfortable_outdoors: z.string().max(10).optional().or(z.literal("")),
  why_good_fit: sanitized.pipe(z.string().max(2000)).optional().or(z.literal("")),
  best_contact_time: z.string().max(50).optional().or(z.literal("")),
  acknowledged: z.boolean().refine(v => v === true, "You must acknowledge"),
});

// === Referral form ===
export const referralFormSchema = z.object({
  referrerName: nameField,
  referrerPhone: phoneField,
  referrerEmail: emailField,
  referredName: nameField,
  referredPhone: phoneField,
  referredEmail: emailField,
  referredService: serviceField,
});

// === Text consent form ===
export const textConsentSchema = z.object({
  name: nameField,
  phone: z.string().regex(/^[\d\s\-\(\)\+]{7,20}$/, "Phone number is required"),
});

// === SOP acknowledgment ===
export const sopFormSchema = z.object({
  name: nameField,
  phone: z.string().regex(/^[\d\s\-\(\)\+]{7,20}$/, "Phone number is required"),
});

// === Platform lead form ===
export const platformLeadSchema = z.object({
  inquiry_name: nameField,
  inquiry_phone: phoneField,
  inquiry_email: emailField,
  service_requested: serviceField,
  source_page: z.string().max(255).optional(),
  notes: messageField,
});
