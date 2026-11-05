# AI powered finance assistant 

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_JiOwfi351B8KRrB7yXpICFGKq6jZ)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Groq AI setup

Add your Groq API key to `.env.local` in the project root:

```env
GROQ_API_KEY=your_groq_api_key
```

The AI advice endpoint uses Groq's `openai/gpt-oss-20b` model. Restart the development server after changing environment variables. For deployment, configure `GROQ_API_KEY` in your hosting provider's server-side environment settings.

The Investments page can request an AI market review from `/api/investment-insight`. The server retrieves recent index snapshots (S&P 500, NIFTY 50, EURO STOXX 50, and Nikkei 225) from Yahoo Finance's chart feed and passes only those returned quotes and the user's displayed monthly allocation to Groq. This is on-demand market context, not a live trading feed or investment recommendation; if market data is unavailable, the route returns an error instead of asking AI to invent current conditions. Currency estimates elsewhere in the investment planner use dated daily reference rates from Frankfurter.

The notification center derives P2P transfer and request alerts from the signed-in user's live Firestore transaction ledger. It also calculates monthly Costs/Wants threshold reminders from P2P transactions only, using the profile income and illustrative 50/30 budget guide; these reminders do not include activity outside Aeris. Read state and alert preferences are stored in the current browser. Background push and email notifications are not configured.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
