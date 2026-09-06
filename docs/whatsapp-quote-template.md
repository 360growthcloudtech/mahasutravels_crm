# WhatsApp quote proposal template

Create this **Utility** template in Meta Business Manager, then set the env vars below.

## Template

- **Name:** `quote_proposal` (must match `WHATSAPP_QUOTE_TEMPLATE`)
- **Category:** Utility
- **Language:** English (`en`) — must match `WHATSAPP_QUOTE_TEMPLATE_LANG`

### Body

```text
Hello {{1}},

Greetings from Mahasu Travels. Thank you for your enquiry.

Package: {{2}}
Destination: {{3}}
Travel dates: {{4}}
Vehicle: {{5}}
Quote amount: ₹{{6}}

Tap below to view your full itinerary and quote.
```

### Button

- Type: **Visit website** (URL)
- Dynamic URL
- Base: `https://admin.mahasutravels.com/proposal/`
- Suffix variable: `{{1}}` (CRM sends the lead UUID)

Customer gets a link like:

`https://admin.mahasutravels.com/proposal/fe5910d2-a5d9-48cb-adab-48328ae7a57a`

(`?preview=1` is staff-only for drafts. Guests have no CRM session, so the WhatsApp button omits it. After Send quote the quote is **Sent**, and that public URL is enough.)

### Footer (optional)

`Mahasu Travels`

## Parameter mapping (CRM → Meta)

| Meta | Value |
|------|--------|
| Body 1 | Guest name |
| Body 2 | Tour title / package |
| Body 3 | Destination |
| Body 4 | Travel → return dates |
| Body 5 | Vehicle |
| Body 6 | Amount (no ₹; template already has ₹) |
| Button 1 | Lead UUID |

## Server env vars

```bash
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_QUOTE_TEMPLATE=quote_proposal
WHATSAPP_QUOTE_TEMPLATE_LANG=en
WHATSAPP_GRAPH_VERSION=v21.0
APP_PUBLIC_URL=https://admin.mahasutravels.com
```

`APP_PUBLIC_URL` is documentation for the Meta button base host; the send API uses the lead id as the dynamic path suffix only.
