# WhatsApp trip reminder templates (3 hours before pickup)

Create these **Utility** templates in Meta Business Manager, then set the env vars below.

Reminders run when a booking has both `travel_date` and `pickup_time` set. The cron job
fires about **3 hours before** that start time (Asia/Kolkata).

## 1. Customer — `trip_reminder`

- **Name:** `trip_reminder` (must match `WHATSAPP_TRIP_REMINDER_TEMPLATE`)
- **Category:** Utility
- **Language:** English (`en`) — must match `WHATSAPP_TRIP_REMINDER_TEMPLATE_LANG`

### Body

```text
Hello {{1}},

Reminder from Mahasu Travels — your trip starts in about 3 hours.

Booking: {{2}}
Package: {{3}}
Pickup time: {{4}}
Pickup: {{5}}
Driver: {{6}}
Vehicle: {{7}}

Please be ready at the pickup point. Safe travels!
```

### Parameter mapping

| Meta | Value |
|------|--------|
| Body 1 | Customer name |
| Body 2 | Booking number |
| Body 3 | Tour package |
| Body 4 | Pickup date + time (e.g. 10 Sep, 6:00 am) |
| Body 5 | Pickup point |
| Body 6 | Driver name(s), or `To be assigned` |
| Body 7 | Vehicle number(s), or `—` |

## 2. Driver — `driver_trip_reminder`

- **Name:** `driver_trip_reminder` (must match `WHATSAPP_DRIVER_TRIP_REMINDER_TEMPLATE`)
- **Category:** Utility
- **Language:** English (`en`)
- **Includes guest phone**

### Body

```text
Hello {{1}},

Trip reminder — pickup in about 3 hours.

Booking: {{2}}
Guest: {{3}}
Guest phone: {{4}}
Package: {{5}}
Pickup time: {{6}}
Pickup: {{7}}
Drop: {{8}}
Vehicle: {{9}}

Please reach on time and contact the guest if needed.
```

### Parameter mapping

| Meta | Value |
|------|--------|
| Body 1 | Driver name |
| Body 2 | Booking number |
| Body 3 | Customer name |
| Body 4 | Customer phone |
| Body 5 | Tour package |
| Body 6 | Pickup date + time |
| Body 7 | Pickup point |
| Body 8 | Drop point |
| Body 9 | Vehicle for this assignment |

## Server env vars

```bash
WHATSAPP_TRIP_REMINDER_TEMPLATE=trip_reminder
WHATSAPP_TRIP_REMINDER_TEMPLATE_LANG=en
WHATSAPP_DRIVER_TRIP_REMINDER_TEMPLATE=driver_trip_reminder
WHATSAPP_DRIVER_TRIP_REMINDER_TEMPLATE_LANG=en
CRON_SECRET=generate-a-long-random-string
CRON_TRIP_REMINDERS_ENABLED=true
CRON_TRIP_REMINDER_HOURS_BEFORE=3
CRON_REMINDER_WINDOW_MINUTES=15
```

Cron endpoint: `GET` or `POST` `/api/cron/trip-reminders`  
Auth: `Authorization: Bearer $CRON_SECRET` or `?secret=$CRON_SECRET`  
Schedule: every 15 minutes (see `vercel.json`).  
Disable without redeploying schedule: `CRON_TRIP_REMINDERS_ENABLED=false`.
