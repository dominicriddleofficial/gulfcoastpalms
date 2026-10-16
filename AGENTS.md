# Public marketing architecture
- General-tree service pages use the shared service data and ServicePage renderer so runtime copy, initial HTML and service schema stay aligned.
- Public navigation groups and quote choices are derived from service data while retaining legacy option labels so existing intake values remain compatible.
- Keep all public routes in the shared SEO route table because it drives initial metadata, indexing guards and sitemap generation.