# Page Performance Analysis

English | [中文](./README.zh-CN.md)

Page Performance Analysis is a local-first workspace for frontend developers. Instead of only giving you a single Lighthouse run, it helps you turn performance work into an iterative workflow with sampling, comparison, history tracking, and actionable next steps.

## Why this project

PageSpeed and Lighthouse are already powerful, but day-to-day performance work usually breaks down in a few familiar places:

- Running the same page multiple times often produces noisy results
- It is hard to compare the latest result with the previous optimization pass
- Raw audits are useful, but they do not always make the next action obvious

This project is meant to fill in those gaps and make Lighthouse data easier to use as part of normal development work.

One-line positioning:

> A local-first PageSpeed / Lighthouse workspace for iterative performance work.

## Features

- Single-page analysis with `mobile` and `desktop` strategies
- Dual analysis sources: public URLs use Google PSI, internal URLs can use local Lighthouse
- Triple parallel sampling: each URL is analyzed 3 times in parallel, and successful samples are averaged
- Metric summary for Score, LCP, CLS, FCP, TBT, Speed Index, and Interactive
- Action-oriented recommendations derived from Lighthouse audits
- Local history tracking with SQLite for trend review and previous-run comparison
- Request cancellation without saving incomplete snapshots

## Screens and workflow

- `New Analyze`: enter a URL and choose strategy and source mode
- `Analyze Result`: inspect metrics, recommendations, and opportunities
- `History`: track repeated runs for the same URL over time
- `Compare`: compare two pages side by side under the same strategy

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma + SQLite
- Google PageSpeed Insights API v5
- Lighthouse + chrome-launcher

## Quick start

1. Install dependencies

```bash
npm install
```

2. Copy the environment template and adjust it if needed

```bash
cp .env.example .env
```

3. Run the setup script

```bash
npm run setup
```

4. Start the development server

```bash
npm run dev
```

5. Open the app

```text
http://localhost:3000
```

## Environment variables

The current required variables are listed in `.env.example`:

```bash
DATABASE_URL="file:./dev.db"
GOOGLE_API_KEY=""
```

- `DATABASE_URL`: SQLite database path, using a local file in the project root by default
- `GOOGLE_API_KEY`: optional, but strongly recommended for more stable quota behavior

## Useful scripts

```bash
npm run setup
npm run db:push
npm run db:studio
npm run typecheck
npm run check
```

- `npm run setup`: generate the Prisma client and initialize the local database
- `npm run db:push`: sync the Prisma schema to the current database
- `npm run db:studio`: open Prisma Studio to inspect stored history data
- `npm run typecheck`: run TypeScript type checking
- `npm run check`: run linting, type checking, and a production build

## How to use

1. Enter an `http` or `https` page URL
2. Choose `mobile` or `desktop`
3. Use `external` for public pages and `internal` for local or private environments
4. Run the analysis and inspect the averaged key metrics
5. Analyze the same URL again later to see changes in `History`

## Project scope

This project is currently best suited for:

- Frontend developers validating optimization work locally
- Small teams tracking performance changes across a few important pages
- Turning Lighthouse output into more actionable next steps

It does not currently include:

- Multi-user accounts
- Shared cloud storage
- Scheduled monitoring or alerting
- CI comment bots or direct GitHub integrations

## Development notes

- `external` mode requires a URL that Google PSI can access publicly
- `internal` mode depends on local Chrome/Lighthouse and is useful for LAN, staging, or local development targets
- History data is stored in local SQLite by default and is not automatically synced anywhere

## CI

The repository includes a basic GitHub Actions workflow that runs on push and pull requests:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Contributing

Issues, discussions, and pull requests are all welcome. Before contributing, you may want to check:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md)

## License

This project is released under the [MIT License](./LICENSE).
