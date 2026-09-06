# WhatsApp payment reminder template (12 hours before pickup)

Create this **Utility** template in Meta Business Manager, then set the env vars below.

Reminders run when a booking has `travel_date`, `pickup_time`, and `balance > 0`.
The cron job fires about **12 hours before** that start time (Asia/Kolkata).

## Customer — `payment_reminder`

- **Name:** `payment_reminder` (must match `WHATSAPP_PAYMENT_REMINDER_TEMPLATE`)
- **Category:** Utility
- **Language:** English (`en`) — must match `WHATSAPP_PAYMENT_REMINDER_TEMPLATE_LANG`

### Body

```text
Hello {{1}},

Reminder from Mahasu Travels — your trip starts in about 12 hours and a balance is still due.

Booking: {{2}}
Package: {{3}}
Pickup time: {{4}}
Balance due: ₹{{5}}

Please complete payment before pickup. Tap below to view your invoice.
```

### Button

- Type: **Visit website** (URL)
- Dynamic URL
- Base: `https://admin.mahasutravels.com/invoice/`
- Suffix variable: `{{1}}` (CRM sends the booking UUID)

### Footer (optional)

`Mahasu Travels`

### Parameter mapping (CRM → Meta)

| Meta | Value |
|------|--------|
| Body 1 | Customer name |
| Body 2 | Booking number |
| Body 3 | Tour package |
| Body 4 | Pickup date + time (e.g. 10 Sep, 6:00 am) |
| Body 5 | Balance amount (digits, e.g. `6,000`) — template already includes ₹ |
| Button 1 | Booking UUID |

## Server env vars

```bash
WHATSAPP_PAYMENT_REMINDER_TEMPLATE=payment_reminder
WHATSAPP_PAYMENT_REMINDER_TEMPLATE_LANG=en
CRON_SECRET=generate-a-long-random-string
CRON_PAYMENT_REMINDERS_ENABLED=true
CRON_PAYMENT_REMINDER_HOURS_BEFORE=12
CRON_REMINDER_WINDOW_MINUTES=15
```

Cron endpoint: `GET` or `POST` `/api/cron/payment-reminders`  
Auth: `Authorization: Bearer $CRON_SECRET` or `?secret=$CRON_SECRET`  
Schedule: every 15 minutes (see `vercel.json`).  
Disable without redeploying schedule: `CRON_PAYMENT_REMINDERS_ENABLED=false`.

## Behaviour

- No pickup time → no reminder
- Balance ≤ 0 → not selected
- Each booking reminded at most once (`payment_reminder_sent_at`)
- Changing travel date or pickup time clears the sent flag so a new schedule can remind again
