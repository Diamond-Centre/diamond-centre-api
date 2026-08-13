import { Express } from "express";

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Diamond Centre API",
    version: "1.0.0",
    description:
      "API REST pour la plateforme Diamond Centre (DICE). " +
      "Reference: docs/api-contract.md",
    contact: {
      name: "Diamond Centre",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development",
    },
  ],
  tags: [
    { name: "Health", description: "Etat du service" },
    { name: "Auth", description: "Authentification" },
    { name: "Users", description: "Gestion des utilisateurs (admin)" },
    { name: "Events", description: "Gestion des evenements" },
    { name: "Tickets", description: "Reservation de tickets" },
    { name: "Payments", description: "Paiements Mobile Money" },
    { name: "Validation", description: "Validation QR code" },
    { name: "Certificates", description: "Certificats de formation Diamond Centre" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          service: { type: "string", example: "diamond-centre-api" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          role: { type: "string", enum: ["super_admin", "admin", "client"] },
          telephone: { type: "string", example: "+237670000000" },
          sexe: { type: "string", enum: ["homme", "femme"] },
          picture: { type: "string", format: "uri", example: "https://example.com/avatar.jpg" },
          auth_provider: {
            type: "string",
            enum: ["local", "google", "facebook"],
          },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Event: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          title: { type: "string", example: "Conference IA" },
          description: { type: "string" },
          price: { type: "number", example: 5000 },
          currency: { type: "string", example: "XAF" },
          start_date: { type: "string", format: "date", example: "2026-10-10" },
          end_date: { type: "string", format: "date", example: "2026-10-12" },
          location: { type: "string", example: "Yaounde" },
          category: {
            type: "string",
            enum: ["conference", "formation", "seminaire", "atelier"],
          },
          capacity: { type: "integer", example: 200 },
          available_tickets: { type: "integer", example: 150 },
          image_url: { type: "string", format: "uri" },
          status: {
            type: "string",
            enum: ["draft", "published", "cancelled", "completed"],
          },
          promotion: {
            oneOf: [
              { $ref: "#/components/schemas/Promotion" },
              { type: "null" },
            ],
          },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      Promotion: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          event_id: { type: "integer", example: 1 },
          nombre: { type: "integer", example: 50 },
          sexe: { type: "string", enum: ["homme", "femme", "tous"] },
          reduction: {
            type: "number",
            example: 20,
            description: "Pourcentage de reduction (1-100) — seul champ obligatoire a la creation",
          },
          pourcentage: {
            type: "number",
            example: 20,
            description: "Alias de reduction (compatibilite)",
          },
          prix_promo: {
            type: "number",
            example: 4000,
            description: "Prix calcule: price * (1 - reduction / 100)",
          },
          duree: { type: "integer", example: 7, description: "Duree en jours" },
          description: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      CreatePromotionRequest: {
        type: "object",
        required: ["reduction"],
        properties: {
          reduction: {
            type: "number",
            example: 20,
            description: "Seul champ obligatoire (1-100). Alias: pourcentage",
          },
          pourcentage: {
            type: "number",
            example: 20,
            description: "Alias de reduction",
          },
          nombre: { type: "integer", example: 50, description: "Optionnel (defaut: 999999)" },
          sexe: {
            type: "string",
            enum: ["homme", "femme", "tous"],
            description: "Optionnel (defaut: tous)",
          },
          duree: { type: "integer", example: 7, description: "Optionnel (defaut: 30 jours)" },
          description: { type: "string" },
        },
      },
      CreateEventRequest: {
        type: "object",
        required: [
          "title",
          "price",
          "start_date",
          "end_date",
          "location",
          "category",
          "capacity",
        ],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          currency: { type: "string", example: "XAF" },
          start_date: { type: "string", format: "date" },
          end_date: { type: "string", format: "date" },
          location: { type: "string" },
          category: { type: "string" },
          capacity: { type: "integer" },
          image_url: { type: "string", format: "uri" },
          status: {
            type: "string",
            enum: ["draft", "published", "cancelled", "completed"],
          },
          promotion: { $ref: "#/components/schemas/CreatePromotionRequest" },
        },
      },
      UpdateEventRequest: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string", nullable: true },
          price: { type: "number" },
          currency: { type: "string", example: "XAF" },
          start_date: { type: "string", format: "date" },
          end_date: { type: "string", format: "date" },
          location: { type: "string" },
          category: { type: "string" },
          capacity: { type: "integer" },
          image_url: { type: "string", format: "uri", nullable: true },
          status: {
            type: "string",
            enum: ["draft", "published", "cancelled", "completed"],
          },
          promotion: {
            oneOf: [
              { $ref: "#/components/schemas/CreatePromotionRequest" },
              { type: "null" },
            ],
            description: "Object to upsert, null to remove, omit to keep",
          },
        },
      },
      TicketReserveRequest: {
        type: "object",
        required: ["event_id", "quantity", "customer_name", "customer_email", "customer_phone"],
        properties: {
          event_id: { type: "integer", example: 1 },
          quantity: { type: "integer", example: 2 },
          customer_name: { type: "string", example: "Jean Dupont" },
          customer_email: { type: "string", format: "email" },
          customer_phone: { type: "string", example: "+237670000000" },
        },
      },
      Ticket: {
        type: "object",
        properties: {
          id: { type: "integer", example: 100 },
          event_id: { type: "integer", example: 1 },
          event_title: { type: "string" },
          quantity: { type: "integer", example: 2 },
          total_price: { type: "number", example: 10000 },
          currency: { type: "string", example: "XAF" },
          status: {
            type: "string",
            enum: ["confirme", "scanne", "expire", "rembourse"],
          },
          customer_name: { type: "string" },
          customer_email: { type: "string", format: "email" },
          qr_codes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string", description: "QR payload" },
                entry_code: {
                  type: "string",
                  example: "48291573",
                  description: "8-digit code shown under the QR for admin manual validation",
                },
                validated: { type: "boolean" },
              },
            },
          },
          expires_at: { type: "string", format: "date-time" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      PaymentInitiateRequest: {
        type: "object",
        required: ["ticket_id", "method", "phone"],
        properties: {
          ticket_id: { type: "integer", example: 100 },
          method: { type: "string", enum: ["mtn_momo", "orange_money"] },
          phone: { type: "string", example: "+237670000000" },
        },
      },
      Payment: {
        type: "object",
        properties: {
          id: { type: "integer", example: 500 },
          ticket_id: { type: "integer", example: 100 },
          amount: { type: "number", example: 10000 },
          currency: { type: "string", example: "XAF" },
          method: { type: "string", enum: ["mtn_momo", "orange_money"] },
          status: {
            type: "string",
            enum: ["pending", "successful", "failed", "refunded"],
          },
          reference: { type: "string", example: "MTN-REF-123456" },
          provider_fee: { type: "number", example: 50 },
          paid_at: { type: "string", format: "date-time" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      MtnCallbackRequest: {
        type: "object",
        properties: {
          reference: { type: "string" },
          status: { type: "string", example: "successful" },
          transaction_id: { type: "string" },
        },
      },
      ValidationScanRequest: {
        type: "object",
        required: ["qr_code"],
        properties: {
          qr_code: { type: "string", example: "dc_100_abc123" },
        },
      },
      ValidationEntryCodeRequest: {
        type: "object",
        required: ["entry_code"],
        properties: {
          entry_code: {
            type: "string",
            example: "48291573",
            description: "8-digit code printed under the QR",
          },
        },
      },
      ValidationScanResponse: {
        type: "object",
        properties: {
          valid: { type: "boolean" },
          ticket_id: { type: "integer" },
          event_title: { type: "string" },
          customer_name: { type: "string" },
          entry_code: { type: "string" },
          qr_code: { type: "string" },
          validated_at: { type: "string", format: "date-time" },
          error: { type: "string" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password", "name", "telephone", "sexe", "picture"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
          name: { type: "string" },
          role: {
            type: "string",
            enum: ["client"],
            description: "Optional; public register always creates client",
          },
          telephone: { type: "string", example: "+237670000000" },
          sexe: { type: "string", enum: ["homme", "femme"] },
          picture: { type: "string", format: "uri", example: "https://example.com/avatar.jpg" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          access_token: { type: "string" },
          refresh_token: { type: "string" },
          expires_in: { type: "integer", example: 86400 },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      SocialAuthRequest: {
        type: "object",
        properties: {
          id_token: {
            type: "string",
            description: "Google ID token (preferred for Google)",
          },
          access_token: {
            type: "string",
            description: "Google or Facebook access token",
          },
          telephone: { type: "string" },
          sexe: { type: "string", enum: ["homme", "femme"] },
        },
      },
      UpdateUserRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
          name: { type: "string" },
          telephone: { type: "string" },
          sexe: { type: "string", enum: ["homme", "femme"] },
          picture: { type: "string", format: "uri" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Verifier l'etat du service",
        responses: {
          "200": {
            description: "Service operationnel",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Inscription utilisateur",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Utilisateur cree",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "400": {
            description: "Donnees invalides",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Connexion utilisateur",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Connexion reussie",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          "401": {
            description: "Identifiants invalides",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/google": {
      post: {
        tags: ["Auth"],
        summary: "Connexion / inscription via Google",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SocialAuthRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Connexion reussie",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/facebook": {
      post: {
        tags: ["Auth"],
        summary: "Connexion / inscription via Facebook",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SocialAuthRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Connexion reussie",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
        },
      },
    },
    "/api/users/admins/{id}": {
      put: {
        tags: ["Users"],
        summary: "Modifier un admin",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateUserRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Admin mis a jour",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Supprimer un admin",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "Admin supprime",
          },
        },
      },
    },
    "/api/users/clients/{id}": {
      put: {
        tags: ["Users"],
        summary: "Modifier un client",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateUserRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Client mis a jour",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Supprimer un client",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "Client supprime",
          },
        },
      },
    },
    "/api/events": {
      get: {
        tags: ["Events"],
        summary: "Lister les evenements",
        responses: {
          "200": {
            description: "Liste des evenements",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Event" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Events"],
        summary: "Creer un evenement",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateEventRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Evenement cree",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Event" },
              },
            },
          },
        },
      },
    },
    "/api/events/{id}": {
      get: {
        tags: ["Events"],
        summary: "Detail d'un evenement",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Detail evenement",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Event" },
              },
            },
          },
          "404": {
            description: "Evenement introuvable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Events"],
        summary: "Mettre a jour un evenement",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateEventRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Evenement mis a jour",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Event" },
              },
            },
          },
          "404": {
            description: "Evenement introuvable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Events"],
        summary: "Supprimer un evenement",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Evenement supprime",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Event deleted" },
                  },
                },
              },
            },
          },
          "404": {
            description: "Evenement introuvable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/tickets/reserve": {
      post: {
        tags: ["Tickets"],
        summary: "Reserver des tickets",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TicketReserveRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Reservation creee",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Ticket" },
              },
            },
          },
        },
      },
    },
    "/api/tickets/{id}": {
      get: {
        tags: ["Tickets"],
        summary: "Detail d'un ticket",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Detail ticket",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Ticket" },
              },
            },
          },
        },
      },
    },
    "/api/payments/initiate": {
      post: {
        tags: ["Payments"],
        summary: "Initier un paiement",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PaymentInitiateRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Paiement initie",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Payment" },
              },
            },
          },
        },
      },
    },
    "/api/payments/callback/mtn": {
      post: {
        tags: ["Payments"],
        summary: "Callback MTN Mobile Money",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MtnCallbackRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Callback traite" },
        },
      },
    },
    "/api/payments/{id}/status": {
      get: {
        tags: ["Payments"],
        summary: "Statut d'un paiement",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Statut du paiement",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Payment" },
              },
            },
          },
        },
      },
    },
    "/api/validation/scan": {
      post: {
        tags: ["Validation"],
        summary: "Valider un ticket via QR code",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationScanRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Resultat de validation",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationScanResponse" },
              },
            },
          },
        },
      },
    },
    "/api/validation/entry-code": {
      post: {
        tags: ["Validation"],
        summary: "Valider un ticket via le code a 8 chiffres sous le QR",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationEntryCodeRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Resultat de validation",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationScanResponse" },
              },
            },
          },
        },
      },
    },
    "/api/certificates/eligible": {
      get: {
        tags: ["Certificates"],
        summary: "Lister les participants eligibles a un certificat",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "event_id",
            in: "query",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: { "200": { description: "Eligible + deja delivres" } },
      },
    },
    "/api/certificates/issue": {
      post: {
        tags: ["Certificates"],
        summary: "Delivrer des certificats (formation)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["event_id"],
                properties: {
                  event_id: { type: "integer" },
                  ticket_ids: {
                    type: "array",
                    items: { type: "integer" },
                    description: "Optionnel — tous les tickets confirmes si omis",
                  },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Certificats delivres" } },
      },
    },
    "/api/certificates/me": {
      get: {
        tags: ["Certificates"],
        summary: "Mes certificats",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Liste des certificats" } },
      },
    },
    "/api/certificates/{code}/html": {
      get: {
        tags: ["Certificates"],
        summary: "Template HTML certificat Diamond Centre",
        parameters: [
          {
            name: "code",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "HTML printable" } },
      },
    },
    "/api/certificates/{code}": {
      get: {
        tags: ["Certificates"],
        summary: "Verifier un certificat",
        parameters: [
          {
            name: "code",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Detail certificat" } },
      },
    },
  },
};

export function setupSwagger(app: Express): void {
  // Hide OpenAPI UI in production unless ENABLE_SWAGGER=true
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_SWAGGER !== "true") {
    return;
  }

  // Lazy-load so production Vercel functions do not import swagger-ui-express
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const swaggerUi = require("swagger-ui-express") as typeof import("swagger-ui-express");

  app.get("/api-docs.json", (_req, res) => {
    res.json(swaggerDocument);
  });

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: "Diamond Centre API Docs",
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );
}

export { swaggerDocument };
