# Roomies

A household chore planner with recurring schedules, fair assignments, and a shared grocery list. Built with React and a Node.js API.

**[Open the interactive demo](https://naksismee.github.io/roomies/)** · **[Report an issue](https://github.com/naksismee/roomies/issues)**

## Try it in a minute

Open the demo and select **Try the demo**. Explore a sample household without creating an account:

1. Complete a chore and watch its due date and assigned roommate update.
2. Use **Undo** to restore the previous turn.
3. Open **Calendar** to inspect recurring dates and planned assignments.
4. Add groceries and mark them purchased.
5. To try onboarding, exit the demo and choose **Create a house**.

The public demo saves each visitor's changes in their own browser. It is a product demonstration, not a shared multi-user service. The included local API supports accounts and shared households.

## Run locally

Install **Node.js 20 or later** and Git, then run:

```sh
git clone https://github.com/naksismee/roomies.git
cd roomies
npm ci
npm start
```

Open **http://localhost:3000**. This starts the account-free demo. No API keys or database setup are needed. Stop it with **Ctrl+C**.

If the lockfile is unavailable, use `npm install` instead of `npm ci`.

### Run with the local backend

```sh
npm run start:full
```

Open **http://localhost:3000**. This command starts both React and the Node API on port 3001. Create an account, set up a household, and use a second account to test joining with an invite code. Email delivery and password-reset email are not configured.

Household records are saved to `data/roomies.json`, which is excluded from Git. Passwords use salted scrypt hashes; sessions use HTTP-only cookies.

## Features

- Six-step household setup, including solo and shared households.
- Suggested and custom chores grouped by shared area.
- Daily, weekly, and custom repeat intervals.
- Automatic assignment based on estimated weekly effort, or manual assignment.
- Optional rotation to the next roommate after completion.
- Completion history, undo, editing, due-date changes, and chore removal.
- Monthly calendar with planned turns and a selected-day agenda.
- Shared grocery list with quantities and purchase status.
- Responsive pink-and-lilac interface with strawberry page transitions and reduced-motion support.

### How recurrence works

Completing a chore advances its due date by its repeat interval. For overdue chores, the interval starts from today. If rotation is enabled, the next occurrence goes to the next household member. The calendar forecasts future turns assuming chores are completed on schedule; it does not silently complete overdue work.

## Checks

```sh
npm test -- --watchAll=false --runInBand
npm run test:server
npm run build
```

Tests cover setup, browser persistence, calendar rotation, account isolation, invite codes, recurrence, undo, grocery sharing, and server restart persistence.

## Project structure

```text
src/                  React components, setup wizard, calendar, demo adapter
server/               Node API and integration tests
scripts/              Development and build launchers
public/               HTML template and browser icons
.github/workflows/    Automated checks and GitHub Pages deployment
```

## Deployment

GitHub Pages serves the browser-local demo from the `gh-pages` branch. On each push to `main`, the workflow runs the checks, builds the site, updates that branch, and requests a Pages build. The repository is configured to publish the root of `gh-pages`; no external hosting account is required.

For the account-backed version, run `npm run build:full` and `npm run serve` on a Node host with persistent disk storage. Use HTTPS and `COOKIE_SECURE=true` for an internet-facing deployment. GitHub Pages does not run the Node API.
