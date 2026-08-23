# Lead webhook (multi-site forms)

Single ingest endpoint for all marketing websites and ad tools.

## Endpoint

```
POST /api/webhooks/leads
```

**Auth:** header `x-api-key` must match `LEADS_INGEST_API_KEY`.

**CORS:** origins listed in `LEADS_INGEST_ORIGINS` (comma-separated), or any origin if unset.

Local example base URL: `http://localhost:3000/api/webhooks/leads`

## Identity rules

| Field | Rule |
|-------|------|
| `phone` **or** `email` | At least one required |
| `name` | Optional → defaults to `Website lead` |
| All trip / UTM / form fields | Optional |

Marketing `source` is derived from UTM (`google_ads` / `meta_ads` / `website`). CRM-created leads use `manual`.

## `form_type` catalog

| Website | Form | `form_type` |
|---------|------|-------------|
| mahasutravels.com | Quick Inquiry | `quick_inquiry` |
| mahasutravels.com | Request a Call / Call Me Back / Get Support | `request_callback` |
| mahasutravels.com | Write to Us (Contact) | `contact` |
| mahasutravels.com | Enquire Now / Plan Your Trip | `enquire_now` |
| mahasutravels.com | Taxi Price Calculator | `taxi_calculator` |
| himachaltaxitrip.com | Taxi Price Calculator | `taxi_calculator` |
| himachaltaxitrip.com | Get In Touch | `contact` |
| himachaltaxitrip.com | Cab Book Now modal | `cab_booking` |
| himachaltouristcabs.com | Taxi Price Calculator / Send Enquiry | `taxi_calculator` |
| himachaltouristcabs.com | Taxi Booking Form | `taxi_booking` |
| himachaltouristcabs.com | Contact | `contact` |
| himachaltourismcab.com | Taxi Price Calculator / Book Package | `taxi_calculator` |
| himachaltourismcab.com | Cab Book modal | `cab_booking` |
| himachaltourismcab.com | Quick Call Back | `request_callback` |
| himachaltourismcab.com | Contact Get in Touch | `contact` |

Unknown `form_type` values are stored as-is.

Always send `website` (domain) and/or `page_url` (full URL with UTM query string when present).

## Field aliases

Any of these keys work (first non-empty wins):

| Canonical | Also accepted |
|-----------|----------------|
| `name` | `full_name`, `your_name` |
| `phone` | `phone_no`, `phone_number`, `mobile`, `mobile_number` |
| `email` | `email_id`, `email_address` |
| `pickup` | `pickup_location`, `pick_up_location`, `location` |
| `drop` | `drop_location`, `dropoff`, `drop_off_location`, `dropoff_location` |
| `car` | `cab`, `select_cab`, `vehicle`, `cab_type` (free text OK) |
| `tour_package` | `tour_packages`, `package`, `destination` |
| `pickup_date` | `travel_date`, `pick_up_date` |
| `drop_date` | `drop_off_date` |
| `adults` | `no_of_persons`, `persons`, `passengers`, `no_of_passengers` |
| `kids` | `children` |
| `days` | `no_of_days`, `number_of_days` |
| `notes` | built from `notes` + `subject` + `message` + `direction` |

UTM: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, or parse from `page_url` / `landing_url`.

## Curl examples

Replace `YOUR_LEADS_INGEST_API_KEY` with your env value.

### Call Me Back / Request a Call

```bash
curl -X POST "http://localhost:3000/api/webhooks/leads" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_LEADS_INGEST_API_KEY" \
  -d '{
    "name": "Rahul Sharma",
    "phone": "9805378073",
    "website": "mahasutravels.com",
    "page_url": "https://mahasutravels.com/",
    "form_type": "request_callback"
  }'
```

### Taxi Price Calculator (Google Ads UTM)

```bash
curl -X POST "http://localhost:3000/api/webhooks/leads" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_LEADS_INGEST_API_KEY" \
  -d '{
    "your_name": "Priya",
    "phone_no": "9816013468",
    "email_id": "priya@example.com",
    "tour_packages": "5N/6D Shimla Manali Taxi Tour",
    "pickup_location": "Delhi",
    "select_cab": "Toyota Innova (7+1)",
    "no_of_persons": 4,
    "pickup_date": "2026-09-10",
    "drop_date": "2026-09-15",
    "page_url": "https://himachaltaxitrip.com/?utm_source=google&utm_medium=cpc&utm_campaign=google_ads",
    "form_type": "taxi_calculator"
  }'
```

### Enquire Now

```bash
curl -X POST "http://localhost:3000/api/webhooks/leads" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_LEADS_INGEST_API_KEY" \
  -d '{
    "name": "Amit",
    "phone": "8894424550",
    "email": "amit@example.com",
    "destination": "Complete Himachal",
    "travel_date": "2026-10-01",
    "pickup": "Chandigarh",
    "drop": "Shimla",
    "adults": 2,
    "kids": 1,
    "website": "mahasutravels.com",
    "page_url": "https://mahasutravels.com/complete-himachal-tours/",
    "form_type": "enquire_now"
  }'
```

### Contact (email only, no phone)

```bash
curl -X POST "http://localhost:3000/api/webhooks/leads" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_LEADS_INGEST_API_KEY" \
  -d '{
    "full_name": "Guest",
    "email_address": "guest@example.com",
    "subject": "Tour question",
    "message": "Need a quote for Spiti.",
    "page_url": "https://himachaltaxitrip.com/contact.php",
    "form_type": "contact"
  }'
```

### Cab booking modal

```bash
curl -X POST "http://localhost:3000/api/webhooks/leads" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_LEADS_INGEST_API_KEY" \
  -d '{
    "name": "Sanjay",
    "phone": "9816013724",
    "email": "sanjay@example.com",
    "location": "Chandigarh",
    "cab_type": "Toyota Etios (4+1)",
    "pickup_date": "2026-09-20",
    "drop_date": "2026-09-22",
    "website": "himachaltourismcab.com",
    "page_url": "https://www.himachaltourismcab.com/our-cabs.php",
    "form_type": "cab_booking"
  }'
```

### Taxi booking form (with direction)

```bash
curl -X POST "http://localhost:3000/api/webhooks/leads" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_LEADS_INGEST_API_KEY" \
  -d '{
    "full_name": "Neha",
    "phone_number": "9816013724",
    "email": "neha@example.com",
    "car": "Innova CRYSTA (7+1)",
    "kids": 1,
    "notes": "Prefer early morning pickup",
    "pick_up_date": "2026-11-01",
    "drop_date": "2026-11-05",
    "pick_up_location": "Pathankot",
    "drop_off_location": "Dalhousie",
    "no_of_passengers": 6,
    "direction": "Round trip",
    "website": "himachaltouristcabs.com",
    "page_url": "https://himachaltouristcabs.com/taxi-booking.php",
    "form_type": "taxi_booking"
  }'
```

## Meta Ads UTM example

```bash
curl -X POST "http://localhost:3000/api/webhooks/leads" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_LEADS_INGEST_API_KEY" \
  -d '{
    "name": "Meta Lead",
    "phone": "9805378073",
    "page_url": "https://himachaltaxitrip.com/?utm_source=meta&utm_medium=paid_social&utm_campaign=meta_ads&utm_content=facebook_instagram",
    "form_type": "quick_inquiry"
  }'
```

That lead’s marketing source becomes **Meta Ads**; without `utm_source` it becomes **Website** (organic).
