# Technology Stack

**Analysis Date:** 2026-04-22

## Languages

**Primary:**
- TypeScript 5.8.3 - All application code, configuration files, and type definitions
- HTML/CSS - UI markup and styling

**Secondary:**
- JavaScript (ES modules) - Configuration files (vite.config.ts, tailwind.config.ts, eslint.config.js, postcss.config.js)
- SQL - Database migrations and schema definition in `supabase/migrations/`

## Runtime

**Environment:**
- Node.js (no specific version locked via .nvmrc - uses system Node)
- Browser runtime: React 18.3.1

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 18.3.1 - UI framework
- React Router 6.30.1 - Client-side routing
- Vite 8.0.0 - Build tool and dev server

**UI Component Library:**
- shadcn/ui - Headless component library (via Radix UI primitives)
- Radix UI - Accessible component primitives (accordion, dialog, select, tabs, etc.)
- Tailwind CSS 3.4.17 - Utility-first CSS framework

**Form & Validation:**
- React Hook Form 7.61.1 - Form state management
- Zod 3.25.76 - TypeScript-first schema validation
- @hookform/resolvers 3.10.0 - Integration layer

**State Management:**
- React Context API (built-in)
- React Query (TanStack Query) 5.83.0 - Server state and data fetching

**Testing:**
- Vitest 4.1.0 - Unit test runner (config: `vitest.config.ts`)
- Playwright 1.57.0 - E2E browser testing (config: `playwright.config.ts`)
- @testing-library/react 16.0.0 - React component testing utilities
- jsdom 20.0.3 - DOM implementation for tests

**Build/Dev:**
- @vitejs/plugin-react 6.0.0 - React Fast Refresh in Vite
- vite-plugin-pwa 1.2.0 - PWA manifest and service worker generation
- TypeScript ESLint 8.38.0 - Linting with TypeScript support
- Autoprefixer 10.4.21 - CSS vendor prefixes
- PostCSS 8.5.6 - CSS transformation pipeline

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.99.2 - Supabase client for auth and database
- posthog-js 1.365.0 - Product analytics

**UI & Interaction:**
- lucide-react 0.462.0 - Icon library
- framer-motion 12.38.0 - Animation library
- sonner 1.7.4 - Toast notifications
- react-markdown 10.1.0 - Markdown rendering
- recharts 2.15.4 - Charts and data visualization
- date-fns 3.6.0 - Date utilities
- input-otp 1.4.2 - OTP input component
- embla-carousel-react 8.6.0 - Carousel component
- react-resizable-panels 2.1.9 - Resizable panel layout
- react-day-picker 8.10.1 - Date picker component
- vaul 0.9.9 - Drawer component
- cmdk 1.1.1 - Command palette component
- next-themes 0.3.0 - Dark mode toggle

**Utilities:**
- clsx 2.1.1 - Conditional CSS class composition
- tailwind-merge 2.6.0 - Merge Tailwind classes without conflicts
- class-variance-authority 0.7.1 - Type-safe component variants

**Dev Tools:**
- eslint 9.32.0 - Code linting
- @eslint/js 9.32.0 - ESLint recommended rules
- globals 15.15.0 - Global variable definitions for linters
- tsx 4.21.0 - TypeScript executor for Node scripts
- @types/react 18.3.23 - React type definitions
- @types/react-dom 18.3.7 - React DOM type definitions
- @types/node 22.16.5 - Node.js type definitions
- @testing-library/dom 10.4.1 - DOM testing utilities
- @testing-library/jest-dom 6.6.0 - Jest DOM matchers
- tailwindcss-animate 1.0.7 - Animation utilities for Tailwind

## Configuration

**Environment:**
- Environment variables loaded via `import.meta.env` (Vite pattern)
- Critical vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Server-only secrets (Anthropic, Gemini, OpenAI API keys) stored in Supabase Edge Function environment
- `.env` file present (contains sensitive configuration - never commit)

**Build:**
- `vite.config.ts` - Vite build and dev config with PWA plugin
- `tsconfig.json` - TypeScript compiler options
- `tsconfig.app.json` - App-specific TypeScript config
- `tsconfig.node.json` - Node/tooling TypeScript config
- `tailwind.config.ts` - Tailwind CSS configuration with custom theme
- `postcss.config.js` - PostCSS pipeline (for Tailwind and Autoprefixer)
- `eslint.config.js` - ESLint rules for .ts and .tsx files
- `playwright.config.ts` - E2E test configuration targeting mobile devices

## Platform Requirements

**Development:**
- Node.js (no version lock - recommend 18+)
- npm package manager
- Modern browser (Chrome, Safari) for development
- Deno runtime (for Supabase Edge Functions development)

**Production:**
- Deployment: Vercel (configured in `vercel.json`)
- PWA installable via web browser (no app stores)
- Supabase backend (PostgreSQL + Edge Functions)

---

*Stack analysis: 2026-04-22*
