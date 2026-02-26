# CLAUDE.md

This file provides guidance for AI assistants (e.g., Claude Code) working in this repository.

## Project Overview

**AiProject** is a static content site hosted via GitHub Pages. The repository currently serves as a foundation for a static web project. Content pushed to the `main` branch is automatically deployed to GitHub Pages.

## Repository Structure

```
AiProject/
├── .github/
│   └── workflows/
│       └── pages.yml       # GitHub Actions: deploys static content to GitHub Pages
├── CLAUDE.md               # AI assistant guidance (this file)
└── README.md               # Project readme
```

The repository is intentionally minimal. Source files (HTML, CSS, JS, images, etc.) should be placed at the root or in subdirectories as needed — the entire repository is uploaded as the Pages artifact.

## CI/CD: GitHub Pages Deployment

The workflow at `.github/workflows/pages.yml`:

- **Trigger:** Pushes to `main`, or manual `workflow_dispatch`
- **Action:** Uploads the entire repository root (`.`) as a GitHub Pages artifact and deploys it
- **Concurrency:** Only one deployment runs at a time; new deploys cancel in-progress ones
- **Required permissions:** `contents: read`, `pages: write`, `id-token: write`

> Any file at the repository root will be publicly served. Avoid committing secrets or sensitive files.

## Branch Conventions

| Branch pattern | Purpose |
|---|---|
| `main` | Production branch — triggers Pages deployment |
| `master` | Legacy default branch (do not push here) |
| `claude/<description>-<session-id>` | AI-assisted feature/task branches |

AI assistants must develop on their designated `claude/` branch and push there. Only merge to `main` when work is complete and reviewed.

## Development Workflow

1. **Work on the designated branch** — never push directly to `main` without a PR
2. **Commit incrementally** with clear, descriptive messages
3. **Push with tracking:** `git push -u origin <branch-name>`
4. **Open a PR** to `main` when work is ready for review and deployment

## Adding Static Content

Since this is a GitHub Pages site, place any static files (HTML, CSS, JS, assets) at the repository root or in subdirectories. There is no build step — files are served as-is.

If a build step is added in the future (e.g., a static site generator), update:
- `.github/workflows/pages.yml` to run the build and point the artifact `path` to the build output directory
- This CLAUDE.md with the new build commands and structure

## Key Notes for AI Assistants

- **No build system exists yet** — do not assume `npm`, `make`, or any build tool is available
- **No test suite exists yet** — if tests are added, document the test command here
- **No linter/formatter is configured** — follow standard conventions for whatever language is introduced
- **The default Pages branch is `main`** — changes only go live when merged to `main` and the workflow completes
- **Secrets:** Never commit API keys, tokens, or credentials; GitHub Pages serves everything publicly
