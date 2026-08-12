# API Contract - Diamond Centre

> Ce document est la **référence unique** pour toutes les structures de données.
> Le Frontend et le Mobile ne doivent jamais inventer leurs propres structures.
> Toute modification doit être faite ici d'abord, puis implémentée dans le code.

---

## Events

### GET /api/events

**Response:**
```json
[
  {
    "id": 1,
    "title": "Conférence IA",
    "description": "Une conférence sur l'intelligence artificielle",
    "price": 5000,
    "currency": "XAF",
    "start_date": "2026-10-10",
    "end_date": "2026-10-12",
    "location": "Yaoundé",
    "category": "conference",
    "capacity": 200,
    "available_tickets": 150,
    "image_url": "https://example.com/event.jpg",
    "status": "published",
    "promotion": {
      "id": 1,
      "event_id": 1,
      "nombre": 50,
      "sexe": "tous",
      "reduction": 20,
      "pourcentage": 20,
      "prix_promo": 4000,
      "duree": 7,
      "description": "Promo early bird",
      "created_at": "2026-01-01T00:00:00Z"
    },
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]
```

### GET /api/events/:id

**Response:**
```json
{
  "id": 1,
  "title": "Conférence IA",
  "description": "Une conférence sur l'intelligence artificielle",
  "price": 5000,
  "currency": "XAF",
  "start_date": "2026-10-10",
  "end_date": "2026-10-12",
  "location": "Yaoundé",
  "category": "conference",
  "capacity": 200,
  "available_tickets": 150,
  "image_url": "https://example.com/event.jpg",
  "status": "published",
  "promotion": {
    "id": 1,
    "event_id": 1,
    "nombre": 50,
    "sexe": "tous",
    "reduction": 20,
    "pourcentage": 20,
    "prix_promo": 4000,
    "duree": 7,
    "description": "Promo early bird",
    "created_at": "2026-01-01T00:00:00Z"
  },
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

### POST /api/events

**Request:**
```json
{
  "title": "Conférence IA",
  "description": "Une conférence sur l'intelligence artificielle",
  "price": 5000,
  "currency": "XAF",
  "start_date": "2026-10-10",
  "end_date": "2026-10-12",
  "location": "Yaoundé",
  "category": "conference",
  "capacity": 200,
  "image_url": "https://example.com/event.jpg",
  "status": "published",
  "promotion": {
    "reduction": 20
  }
}
```

**Response (201):**
```json
{
  "id": 1,
  "title": "Conférence IA",
  "price": 5000,
  "start_date": "2026-10-10",
  "end_date": "2026-10-12",
  "status": "published",
  "created_at": "2026-01-01T00:00:00Z",
  "promotion": {
    "id": 1,
    "event_id": 1,
    "nombre": 999999,
    "sexe": "tous",
    "reduction": 20,
    "pourcentage": 20,
    "prix_promo": 4000,
    "duree": 30,
    "description": null,
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

> For `promotion`, only **`reduction`** (1–100) is required. Optional: `nombre` (default 999999), `sexe` (default `tous`), `duree` (default 30), `description`. `pourcentage` is accepted as an alias of `reduction`.

### PUT /api/events/:id

**Auth:** Bearer admin

**Request:** (all fields optional; `promotion: null` removes the promotion)
```json
{
  "title": "Conférence IA - Updated",
  "price": 6000,
  "start_date": "2026-10-10",
  "end_date": "2026-10-13",
  "status": "published",
  "promotion": {
    "reduction": 15
  }
}
```

**Response (200):** full event object (same shape as GET /api/events/:id)

### DELETE /api/events/:id

**Auth:** Bearer admin

**Response (200):**
```json
{
  "message": "Event deleted"
}
```

---

## Tickets

### POST /api/tickets/reserve

**Request:**
```json
{
  "event_id": 1,
  "quantity": 2,
  "customer_name": "Jean Dupont",
  "customer_email": "jean@example.com",
  "customer_phone": "+237670000000"
}
```

**Response (201):**
```json
{
  "id": 100,
  "event_id": 1,
  "event_title": "Conférence IA",
  "quantity": 2,
  "total_price": 10000,
  "currency": "XAF",
  "status": "confirme",
  "qr_codes": [
    {
      "code": "dc_100_abc123",
      "entry_code": "48291573",
      "validated": false
    },
    {
      "code": "dc_100_def456",
      "entry_code": "71930428",
      "validated": false
    }
  ],
  "expires_at": "2026-10-10T14:00:00Z"
}
```

### GET /api/tickets/:id

**Auth:** Bearer (admin/super_admin, or client whose email matches `customer_email`)

**Response:**
```json
{
  "id": 100,
  "event_id": 1,
  "event_title": "Conférence IA",
  "quantity": 2,
  "total_price": 10000,
  "currency": "XAF",
  "status": "confirme",
  "customer_name": "Jean Dupont",
  "customer_email": "jean@example.com",
  "qr_codes": [
    {
      "code": "dc_100_abc123",
      "entry_code": "48291573",
      "validated": false
    },
    {
      "code": "dc_100_def456",
      "entry_code": "71930428",
      "validated": false
    }
  ],
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

## Payments

### POST /api/payments/initiate

**Auth:** Bearer (ticket owner email or admin)

**Request:**
```json
{
  "ticket_id": 100,
  "method": "mtn_momo",
  "phone": "+237670000000"
}
```

**Response (201):**
```json
{
  "id": 500,
  "ticket_id": 100,
  "amount": 10000,
  "currency": "XAF",
  "method": "mtn_momo",
  "status": "pending",
  "reference": "MTN-REF-123456",
  "provider_fee": 50,
  "created_at": "2026-01-01T00:00:00Z"
}
```

### POST /api/payments/callback/mtn

**Auth:** header `X-Payment-Callback-Secret: <PAYMENT_CALLBACK_SECRET>`

**Request (MTN callback):**
```json
{
  "reference": "MTN-REF-123456",
  "status": "successful",
  "transaction_id": "TXN-987654"
}
```

### GET /api/payments/:id/status

**Auth:** Bearer (ticket owner email or admin)

**Response:**
```json
{
  "id": 500,
  "ticket_id": 100,
  "amount": 10000,
  "method": "mtn_momo",
  "status": "successful",
  "reference": "MTN-REF-123456",
  "paid_at": "2026-01-01T00:01:00Z"
}
```

---

## Validation

### POST /api/validation/scan

**Request:**
```json
{
  "qr_code": "dc_100_abc123"
}
```

**Response:**
```json
{
  "valid": true,
  "ticket_id": 100,
  "event_title": "Conférence IA",
  "customer_name": "Jean Dupont",
  "entry_code": "48291573",
  "qr_code": "dc_100_abc123",
  "validated_at": "2026-10-10T14:30:00Z"
}
```

**Response (invalid):**
```json
{
  "valid": false,
  "error": "Ticket already validated"
}
```

### POST /api/validation/entry-code

Admin manual validation using the 8-digit number printed under the QR.

**Request:**
```json
{
  "entry_code": "48291573"
}
```

**Response:** same shape as `/api/validation/scan`.

---

## Authentication

### POST /api/auth/register

Public registration **always creates a `client`**. Admin accounts cannot be self-registered.

**Request:**
```json
{
  "email": "client@example.com",
  "password": "securepassword",
  "name": "Jean Dupont",
  "telephone": "+237670000000",
  "sexe": "homme",
  "picture": "https://example.com/avatar.jpg"
}
```

**Response (201):**
```json
{
  "id": 2,
  "email": "client@example.com",
  "name": "Jean Dupont",
  "role": "client",
  "telephone": "+237670000000",
  "sexe": "homme",
  "picture": "https://example.com/avatar.jpg",
  "auth_provider": "local",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### Roles

| Role | Who creates it | Can do |
|------|----------------|--------|
| `super_admin` | Bootstrapped once (`admin@dice.cm` / `Admin@123` by default) | Full admin + create/update/delete other admins |
| `admin` | Only `super_admin` via `POST /api/users/admins` | Manage events, tickets, validation, clients |
| `client` | Public register / Google / Facebook | Book tickets, view own data |

### POST /api/users/admins

**Auth:** Bearer **super_admin** only

Creates a regular `admin` (never another `super_admin`).

### POST /api/auth/login

**Request:**
```json
{
  "email": "admin@diamondcentre.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400,
  "user": {
    "id": 1,
    "email": "admin@diamondcentre.com",
    "name": "Admin",
    "role": "admin",
    "telephone": "+237670000000",
    "sexe": "homme",
    "picture": "https://example.com/avatar.jpg",
    "auth_provider": "local",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

### POST /api/auth/google

Login or register a client with a Google token from the mobile/web SDK.

**Request:**
```json
{
  "id_token": "<google-id-token>",
  "telephone": "+237670000000",
  "sexe": "homme"
}
```

Or with an access token:
```json
{
  "access_token": "<google-access-token>"
}
```

**Response:** same shape as `/api/auth/login` (`auth_provider: "google"`).

### POST /api/auth/facebook

**Request:**
```json
{
  "access_token": "<facebook-access-token>",
  "telephone": "+237670000000",
  "sexe": "femme"
}
```

**Response:** same shape as `/api/auth/login` (`auth_provider: "facebook"`).

---

## Users (admin)

All routes require `Authorization: Bearer <admin_jwt>`.

### PUT /api/users/clients/:id

**Request (any subset):**
```json
{
  "name": "Marie Ngono",
  "email": "marie@example.com",
  "telephone": "+237670000002",
  "sexe": "femme",
  "picture": "https://example.com/marie.jpg",
  "password": "NewPass@123"
}
```

### PUT /api/users/admins/:id

Same body as update client.

### DELETE /api/users/clients/:id

**Response:** `{ "message": "Client deleted" }`

### DELETE /api/users/admins/:id

Cannot delete yourself or the last admin.

**Response:** `{ "message": "Admin deleted" }`

---

## Certificates (formations)

Certificates can only be issued for events with `category: "formation"` and tickets with `status: "confirme"` or `"scanne"`.

### GET /api/certificates/eligible?event_id=2
**Auth:** admin  
Lists confirmed attendees not yet certified.

### POST /api/certificates/issue
**Auth:** admin
```json
{
  "event_id": 2,
  "ticket_ids": [3, 4]
}
```
Omit `ticket_ids` to issue for all confirmed tickets of the formation.

### GET /api/certificates?event_id=2
**Auth:** admin — list issued certificates for a formation.

### GET /api/certificates/me
**Auth:** user — list my certificates.

### GET /api/certificates/me/:code
**Auth:** user — my certificate detail.

### GET /api/certificates/me/:code/html
**Auth:** user — Diamond Centre HTML certificate (print / WebView).

### GET /api/certificates/:code
Public verification payload.

### GET /api/certificates/:code/html
Public HTML certificate template render.

**Certificate JSON shape:**
```json
{
  "id": 1,
  "code": "DICE-2-3-...",
  "event_id": 2,
  "ticket_id": 3,
  "recipient_name": "Amina Fouda",
  "recipient_email": "amina.fouda@example.com",
  "formation_title": "Formation Full-Stack JavaScript",
  "start_date": "2026-09-20",
  "end_date": "2026-09-27",
  "location": "Douala - Silicon Mountain Hub",
  "issuer_name": "Admin",
  "issued_at": "2026-07-30T12:00:00.000Z",
  "organization": "Diamond Centre",
  "template": {
    "brand": "Diamond Centre",
    "title": "Certificat de Formation",
    "subtitle": "Attestation de participation et de réussite",
    "body": "Certifie que {{recipient_name}} a suivi avec succès la formation « {{formation_title}} »."
  }
}
```

---

## Enumerations

### Event Status
| Value       | Description        |
| ----------- | ------------------ |
| draft       | Brouillon         |
| published   | Publié            |
| cancelled   | Annulé            |
| completed   | Terminé           |

### Ticket Status
| Value     | Description                                      |
| --------- | ------------------------------------------------ |
| confirme  | Payé / valide, prêt à être scanné                |
| scanne    | Validé à l'entrée (QR ou code 8 chiffres)        |
| expire    | Expiré (date dépassée ou non utilisé)             |
| rembourse | Remboursé                                        |

### Payment Status
| Value      | Description    |
| ---------- | -------------- |
| pending    | En attente     |
| successful | Réussi         |
| failed     | Échoué         |
| refunded   | Remboursé      |

### Payment Methods
| Value     | Description    |
| --------- | -------------- |
| mtn_momo  | MTN Mobile Money |
| orange_money | Orange Money |

### Categories
| Value        | Description      |
| ------------ | ---------------- |
| conference   | Conférence       |
| formation    | Formation        |
| seminaire    | Séminaire        |
| atelier      | Atelier          |
| webinaire    | Webinaire        |
