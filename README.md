# Your App

A Next.js application with custom routing structure.

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
/your-app
  /app
    /dashboard       → route: /dashboard
    /screen-a        → route: /screen-a
    /screen-b        → route: /screen-b
    /layout.tsx      → Root layout component
    /page.tsx        → Home page
  /components        → Shared UI components
  /lib               → Shared logic/utilities
  /styles            → Global CSS and shared styles
  /public            → Static assets
  /types             → TypeScript type definitions
```

## Routes

- `/` - Home page with navigation links
- `/dashboard` - Dashboard with metrics and activity
- `/screen-a` - Configuration panel
- `/screen-b` - Data visualization and actions

## Technologies Used

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React 18 # gretel-screens
