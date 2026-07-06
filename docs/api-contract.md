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
    "date": "2026-10-10",
    "time": "14:00",
    "location": "Yaoundé",
    "category": "conference",
    "capacity": 200,
    "available_tickets": 150,
    "image_url": "https://example.com/event.jpg",
    "status": "published",
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
  "date": "2026-10-10",
  "time": "14:00",
  "location": "Yaoundé",
  "category": "conference",
  "capacity": 200,
  "available_tickets": 150,
  "image_url": "https://example.com/event.jpg",
  "status": "published",
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
  "date": "2026-10-10",
  "time": "14:00",
  "location": "Yaoundé",
  "category": "conference",
  "capacity": 200,
  "image_url": "https://example.com/event.jpg"
}
```

**Response (201):**
```json
{
  "id": 1,
  "title": "Conférence IA",
  "price": 5000,
  "date": "2026-10-10",
  "status": "draft",
  "created_at": "2026-01-01T00:00:00Z"
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
  "status": "pending",
  "qr_codes": [
    "dc_100_abc123",
    "dc_100_def456"
  ],
  "expires_at": "2026-10-10T14:00:00Z"
}
```

### GET /api/tickets/:id

**Response:**
```json
{
  "id": 100,
  "event_id": 1,
  "event_title": "Conférence IA",
  "quantity": 2,
  "total_price": 10000,
  "currency": "XAF",
  "status": "confirmed",
  "customer_name": "Jean Dupont",
  "customer_email": "jean@example.com",
  "qr_codes": [
    {
      "code": "dc_100_abc123",
      "validated": false
    },
    {
      "code": "dc_100_def456",
      "validated": false
    }
  ],
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

## Payments

### POST /api/payments/initiate

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

**Request (MTN callback):**
```json
{
  "reference": "MTN-REF-123456",
  "status": "successful",
  "transaction_id": "TXN-987654"
}
```

### GET /api/payments/:id/status

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

---

## Authentication

### POST /api/auth/register

**Request:**
```json
{
  "email": "admin@diamondcentre.com",
  "password": "securepassword",
  "name": "Admin",
  "role": "admin"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "admin@diamondcentre.com",
  "name": "Admin",
  "role": "admin",
  "created_at": "2026-01-01T00:00:00Z"
}
```

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
    "role": "admin"
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
| Value     | Description    |
| --------- | -------------- |
| pending   | En attente     |
| confirmed | Confirmé       |
| cancelled | Annulé         |
| refunded  | Remboursé      |

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
