# GroundUp Estimating Pro

AI-assisted estimating software for electrical, utility, and civil contractors.

The platform is designed around a practical estimating workflow:

- Create projects and bid workspaces
- Upload plans, specs, addenda, and quotes
- Build estimates from line items and assemblies
- Calculate labor, material, equipment/subcontractor, tax, contingency, and markup
- Use AI for scope review, RFIs, risk checks, and proposal writing
- Save project history in Supabase and deploy through Vercel

## Estimating Data Strategy

AI should not invent pricing. GroundUp uses calculated estimate lines as the source of truth, then AI reviews and explains the estimate.

Starter data sources:

- Seed cost library in `seed-cost-library.csv`
- Contractor overrides and historical bid/job data
- Vendor quotes
- BLS wage data for regional labor baselines
- BLS/FRED indexes for material escalation
- State DOT bid histories for civil/utility validation
- Licensed cost books later if desired

## Key Files

- `project.html` - estimator workspace
- `api/generate-estimate.js` - OpenAI-powered review/proposal/RFI endpoint
- `supabase-client.js` - browser Supabase client
- `supabase-groundup-next.sql` - next Supabase schema and seed data
- `seed-cost-library.csv` - starter electrical/utility/civil assemblies

## Next Steps

1. Run `supabase-groundup-next.sql` in Supabase SQL Editor.
2. Confirm Vercel has `OPENAI_API_KEY` set.
3. Deploy the updated repo.
4. Replace the browser seed library with cost items loaded from Supabase.
5. Add stricter RLS policies to all existing tables before real contractor use.
