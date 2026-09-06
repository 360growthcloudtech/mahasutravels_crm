# WhatsApp booking confirmation + driver assignment templates

Create these **Utility** templates in Meta Business Manager, then set the env vars below.

## 1. Customer — `booking_confirmed`

- **Name:** `booking_confirmed` (must match `WHATSAPP_BOOKING_CONFIRMED_TEMPLATE`)
- **Category:** Utility
- **Language:** English (`en`) — must match `WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_LANG`

### Body

```text
Hello {{1}},

Your booking with Mahasu Travels is confirmed.

Booking: {{2}}
Package: {{3}}
Travel dates: {{4}}
Pickup: {{5}}
Driver: {{6}}
Vehicle: {{7}}

Tap below to view your booking invoice.
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
| Body 4 | Travel → return dates |
| Body 5 | Pickup |
| Body 6 | Driver name(s), or `To be assigned` |
| Body 7 | Vehicle number(s), or `—` |
| Button 1 | Booking UUID |

## 2. Driver — `driver_assignment`

- **Name:** `driver_assignment` (must match `WHATSAPP_DRIVER_ASSIGNMENT_TEMPLATE`)
- **Category:** Utility
- **Language:** English (`en`) — must match `WHATSAPP_DRIVER_ASSIGNMENT_TEMPLATE_LANG`
- **No button** (body only)

### Body

```text
Hello {{1}},

New trip assigned by Mahasu Travels.

Booking: {{2}}
Guest: {{3}}
Package: {{4}}
Travel dates: {{5}}
Pickup: {{6}}
Drop: {{7}}
Vehicle: {{8}}

Please be on time for pickup.
```

Guest phone is **not** included.

### Parameter mapping (CRM → Meta)

| Meta | Value |
|------|--------|
| Body 1 | Driver name |
| Body 2 | Booking number |
| Body 3 | Customer name |
| Body 4 | Tour package |
| Body 5 | Travel → return dates |
| Body 6 | Pickup |
| Body 7 | Drop |
| Body 8 | Vehicle for this assignment |

## When CRM sends

- **Booking create:** always try `booking_confirmed` to the customer; if a driver is assigned, also send `driver_assignment`.
- **Driver assign / reassign:** send `driver_assignment` to newly assigned drivers and re-send `booking_confirmed` to the customer with updated driver/vehicle.
- Sends are **non-blocking** (booking still saves if WhatsApp fails). Results are logged on booking history.

## Server env vars

```bash
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BOOKING_CONFIRMED_TEMPLATE=booking_confirmed
WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_LANG=en
WHATSAPP_DRIVER_ASSIGNMENT_TEMPLATE=driver_assignment
WHATSAPP_DRIVER_ASSIGNMENT_TEMPLATE_LANG=en
WHATSAPP_GRAPH_VERSION=v21.0
APP_PUBLIC_URL=https://admin.mahasutravels.com
```

`APP_PUBLIC_URL` documents the Meta button base host for the customer template; the send API uses the booking id as the dynamic path suffix only.
