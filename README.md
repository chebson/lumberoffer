# LumberOffer

Personalized, delivered-price lumber offers for sawmills. Pick a species group, and every buyer in it gets their own email from the mill's address, with only the lines they buy, priced delivered to each of their yards. LumberOffer tracks who opened their offer and how many times, and buyers can buy or counter in one click.

Built with Next.js, Clerk (logins), Supabase (database) and Postmark (email).

## What's in it

| Screen | What it does |
| --- | --- |
| Send offers | Species groups (SPF buyers, Douglas Fir buyers...), select buyers, preview each email, send |
| Opens & bids | Opens per buyer, hot leads, bids and counters to confirm or decline |
| Customers | Buyer, email, currency, what they buy, and any number of yards (truck or rail) |
| Price list | Mill prices per MBF with tallies; edit a price or load a new list from CSV |
| Freight | Truck quotes per load and rail $/MBF, loaded from CSV |
| Settings | Mill name, sender, subject prefix, truck quote rule, USD/CAD rate, MBF per truck |
| Buyer page `/o/<token>` | The buyer's offer, a column per yard, Buy and Counter on every line |

Delivered price per yard = mill price + freight + any customer adjustment.
Truck freight = the lane's quote (highest, lowest or average) / MBF per truck for that species and equipment, converted to the customer's currency. Rail freight = the lane's $/MBF.

Email subject: `<prefix> <species> Offering - <customer> - <buyer>`, e.g. `Simfor Douglas Fir Offering - Mountain West - Mark Jensen`.

## Setting up a mill (about an hour)

Each mill owns its own copy, on accounts in the mill's name.

1. **Supabase**: create a project. In the SQL editor, run `supabase/schema.sql`. Optionally run `supabase/seed.sql` for sample data. Copy the project URL and the `service_role` key (Project settings > API).
2. **Clerk**: create an application with email sign-in. Copy the publishable and secret keys. Under Restrictions, turn on an allowlist for the mill's domain, or set `ALLOWED_EMAILS`.
3. **Postmark**: create a server. Add the mill's domain under Sender signatures and add the DKIM and Return-Path DNS records it shows (the mill's IT or domain registrar does this). Copy the Server API token.
4. **Vercel**: import this GitHub repo and add the environment variables from `.env.example`. Set `APP_URL` to the deployed address (or a subdomain like `offers.millname.com`).
5. **In the app**: open Settings and set the mill name, sender, subject prefix (e.g. `Simfor`) and MBF per truck. Then load the price list, truck rates, rail rates and customers from CSV (templates are in `templates/`).

Leave `POSTMARK_SERVER_TOKEN` empty to run in test mode: sends are recorded and buyer pages work, but no email goes out.

## Running it locally

```
npm install
cp .env.example .env.local   # fill in the keys
npm run dev                  # http://localhost:3000
npm test                     # pricing and email tests
```

## Notes

- **Opens**: a visit to the buyer page counts as an open, and so does the email's tracking image. Apple Mail and some others load images automatically, so page visits are the more reliable signal.
- **Unsubscribe**: every email has an unsubscribe link and one-click unsubscribe headers. Unsubscribed customers are skipped on send. Under CASL and CAN-SPAM, the mill is responsible for having buyers' consent.
- **Offers are frozen at send time**, so a buyer always sees the prices they were sent, even after the price list changes.
- **Security**: all database access is server-side with the service role key, and row level security is on with no public policies. Everything under `/app` requires a login.
