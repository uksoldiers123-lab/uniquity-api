
This repo contains a client-side MVP for signup/login using Supabase Auth, with a tenant onboarding flow and Stripe onboarding toggle.

What’s included
- public/index.html: Landing page with unified signup/login and Stripe onboarding toggle
- public/env.js: Public keys (no secrets)
- public/admin-dashboard.html: Admin guard skeleton
- public/tenant-dashboard.html: Tenant guard skeleton
- public/client-dashboard.html: Optional per-tenant content
- public/index.js: Optional separate logic (if you move inline logic to a file)
- How to run locally
  - Ensure you have a public env.js with your SUPABASE_URL and SUPABASE_ANON_KEY
  - Open public/index.html in a browser
  - Sign up; a tenant is created (public.companies) and a user is created/logged in (public.users)
  - After login, you’ll be redirected to admin or tenant dashboard based on the mapped role
- Stripe onboarding
  - The onboarding toggle is stored on the tenant as onboarding_complete (for future Stripe Express onboarding)
  - To actually onboard Stripe, wire a backend or serverless function to create a Stripe Express onboarding URL and flip onboarding_complete
