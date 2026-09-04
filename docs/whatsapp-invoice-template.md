# WhatsApp booking invoice template

Create this **Utility** template in Meta Business Manager, then set the env vars below.

## Template

- **Name:** `booking_invoice` (must match `WHATSAPP_INVOICE_TEMPLATE`)
- **Category:** Utility
- **Language:** English (`en`) — must match `WHATSAPP_INVOICE_TEMPLATE_LANG`

### Body

```text
Hello {{1}},

Thank you for booking with Mahasu Travels.

Booking: {{2}}
Package: {{3}}
Travel dates: {{4}}
Total amount: ₹{{5}}
Advance paid: ₹{{6}}
Balance due: ₹{{7}}

Tap below to view or download your invoice.
```

### Button

- Type: **Visit website** (URL)
- Dynamic URL
- Base: `https://YOUR_PUBLIC_CRM_DOMAIN/invoice/`
- Suffix variable: `{{1}}` (CRM sends the booking UUID)

### Footer (optional)

`Mahasu Travels`

## Parameter mapping (CRM → Meta)

| Meta | Value |
|------|--------|
| Body 1 | Customer name |
| Body 2 | Booking number |
| Body 3 | Tour package |
| Body 4 | Travel → return dates |
| Body 5 | Total (no ₹; template already has ₹) |
| Body 6 | Advance |
| Body 7 | Balance |
| Button 1 | Booking UUID |

## Server env vars

```bash
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_INVOICE_TEMPLATE=booking_invoice
WHATSAPP_INVOICE_TEMPLATE_LANG=en
WHATSAPP_GRAPH_VERSION=v21.0
APP_PUBLIC_URL=https://YOUR_PUBLIC_CRM_DOMAIN
```

`APP_PUBLIC_URL` is documentation for the Meta button base URL; the send API uses the booking id as the dynamic path suffix only.
