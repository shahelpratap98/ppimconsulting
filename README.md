# PPIM Consulting — Website

Website for **Priya Pratap Immigration Consulting (PPIM Consulting)**, a licensed
immigration advisory practice based in Auckland, New Zealand, with offices in
Nadi and Suva, Fiji.

Built with [Next.js](https://nextjs.org) 16, [Tailwind CSS](https://tailwindcss.com) v4,
and [Framer Motion](https://www.framer.com/motion/).

## Pages

- **Home** — hero, stats, services overview, testimonials
- **About** — firm story and adviser profile
- **Services** — overview plus five visa category pages (Skilled Migrant, Work,
  Student, Partner & Family, Business & Investor)
- **Book a Consultation** — enquiry form (delivers to info@ppimconsulting.co.nz)
- **Contact** — office details, map, WhatsApp

## Development

```bash
npm install
npm run dev      # start dev server on http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

## Editing content

Business details (name, phone, email, addresses, WhatsApp link), visa service
copy, testimonials, and stats all live in [`src/lib/data.ts`](src/lib/data.ts).
