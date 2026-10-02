# 🚦 API Rate Limiting Gateway

A backend-focused API Gateway built with **Node.js, Express, Redis, MongoDB, Docker, and Lua**.

This project is being built step-by-step to understand how a real-world API Gateway handles:

* API authentication
* Request validation
* Authorization
* Rate limiting
* Reverse proxying
* Service routing
* Client management
* API key management
* Redis-based distributed rate limiting
* Client activation/revocation

---

# 📌 Table of Contents

* [Project Overview](#-project-overview)
* [Problem This Project Solves](#-problem-this-project-solves)
* [How the Gateway Works](#-how-the-gateway-works)
* [Tech Stack](#-tech-stack)
* [Architecture Evolution](#-architecture-evolution)
* [Phase 0 — Foundation & Core Concepts](#-phase-0--foundation--core-concepts)
* [Phase 1 — Project Architecture & Foundation](#-phase-1--project-architecture--foundation)
* [Phase 2 — Basic API Gateway](#-phase-2--basic-api-gateway)
* [Phase 3 — Rate Limiting Algorithms](#-phase-3--rate-limiting-algorithms)
* [Phase 4 — Redis-Based Rate Limiter](#-phase-4--redis-based-rate-limiter)
* [Phase 5 — API Keys & Client Management](#-phase-5--api-keys--client-management)
* [Current Architecture](#-current-architecture)
* [Security](#-security)
* [Current Project Status](#-current-project-status)

---

# 🚀 Project Overview

An API Gateway acts as a single entry point between clients and backend services.

Instead of allowing clients to directly communicate with every backend service:

```text
Client
  │
  ├──────────────→ Product Service
  │
  ├──────────────→ User Service
  │
  └──────────────→ Order Service
```

the project introduces a centralized Gateway:

```text
                         ┌─────────────────┐
                         │     Client      │
                         └────────┬────────┘
                                  │
                                  ▼
                     ┌──────────────────────┐
                     │     API Gateway      │
                     │                      │
                     │ Authentication       │
                     │ Validation           │
                     │ Rate Limiting        │
                     │ Authorization        │
                     │ Routing              │
                     │ Logging              │
                     └──────────┬───────────┘
                                │
               ┌────────────────┼────────────────┐
               │                │                │
               ▼                ▼                ▼
        Product Service   User Service    Order Service
```

The gateway controls access to backend services and provides a centralized place for common API concerns.

---

# 🎯 Problem This Project Solves

When multiple backend services exist, exposing every service directly to clients creates several problems.

### Without an API Gateway

```text
                    Client
                  /   │    \
                 /    │     \
                ▼     ▼      ▼
          Product   User    Order
          Service  Service  Service
```

Problems:

* Every service needs to handle authentication.
* Every service may need rate limiting.
* Clients need to know multiple service URLs.
* Security policies become harder to manage.
* Rate-limit state becomes difficult to share across multiple servers.
* There is no centralized request logging.
* Client/API-key management becomes scattered.

---

# 💡 What Our Gateway Solves

The Gateway becomes the centralized control point:

```text
Client
  │
  ▼
┌─────────────────────────────┐
│         API Gateway         │
│                             │
│  1. Authentication          │
│  2. Validation              │
│  3. Authorization           │
│  4. Rate Limiting           │
│  5. Routing                 │
│  6. Logging                 │
└──────────────┬──────────────┘
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
   Product    User     Order
   Service   Service   Service
```

---

# 🔄 How a Request Travels

For a normal protected API request:

```text
Client
  │
  │ X-API-Key
  ▼
API Gateway
  │
  ▼
Authentication
  │
  ├── Invalid → 401
  │
  ▼
Client Identification
  │
  ▼
Rate Limiter
  │
  ├── Limit exceeded → 429
  │
  ▼
Service Router / Reverse Proxy
  │
  ├──────────────┐
  ▼              ▼
Product        User/Order
Service        Service
  │
  ▼
Response
  │
  ▼
Client
```

---

# 🛠 Tech Stack

| Technology            | Purpose                            |
| --------------------- | ---------------------------------- |
| Node.js               | Backend runtime                    |
| Express.js            | HTTP server & middleware           |
| MongoDB               | Persistent client/API-key metadata |
| Mongoose              | MongoDB ODM                        |
| Redis                 | Distributed rate-limit state       |
| ioredis               | Node.js Redis client               |
| Lua                   | Atomic Redis rate-limit operation  |
| Docker                | Redis container                    |
| Docker Compose        | Redis service management           |
| http-proxy-middleware | Reverse proxy                      |
| dotenv                | Environment configuration          |
| Postman               | API testing                        |

---

# 🧭 Architecture Evolution

The project was built gradually instead of implementing everything at once.

```text
Phase 0
Concepts & Requirements
        │
        ▼
Phase 1
Gateway Foundation
        │
        ▼
Phase 2
Authentication + Routing + Middleware
        │
        ▼
Phase 3
Rate Limiting Algorithms
        │
        ▼
Phase 4
Redis + Atomic Distributed Rate Limiter
        │
        ▼
Phase 5
API Keys + MongoDB + Client Management
        │
        ▼
Current Gateway
```

---

# 🟢 Phase 0 — Foundation & Core Concepts

## Goal

Before writing the gateway, understand the core concepts required to build it.

---

## 0.1 API Gateway

An API Gateway is a centralized entry point for clients.

```text
Client
  │
  ▼
API Gateway
  │
  ├── Authentication
  ├── Rate Limiting
  ├── Routing
  └── Logging
       │
       ▼
   Backend Services
```

The gateway handles common infrastructure concerns while backend services focus on business logic.

---

## 0.2 Reverse Proxy

The project uses a **reverse proxy**.

```text
Client
  │
  ▼
Reverse Proxy / Gateway
  │
  ▼
Backend Service
```

The client does not need to directly communicate with the backend service.

The Gateway receives the request and forwards it to the appropriate service.

---

## 0.3 Redis

Redis is an in-memory data store.

Important commands studied:

```text
GET
SET
INCR
EXPIRE
TTL
HGET
HSET
```

Redis was identified as useful for rate limiting because request counters/bucket state need fast access.

---

## 0.4 Rate Limiting

Rate limiting controls how frequently a client can access an API.

```text
Client
  │
  │ Requests
  ▼
Rate Limiter
  │
  ├── Allowed ───────→ Backend
  │
  └── Limit exceeded
             │
             ▼
           429
```

---

## 0.5 Concurrency & Race Conditions

We studied why this can be unsafe:

```text
GET state
   ↓
Modify in Node.js
   ↓
SET state
```

Two requests can read the same state simultaneously.

```text
             Redis
               │
        tokens = 1
          /          \
         /            \
   Gateway 1        Gateway 2
   reads 1          reads 1
      │                │
   allows           allows
      │                │
      └──────┬─────────┘
             ▼
        Both requests
        were allowed
```

This became important later when implementing the Redis-based atomic rate limiter.

---

## Phase 0 Result

```text
API Gateway
Reverse Proxy
Redis
Rate Limiting
Concurrency
Race Conditions
System Requirements
        │
        ▼
Core architecture understood
```

---

# 🔵 Phase 1 — Project Architecture & Foundation

## Goal

Build the initial gateway infrastructure.

---

## Architecture

```text
                         Client
                           │
                           ▼
                  ┌─────────────────┐
                  │   API Gateway   │
                  │    :5000        │
                  └────────┬────────┘
                           │
                    Reverse Proxy
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
       Product :6000   User :7000   Order :8000

                           │
                           ▼
                    Redis :6379
```

---

## Implemented

### Express Gateway

Gateway server created on:

```text
localhost:5000
```

### Backend Services

Three independent services were created:

```text
Product Service → :6000
User Service    → :7000
Order Service   → :8000
```

---

## Redis with Docker

Redis runs inside Docker.

```text
┌─────────────────────────┐
│       Docker            │
│                         │
│  ┌───────────────────┐  │
│  │   Redis 7 Alpine  │  │
│  │      :6379        │  │
│  └───────────────────┘  │
└────────────┬────────────┘
             │
             ▼
        Node Gateway
```

Docker Compose manages the Redis container.

---

## Reverse Proxy

`http-proxy-middleware` was introduced.

```text
GET /api/products
       │
       ▼
API Gateway :5000
       │
       ▼
Product Service :6000
```

Similarly:

```text
/api/users  → User Service :7000
/api/orders → Order Service :8000
```

---

## Gateway Error Handling

Backend unavailable:

```text
Client
  │
  ▼
Gateway
  │
  ▼
Backend ❌
  │
  ▼
502 Bad Gateway
```

---

## Request Logging

Gateway logs:

```text
GET /api/products → 200 → 14ms
```

This provides basic request observability.

---

## Phase 1 Result

```text
Client
  │
  ▼
Gateway :5000
  │
  ├──────→ Product :6000
  ├──────→ User    :7000
  └──────→ Order   :8000

Redis :6379
```

The basic Gateway infrastructure was working.

---

# 🟡 Phase 2 — Basic API Gateway

## Goal

Turn the basic reverse proxy into an actual API Gateway.

---

# 2.1 Middleware Pipeline

The request pipeline became:

```text
Request
   │
   ▼
Logger
   │
   ▼
Validation
   │
   ▼
Authentication
   │
   ▼
Rate Limiter
   │
   ▼
Routing / Proxy
   │
   ▼
Backend Service
```

Each middleware has a separate responsibility.

---

# 2.2 API Key Authentication

Clients send:

```text
X-API-Key: my-secret-key
```

Flow:

```text
Client
  │
  │ X-API-Key
  ▼
Authentication Middleware
  │
  ├── Missing → 401
  │
  ├── Invalid → 401
  │
  └── Valid
       │
       ▼
    Continue
```

---

# 2.3 Request Validation

Basic query validation was implemented.

For example:

```text
?page=abc
```

results in:

```text
400 Bad Request
```

while valid values continue through the pipeline.

---

# 2.4 Authorization

A separate admin API key was introduced.

```text
Normal API Key
      │
      ▼
Admin Endpoint
      │
      ▼
403 Forbidden
```

Admin key:

```text
ADMIN_API_KEY
```

can access admin functionality.

---

# 2.5 Service Registry

Service URLs were centralized:

```text
services
 ├── products → http://localhost:6000
 ├── users    → http://localhost:7000
 └── orders   → http://localhost:8000
```

This avoids scattering service URLs throughout the application.

---

# 2.6 Standardized Responses

Success and error response helpers were introduced.

Example error:

```json
{
  "success": false,
  "message": "Invalid API key",
  "statusCode": 401
}
```

---

# 2.7 Gateway Integration

The complete Phase 2 request flow:

```text
                     Client
                       │
                       ▼
                ┌─────────────┐
                │   Logger    │
                └──────┬──────┘
                       ▼
                ┌─────────────┐
                │ Validation  │
                └──────┬──────┘
                       ▼
                ┌─────────────┐
                │    Auth     │
                └──────┬──────┘
                       ▼
                ┌─────────────┐
                │ Authorization│
                └──────┬──────┘
                       ▼
                ┌─────────────┐
                │   Router    │
                └──────┬──────┘
                       ▼
                  Backend
```

---

## Phase 2 Result

Implemented and tested:

* Authentication
* Validation
* Authorization
* Routing
* Reverse proxy
* Standardized responses
* Logging
* Error handling

---

# 🟠 Phase 3 — Rate Limiting Algorithms

## Goal

Understand and implement different rate-limiting algorithms before choosing the final implementation.

---

# 3.1 Fixed Window

Basic idea:

```text
60-second window
┌─────────────────────────────┐
│ Request  Request  Request   │
│   1        2        3       │
└─────────────────────────────┘

Maximum = 5 requests
```

Initial implementation used JavaScript `Map`.

```text
API Key
   │
   ▼
JavaScript Map
   │
   ├── count
   └── windowStart
```

---

# 3.2 Sliding Window

Instead of resetting a complete counter, request timestamps are tracked.

```text
Current Time
     │
     ▼
──────────────────────────────
│    │     │       │       │
R1   R2    R3      R4      R5
──────────────────────────────
       ← 60 seconds →
```

Old timestamps outside the window are removed.

---

# 3.3 Token Bucket

The project eventually selected Token Bucket for the main rate-limiting implementation.

```text
             Refill
               ▲
               │
        ┌──────────────┐
        │  Token Bucket│
        │              │
        │ ● ● ● ● ●    │
        │   Capacity   │
        └──────┬───────┘
               │
            Request
               │
               ▼
          Consume 1 token
```

Each client has:

```text
tokens
lastRefillTime
```

---

## Token Bucket Logic

```text
Request
  │
  ▼
Calculate elapsed time
  │
  ▼
Refill tokens
  │
  ▼
Is token available?
  │
  ├── YES → Consume token → Allow
  │
  └── NO  → 429 Too Many Requests
```

---

# 3.4 Algorithm Comparison

The following concepts were studied:

```text
Fixed Window
      │
      ├── Simple
      └── Boundary limitations

Sliding Window Log
      │
      ├── Accurate
      └── More memory

Sliding Window Counter
      │
      ├── Efficient
      └── Approximate

Token Bucket
      │
      ├── Controlled bursts
      └── Sustainable request rate

Leaky Bucket
      │
      └── Smooth traffic flow
```

For this Gateway, **Token Bucket** was selected because it provides controlled bursts and refill-based rate control.

---

# 🔴 Phase 4 — Redis-Based Rate Limiter

## Goal

Move rate-limit state from local JavaScript memory to Redis so it can be shared between multiple Gateway instances.

---

# Why JavaScript `Map` Was Not Enough

With an in-memory `Map`:

```text
             Load Balancer
                /      \
               ▼        ▼
         Gateway 1   Gateway 2
           Map A       Map B
```

Each Gateway has independent state.

The same client could therefore receive separate buckets.

---

# Redis Solution

```text
             Load Balancer
              /    |    \
             ▼     ▼     ▼
        Gateway1 Gateway2 Gateway3
             \      |      /
              \     |     /
               ▼    ▼    ▼
                  Redis
```

Now all Gateway instances share the same rate-limit state.

---

# Redis Bucket

For each client:

```text
rate_limit:<client-id>

┌────────────────────────────┐
│ tokens                     │
│ lastRefillTime             │
└────────────────────────────┘
```

Redis Hashes are used to store the bucket state.

---

# Redis Token Bucket Flow

```text
Request
   │
   ▼
Client identified
   │
   ▼
Redis bucket
   │
   ▼
Calculate refill
   │
   ▼
Check token
   │
   ├── Available
   │      │
   │      ▼
   │   Consume token
   │      │
   │      ▼
   │    Allow
   │
   └── Not available
          │
          ▼
         429
```

---

# Atomic Lua Script

A simple:

```text
READ
 ↓
Calculate
 ↓
WRITE
```

operation can suffer from race conditions.

Therefore the bucket operation was moved into a Redis Lua script.

```text
Node.js
   │
   │ EVAL
   ▼
Redis
   │
   ▼
┌───────────────────────────┐
│ Lua Script                │
│                           │
│ Read bucket               │
│ Calculate refill          │
│ Check token               │
│ Consume token             │
│ Save bucket               │
│ Set TTL                   │
└───────────────────────────┘
```

The operation happens atomically inside Redis.

---

# TTL Cleanup

Inactive client buckets receive a TTL.

```text
rate_limit:<client-id>
        │
        ▼
      EXPIRE
        │
        ▼
Inactive bucket
        │
        ▼
Automatically removed
```

Current TTL configuration:

```text
RATE_LIMIT_TTL=300
```

which is 5 minutes.

---

# Phase 4 Result

Implemented:

* Redis token bucket
* Redis Hash state
* Atomic Lua rate limiter
* TTL cleanup
* Distributed/shared rate-limit state
* Rapid request testing
* Docker-based Redis

---

# 🟣 Phase 5 — API Keys & Client Management

## Goal

Move from one shared API key to a real client-management model.

Before Phase 5:

```text
All clients
     │
     ▼
One API Key
     │
     ▼
Same rate-limit configuration
```

After Phase 5:

```text
Client A ── API Key A ──┐
                        │
Client B ── API Key B ──┼──→ Gateway
                        │
Client C ── API Key C ──┘
```

Each API key identifies a specific client.

---

# 5.1 Client Data Model

MongoDB stores client information:

```text
Client
├── name
├── apiKeyHash
├── plan
├── rateLimit
│   ├── capacity
│   └── refillRate
├── status
├── createdAt
└── updatedAt
```

---

# 5.2 API Key Generation

API keys are generated using Node.js `crypto`.

Format:

```text
rk_live_<random-value>
```

Example:

```text
rk_live_************************
```

The raw key is returned when the client is created.

---

# 5.3 API Key Hashing

The raw API key is **not stored in MongoDB**.

Instead:

```text
Raw API Key
     │
     ▼
   SHA-256
     │
     ▼
apiKeyHash
     │
     ▼
MongoDB
```

Authentication performs the same operation:

```text
Incoming API Key
       │
       ▼
     SHA-256
       │
       ▼
 Search MongoDB
       │
       ▼
 apiKeyHash match?
       │
    ┌──┴──┐
   YES    NO
    │      │
    ▼      ▼
 Allow    401
```

---

# 5.4 MongoDB vs Redis

The project now has two different types of state.

### MongoDB

Stores relatively persistent client information:

```text
MongoDB
   │
   ├── Client identity
   ├── API key hash
   ├── Plan
   ├── Rate-limit configuration
   └── Status
```

### Redis

Stores temporary high-frequency rate-limit state:

```text
Redis
   │
   ├── Current tokens
   ├── Last refill time
   └── TTL
```

The separation is:

```text
MongoDB = "Who is this client and what is their configuration?"

Redis   = "How many tokens does this client currently have?"
```

---

# 5.5 MongoDB Authentication

The request flow became:

```text
Client
  │
  │ X-API-Key
  ▼
Authentication Middleware
  │
  ▼
Hash API Key
  │
  ▼
MongoDB
  │
  ├── Client not found → 401
  │
  ├── Client revoked   → 401
  │
  └── Client active
          │
          ▼
      req.client
```

The authenticated client is attached to:

```js
req.client
```

---

# 5.6 Client-Specific Rate Limiting

The rate limiter no longer relies on a single global API-key configuration.

It reads the authenticated client:

```text
req.client
   │
   ├── _id
   ├── name
   ├── plan
   └── rateLimit
        ├── capacity
        └── refillRate
```

Then Redis uses the client ID:

```text
rate_limit:<client-id>
```

instead of using the raw API key.

---

# Client-Specific Rate Limit Flow

```text
X-API-Key
    │
    ▼
MongoDB Authentication
    │
    ▼
req.client
    │
    ▼
Client Rate Limit
    │
    ├── capacity
    └── refillRate
    │
    ▼
Redis Token Bucket
    │
    ├── Allow → Backend
    │
    └── Reject → 429
```

---

# 5.7 Client Activation & Revocation

Clients can be:

```text
active
revoked
```

Admin can change the status.

```text
             Admin
               │
               ▼
PATCH /admin/clients/:id/status
               │
        ┌──────┴──────┐
        ▼             ▼
     active        revoked
        │             │
        ▼             ▼
   API works       API blocked
                   with 401
```

Revoking a client does not delete its MongoDB record.

---

# 5.8 Client Management API

The Gateway currently provides:

### Create Client

```text
POST /api/clients
```

```text
Client
  │
  ▼
Generate API Key
  │
  ▼
Hash API Key
  │
  ▼
MongoDB
  │
  ▼
Return raw API key once
```

---

### List Clients

```text
GET /api/admin/clients
```

```text
Admin
  │
  ▼
Authorization
  │
  ▼
MongoDB
  │
  ▼
Client list
```

API key hashes are not exposed in the response.

---

### Activate / Revoke Client

```text
PATCH /api/admin/clients/:clientId/status
```

```text
Admin
  │
  ▼
Authorization
  │
  ▼
MongoDB
  │
  ▼
Update status
```

---

# 🏗️ Current Phase 5 Architecture

This is the current architecture after completing Phase 5:

```text
                                ┌──────────────────┐
                                │      Client      │
                                └────────┬─────────┘
                                         │
                                         │ X-API-Key
                                         ▼
                         ┌────────────────────────────┐
                         │        API Gateway         │
                         │          :5000             │
                         ├────────────────────────────┤
                         │                            │
                         │  Logger                    │
                         │     ↓                      │
                         │  Validation                │
                         │     ↓                      │
                         │  Authentication            │
                         │     ↓                      │
                         │  Rate Limiter              │
                         │     ↓                      │
                         │  Reverse Proxy / Routing   │
                         │                            │
                         └───────┬───────────┬────────┘
                                 │           │
                     ┌───────────┘           └───────────┐
                     │                                   │
                     ▼                                   ▼
             ┌────────────────┐                 ┌────────────────┐
             │    MongoDB     │                 │     Redis      │
             │                │                 │                │
             │ Client         │                 │ Token Bucket   │
             │ API Key Hash   │                 │ Tokens         │
             │ Plan           │                 │ Last Refill    │
             │ Rate Limit     │                 │ TTL            │
             │ Status         │                 │                │
             └────────────────┘                 └────────────────┘
                     │
                     │
                     ▼
             Client Configuration


                         API Gateway
                              │
               ┌──────────────┼──────────────┐
               │              │              │
               ▼              ▼              ▼
        ┌────────────┐ ┌────────────┐ ┌────────────┐
        │  Product   │ │    User    │ │   Order    │
        │  Service   │ │  Service   │ │  Service   │
        │   :6000    │ │   :7000    │ │   :8000    │
        └────────────┘ └────────────┘ └────────────┘
```

---

# 🔐 Current Request Pipeline

For a protected API request:

```text
                    Incoming Request
                           │
                           ▼
                    ┌─────────────┐
                    │    Logger   │
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
                    │ Validation  │
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
                    │    Auth     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   MongoDB   │
                    │ Find Client │
                    └──────┬──────┘
                           │
                           ▼
                      req.client
                           │
                           ▼
                    ┌─────────────┐
                    │Rate Limiter │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │ Token Bucket│
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │             │
                 Allowed        Rejected
                    │             │
                    ▼             ▼
                 Router          429
                    │
                    ▼
              Backend Service
                    │
                    ▼
                 Response
                    │
                    ▼
                  Client
```

---

# 🔑 Admin Request Flow

Admin operations use a separate admin API key.

```text
Admin
  │
  │ X-API-Key: ADMIN_API_KEY
  ▼
API Gateway
  │
  ▼
Authorization Middleware
  │
  ├── Invalid → 403
  │
  └── Valid
       │
       ▼
   Client Management
       │
       ├── Create Client
       ├── List Clients
       └── Activate / Revoke
```

---

# 📂 Current Project Structure

```text
api-rate-limiting-gateway/
│
├── backend/
│   ├── server.js
│   ├── user-server.js
│   └── order-server.js
│
├── src/
│   ├── config/
│   │   ├── redis.js
│   │   ├── services.js
│   │   └── database.js
│   │
│   ├── gateway/
│   │   └── proxy.js
│   │
│   ├── middleware/
│   │   ├── logger.js
│   │   ├── validation.js
│   │   ├── auth.js
│   │   ├── authorization.js
│   │   ├── rateLimeter.js
│   │   └── errorhandler.js
│   │
│   ├── model/
│   │   └── client.model.js
│   │
│   ├── routes/
│   │   ├── gatewayRoutes.js
│   │   └── clientRoutes.js
│   │
│   ├── utils/
│   │   ├── response.js
│   │   └── apiKey.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env
├── .gitignore
├── compose.yaml
├── package.json
└── README.md
```

---

# 🔒 Security Implemented So Far

### API Keys

Raw API keys are not stored in MongoDB.

```text
Raw Key
   │
   ▼
SHA-256
   │
   ▼
MongoDB
```

### Revoked Keys

A revoked client cannot access protected Gateway routes.

```text
Revoked Client
      │
      ▼
Authentication
      │
      ▼
401 API key is revoked
```

### Admin Authorization

Administrative operations require the admin API key.

```text
Normal Key → 403
Admin Key  → Allowed
```

### Redis Atomicity

Rate-limit state updates happen inside a Lua script in Redis to avoid the simple read-modify-write race condition.

---

# 📊 Current Project Status

```text
Phase 0 — Foundation & Concepts
████████████████████ 100% ✅

Phase 1 — Gateway Foundation
████████████████████ 100% ✅

Phase 2 — Basic API Gateway
████████████████████ 100% ✅

Phase 3 — Rate Limiting Algorithms
████████████████████ 100% ✅

Phase 4 — Redis Rate Limiter
████████████████████ 100% ✅

Phase 5 — API Keys & Client Management
████████████████████ 100% ✅
```

---

# 🎯 What Has Been Built

The project has evolved from a simple Express server into a multi-service API Gateway:

```text
                    ┌──────────────────┐
                    │      Client      │
                    └────────┬─────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │     API Gateway      │
                  │                      │
                  │ Authentication       │
                  │ Validation           │
                  │ Authorization        │
                  │ Rate Limiting        │
                  │ Reverse Proxy        │
                  │ Routing              │
                  │ Logging              │
                  └───────┬───────┬──────┘
                          │       │
                  ┌───────┘       └───────┐
                  ▼                       ▼
             ┌──────────┐            ┌─────────┐
             │ MongoDB  │            │  Redis  │
             │          │            │         │
             │ Clients  │            │ Buckets │
             │ API Hash │            │ Tokens  │
             │ Status   │            │ TTL     │
             └──────────┘            └─────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Backend Services│
                 ├─────────────────┤
                 │ Product :6000   │
                 │ User    :7000   │
                 │ Order   :8000   │
                 └─────────────────┘
```

---

# 🧠 Key Concepts Learned

Through Phase 0 → Phase 5, the project covered:

* API Gateway architecture
* Reverse proxy
* Middleware pipeline
* HTTP status codes
* API authentication
* Authorization
* Request validation
* Service routing
* Service registry
* Rate limiting
* Fixed Window
* Sliding Window
* Token Bucket
* Redis
* Redis Hashes
* Redis TTL
* Atomic Redis operations
* Lua scripting
* Race conditions
* Distributed state
* MongoDB
* Mongoose
* API key generation
* SHA-256 hashing
* Client management
* API key revocation
* Docker
* Docker Compose
* Backend service separation

---

# 🚧 Intentionally Not Implemented Yet

The project is intentionally being built gradually.

Features such as:

* Plan-based automatic rate-limit configuration
* Advanced analytics
* Distributed tracing
* Complex RBAC
* Kubernetes
* Kafka
* Advanced Redis failure fallback
* Advanced observability

are **not part of the current implementation**.

They can be considered later when they become necessary.

---

# 🚀 Current Milestone

**Phase 0 → Phase 5 completed.**

The Gateway currently provides:

```text
Client
  │
  ▼
API Key Authentication
  │
  ▼
MongoDB Client Identification
  │
  ▼
Redis Token Bucket Rate Limiting
  │
  ▼
Reverse Proxy
  │
  ├── Product Service
  ├── User Service
  └── Order Service
```

The next phase will be introduced gradually, with each new component understood before implementation.
