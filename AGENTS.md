# Public marketing architecture
- General-tree service pages use the shared service data and ServicePage renderer so runtime copy, initial HTML and service schema stay aligned.
- Public navigation groups and quote choices are derived from service data while retaining legacy option labels so existing intake values remain compatible.
- Keep all public routes in the shared SEO route table because it drives initial metadata, indexing guards and sitemap generation.- Arborist guest quote links go only through the arborist-link edge function and service-only link RPCs (hash-only tokens, per-request lock/expiry checks); never grant anon or authenticated access to link tables or RPCs, because the link token is the only guest credential.
