import swaggerUi from "swagger-ui-express";
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
    { name: "Events", description: "Gestion des evenements" },
    { name: "Tickets", description: "Reservation de tickets" },
    { name: "Payments", description: "Paiements Mobile Money" },
    { name: "Validation", description: "Validation QR code" },
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
          role: { type: "string", enum: ["admin", "client"] },
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
            enum: ["conference", "formation", "seminaire", "atelier", "webinaire"],
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
          pourcentage: {
            type: "number",
            example: 20,
            description: "Pourcentage de reduction (1-100)",
          },
          prix_promo: {
            type: "number",
            example: 4000,
            description: "Prix calcule: price * (1 - pourcentage / 100)",
          },
          duree: { type: "integer", example: 7, description: "Duree en jours" },
          description: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      CreatePromotionRequest: {
        type: "object",
        required: ["nombre", "sexe", "pourcentage", "duree"],
        properties: {
          nombre: { type: "integer", example: 50 },
          sexe: { type: "string", enum: ["homme", "femme", "tous"] },
          pourcentage: { type: "number", example: 20 },
          duree: { type: "integer", example: 7 },
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
            enum: ["pending", "confirmed", "cancelled", "refunded"],
          },
          customer_name: { type: "string" },
          customer_email: { type: "string", format: "email" },
          qr_codes: {
            type: "array",
            items: {
              oneOf: [
                { type: "string" },
                {
                  type: "object",
                  properties: {
                    code: { type: "string" },
                    validated: { type: "boolean" },
                  },
                },
              ],
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
      ValidationScanResponse: {
        type: "object",
        properties: {
          valid: { type: "boolean" },
          ticket_id: { type: "integer" },
          event_title: { type: "string" },
          customer_name: { type: "string" },
          validated_at: { type: "string", format: "date-time" },
          error: { type: "string" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password", "name", "role"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
          name: { type: "string" },
          role: { type: "string", enum: ["admin", "client"] },
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
  },
};

export function setupSwagger(app: Express): void {
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
