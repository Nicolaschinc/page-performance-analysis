# Contributing

Thank you for helping improve this project.

## Before you start

- Please read [README.md](./README.md) first to understand the project goals and local workflow
- If you are planning a larger feature or architectural change, opening an issue first is strongly recommended
- If you are fixing a bug, feel free to open a PR directly, and include reproduction steps when possible

## Local setup

1. Install dependencies

```bash
npm install
```

2. Create the environment file

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

## Pull request guidelines

- Keep each PR focused and avoid bundling unrelated refactors into the same change
- If your change affects user-facing behavior, explain the before-and-after impact in the PR description
- If you introduce new configuration, scripts, or environment variables, update the README in the same PR
- Before submitting, please run at least:

```bash
npm run lint
npm run typecheck
```

## Code style

- Follow the existing code style and project structure whenever possible
- Prefer explicit types and avoid pushing complex logic into page components
- If logic is reusable, place it in `src/lib` or another appropriate boundary

## Good first contributions

- Improve error messages and empty states
- Refine the README or bilingual documentation copy
- Add tests or automation checks
- Improve Lighthouse result aggregation and presentation
