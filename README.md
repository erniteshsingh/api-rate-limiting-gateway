# API Rate Limiting Gateway

A backend-focused API Gateway built with Node.js, Express, Redis, MongoDB, Docker, Lua, and `http-proxy-middleware`.

This project was built step by step to understand how an API Gateway handles authentication, rate limiting, service routing, API key management, and backend failures.

## Table of Contents

- [Project Overview](#project-overview)
- [Problem This Project Solves](#problem-this-project-solves)
- [How the Gateway Works](#how-the-gateway-works)
- [Tech Stack](#tech-stack)
- [Architecture Evolution](#architecture-evolution)
- [Phase 0 — Foundation and Core Concepts](#phase-0--foundation-and-core-concepts)
- [Phase 1 — Project Architecture and Foundation](#phase-1--project-architecture-and-foundation)
- [Phase 2 — Basic API Gateway](#phase-2--basic-api-gateway)
- [Phase 3 — Rate Limiting Algorithms](#phase-3--rate-limiting-algorithms)
- [Phase 4 — Redis-Based Rate Limiter](#phase-4--redis-based-rate-limiter)
- [Phase 5 — API Keys and Client Management](#phase-5--api-keys-and-client-management)
- [Phase 6 — Advanced Gateway Features](#phase-6--advanced-gateway-features)
- [Phase 7 — Security and Reliability Review](#phase-7--security-and-reliability-review)
- [Phase 8 — Manual Testing and Verification](#phase-8--manual-testing-and-verification)
- [Current Architecture](#current-architecture)
- [Current Request Pipeline](#current-request-pipeline)
- [Security](#security)
- [Current Project Structure](#current-project-structure)
- [Key Concepts Learned](#key-concepts-learned)
- [Intentionally Not Implemented](#intentionally-not-implemented)
- [Current Project Status](#current-project-status)

---

## Project Overview

An API Gateway acts as a single entry point between clients and backend services.

Instead of exposing every backend service directly to clients, requests pass through a centralized Gateway.

```text
Client
   |
   v
API Gateway :5000
   |
   +------> Product Service :6500
   |
   +------> User Service :7000
   |
   +------> Order Service :8000
```

The Gateway provides centralized request processing, including:

- API authentication
- Request validation
- Admin authorization
- Rate limiting
- Reverse proxying and service routing
- Client and API key management
- Request timeout and retry handling
- Service health monitoring
- Circuit breaker
- Gateway logging and error handling

## Problem This Project Solves

When multiple backend services exist, managing authentication, rate limiting, routing, and error handling separately in every service can become difficult.

An API Gateway provides a centralized place to manage these concerns.

### Without an API Gateway

```text
                Client
              /   |   \
             v    v    v
         Product  User  Order
         Service Service Service
```

Potential problems include:

- Clients need to communicate with multiple service URLs.
- Authentication policies can become duplicated.
- Rate-limit state can become inconsistent across Gateway instances.
- Client and API key management can become scattered.
- Backend failure handling and request logging can become harder to maintain.

### With an API Gateway

```text
                 Client
                   |
                   v
           +------------------+
           |   API Gateway    |
           |                  |
           | Authentication   |
           | Validation       |
           | Authorization    |
           | Rate Limiting    |
           | Routing           |
           | Timeout / Retry  |
           | Circuit Breaker  |
           | Logging           |
           +--------+---------+
                    |
          +---------+---------+
          |         |         |
          v         v         v
       Product     User      Order
       Service    Service   Service
```

---

## How the Gateway Works

For a normal protected API request:

```text
Client
  |
  | X-API-Key
  v
API Gateway
  |
  v
Logger and Request Validation
  |
  v
Client Authentication
  |
  +---- Invalid key ----> 401 Unauthorized
  |
  v
Client Identification
  |
  v
Redis Rate Limiter
  |
  +---- Limit exceeded -> 429 Too Many Requests
  |
  v
Circuit Breaker
  |
  +---- Circuit open ---> 503 Service Unavailable
  |
  v
Reverse Proxy
  |
  +------> Product Service
  +------> User Service
  +------> Order Service
```

The Gateway uses timeout, retry, and circuit-breaker mechanisms to handle eligible backend failures.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express.js | HTTP server and middleware |
| MongoDB | Persistent client metadata |
| Mongoose | MongoDB ODM |
| Redis | Rate-limit state |
| ioredis | Node.js Redis client |
| Lua | Atomic Redis rate-limit operation |
| Docker | Containerized Redis |
| Docker Compose | Redis service management |
| http-proxy-middleware | Reverse proxying |
| dotenv | Environment configuration |
| Postman | Manual API testing |

---

## Architecture Evolution

The project was developed incrementally across eight phases.

```text
Phase 0 — Foundation and Core Concepts
                 |
                 v
Phase 1 — Gateway Architecture and Foundation
                 |
                 v
Phase 2 — Authentication, Validation and Routing
                 |
                 v
Phase 3 — Rate Limiting Algorithms
                 |
                 v
Phase 4 — Redis-Based Atomic Rate Limiter
                 |
                 v
Phase 5 — API Keys and Client Management
                 |
                 v
Phase 6 — Timeout, Retry, Health Checks,
          Circuit Breaker and Logging
                 |
                 v
Phase 7 — Security and Reliability Review
                 |
                 v
Phase 8 — Manual Testing and Verification
```

---

# Phase 0 — Foundation and Core Concepts

## Goal

Understand the core concepts required to build an API Gateway before implementing the complete system.

### 0.1 API Gateway

An API Gateway is a centralized entry point for clients accessing backend services.

It handles common infrastructure concerns while backend services focus on business logic.

### 0.2 Reverse Proxy

A reverse proxy receives client requests and forwards them to the appropriate backend service.

```text
Client
   |
   v
API Gateway / Reverse Proxy
   |
   v
Backend Service
```

### 0.3 Redis

Redis is an in-memory data store useful for managing frequently accessed state, including rate-limit counters and token buckets.

Concepts studied included `GET`, `SET`, `INCR`, `EXPIRE`, `TTL`, `HGET`, and `HSET`.

### 0.4 Rate Limiting

Rate limiting controls how frequently a client can access an API.

```text
Client Request
      |
      v
Rate Limiter
      |
      +---- Allowed ------> Backend
      |
      +---- Limit exceeded -> 429
```

### 0.5 Concurrency and Race Conditions

A read-modify-write operation can produce incorrect results when concurrent requests read the same state.

```text
Request A ----+
              |
              v
          Shared State
              ^
              |
Request B ----+
```

This concept motivated the use of an atomic Redis Lua script in Phase 4.

**Phase 0 result:** Core Gateway, reverse-proxy, Redis, rate-limiting, concurrency, and race-condition concepts were studied.

---

# Phase 1 — Project Architecture and Foundation

## Goal

Build the initial Gateway infrastructure and connect it to backend services.

### Gateway and Services

| Component | Port |
|---|---:|
| API Gateway | 5000 |
| Product Service | 6500 |
| User Service | 7000 |
| Order Service | 8000 |
| Redis | 6379 |

### Implemented

- Express Gateway server
- Independent backend services
- Reverse proxy using `http-proxy-middleware`
- Centralized service URLs
- Redis running with Docker
- Docker Compose configuration
- Basic request logging
- Backend proxy error handling

### Request Routing

```text
GET /api/products
        |
        v
API Gateway :5000
        |
        v
Product Service :6500
```

The Gateway returns an appropriate gateway error when an upstream service cannot be reached.

**Phase 1 result:** The initial Gateway infrastructure and service routing were established.

---

# Phase 2 — Basic API Gateway

## Goal

Add authentication, request validation, authorization, and standardized request processing.

### 2.1 Middleware Pipeline

```text
Incoming Request
       |
       v
Logger
       |
       v
Request Validation
       |
       v
Authentication
       |
       v
Authorization where required
       |
       v
Routing / Reverse Proxy
       |
       v
Backend Service
```

The actual middleware sequence depends on the route being accessed.

### 2.2 API Key Authentication

Clients send an API key using the `X-API-Key` header.

```http
X-API-Key: YOUR_API_KEY
```

Invalid or missing credentials are rejected by authentication middleware.

### 2.3 Request Validation

Basic request/query validation was implemented.

Invalid query values can produce a `400 Bad Request` response rather than proceeding with invalid input.

### 2.4 Admin Authorization

Administrative operations use a separate admin API key.

A regular client key is not sufficient for admin access.

### 2.5 Service Registry

Service URLs were centralized in configuration instead of being scattered throughout the application.

```text
Products -> http://localhost:6500
Users    -> http://localhost:7000
Orders   -> http://localhost:8000
```

### 2.6 Standardized Responses

Standardized success and error responses were introduced.

Example:

```json
{
  "success": false,
  "message": "Invalid API key",
  "statusCode": 401
}
```

**Phase 2 result:** Authentication, validation, authorization, routing, logging, and error handling were integrated into the Gateway.

---

# Phase 3 — Rate Limiting Algorithms

## Goal

Understand different rate-limiting algorithms and choose an appropriate algorithm for the Gateway.

### 3.1 Fixed Window

Counts requests within a fixed time window.

```text
60-second window
+---------------------------+
| R1  R2  R3  R4  R5       |
+---------------------------+
```

It is simple to implement but can allow bursts around window boundaries.

### 3.2 Sliding Window

Tracks requests over a moving time interval.

Old timestamps outside the active window are removed.

This can provide more precise request tracking, but a timestamp-based implementation can require more memory.

### 3.3 Token Bucket

The Token Bucket algorithm allows a controlled burst of requests while refilling tokens over time.

```text
          Refill
             |
             v
      +--------------+
      | Token Bucket |
      |  o o o o o   |
      +------+-------+
             |
             v
       Consume Token
             |
       +-----+-----+
       |           |
       v           v
     Allow       Reject
                 with 429
```

Each bucket tracks token availability and refill timing.

### 3.4 Algorithm Comparison

| Algorithm | Main characteristic |
|---|---|
| Fixed Window | Simple fixed-period counter |
| Sliding Window Log | Accurate rolling-window tracking |
| Sliding Window Counter | Efficient approximate rolling-window tracking |
| Token Bucket | Controlled bursts and token refill |
| Leaky Bucket | Smooths the rate of outgoing traffic |

**Phase 3 result:** Token Bucket was selected for the main rate-limiting implementation.

---

# Phase 4 — Redis-Based Rate Limiter

## Goal

Move rate-limit state from local JavaScript memory to Redis so multiple Gateway instances can share the same state.

### 4.1 Why an In-Memory Map Was Not Enough

```text
Load Balancer
    /    \
   v      v
Gateway A Gateway B
   |        |
  Map A    Map B
```

Each Gateway instance would maintain separate in-memory state.

This could allow the same client to receive independent buckets on different instances.

### 4.2 Redis-Based State

```text
Gateway A ----+
              |
Gateway B ----+----> Redis
              |
Gateway C ----+
```

Redis provides shared rate-limit state for connected Gateway instances.

### 4.3 Token Bucket State

A Redis bucket stores the state required to calculate token availability and refill.

```text
rate_limit:<client-id>
        |
        +-- tokens
        +-- lastRefillTime
```

### 4.4 Atomic Lua Script

The bucket operation is performed within a Redis Lua script.

```text
Node.js
   |
   | EVAL
   v
Redis Lua Script
   |
   +-- Read bucket
   +-- Calculate refill
   +-- Check token availability
   +-- Consume token if available
   +-- Save bucket state
   +-- Set expiration
```

This makes the bucket operation atomic within Redis, preventing competing requests from interleaving the script's read and update operations.

### 4.5 TTL Cleanup

Inactive bucket state receives a time-to-live.

Current configuration:

```text
RATE_LIMIT_TTL=300
```

This represents 300 seconds, or five minutes.

**Phase 4 result:**

- Redis-backed Token Bucket
- Atomic Lua rate-limit operation
- Client-specific bucket state
- TTL cleanup
- Docker-based Redis setup
- Manual rate-limit verification

---

# Phase 5 — API Keys and Client Management

## Goal

Move from a shared API key to individual clients with separate credentials, plans, and rate-limit configurations.

### 5.1 Client Data Model

MongoDB stores client metadata, including:

```text
Client
  |
  +-- name
  +-- apiKeyHash
  +-- plan
  +-- rateLimit
  |     +-- capacity
  |     +-- refillRate
  +-- status
  +-- createdAt
  +-- updatedAt
```

### 5.2 API Key Generation and Hashing

API keys are generated using Node.js cryptographic utilities.

The raw key is returned when a client is created. The application stores its SHA-256 hash rather than the raw key.

```text
Raw API Key
     |
     v
   SHA-256
     |
     v
  apiKeyHash
     |
     v
   MongoDB
```

### 5.3 MongoDB and Redis Responsibilities

**MongoDB** stores persistent client information:

- Client identity
- API key hash
- Plan
- Rate-limit configuration
- Activation status

**Redis** stores temporary rate-limit state:

- Current token count
- Refill timing
- Expiration information

In short:

```text
MongoDB = Client identity and configuration
Redis   = Current rate-limit state
```

### 5.4 Client Authentication

```text
Incoming API Key
       |
       v
Calculate SHA-256 Hash
       |
       v
Find Client in MongoDB
       |
       +---- Not found or revoked -> 401
       |
       v
Attach authenticated client
to request
```

### 5.5 Plan-Based Rate Limiting

Different plans use different bucket configurations.

| Plan | Capacity | Refill Rate |
|---|---:|---:|
| Free | 5 | 1 |
| Pro | 10 | 2 |
| Enterprise | 20 | 5 |

The exact refill-rate unit depends on the application's rate-limiter configuration.

The client's plan determines its bucket capacity and refill rate.

### 5.6 Client Activation and Revocation

Client status can be changed by an authorized admin.

```text
Client Status
      |
      +---- active  -> Protected API access allowed
      |
      +---- revoked -> Authentication rejected
```

Revoking a client does not delete its MongoDB record.

### 5.7 Client Management Endpoints

The project includes client creation and administrative client-management routes.

Examples of documented route patterns:

```http
POST /api/clients
GET /api/admin/clients
PATCH /api/admin/clients/:clientId/status
```

The exact authentication requirements depend on how the routes are mounted in the application.

**Phase 5 result:**

- MongoDB client model
- API key generation and SHA-256 hashing
- Client authentication
- Client-specific rate limiting
- Free, Pro, and Enterprise plans
- Client activation and revocation
- Admin client management

---

# Phase 6 — Advanced Gateway Features

## Goal

Improve the Gateway's handling of slow or unavailable backend services.

### 6.1 Request Timeout

The Gateway uses a configurable timeout for backend requests.

```text
GATEWAY_TIMEOUT=5000
```

This represents a configured timeout of 5,000 milliseconds.

```text
Gateway
   |
   v
Backend Request
   |
   +---- Response in time -> Continue
   |
   +---- Timeout ----------> Error Handling
```

### 6.2 Retry Logic

The Gateway can retry eligible failed backend requests.

Configuration:

```text
MAX_RETRIES=2
RETRY_DELAY=500
```

The retry count and delay are configurable.

Retries must be applied carefully because retrying non-idempotent operations can potentially duplicate side effects.

### 6.3 Service Health Checks

The Gateway includes health monitoring for backend services.

```text
Product Service -> /health
User Service    -> /health
Order Service   -> /health
```

The configured health-check interval is 30 seconds.

Health checks help monitor service availability; they do not guarantee that every business operation will succeed.

### 6.4 Circuit Breaker

The circuit breaker prevents repeated requests to a backend that is consistently failing.

It has three states:

```text
CLOSED
   |
   | Failure threshold reached
   v
OPEN
   |
   | Recovery interval expires
   v
HALF-OPEN
   |
   +---- Success -> CLOSED
   |
   +---- Failure -> OPEN
```

Configuration:

```text
FAILURE_THRESHOLD=3
OPEN_DURATION=10000
```

The circuit opens after the configured failure threshold and allows a recovery test after the open duration.

When the circuit is open, requests can be rejected with `503 Service Unavailable`.

The circuit-breaker state is maintained in Gateway memory.

### 6.5 Request ID / Correlation ID

Request ID and correlation ID support tracing a request across multiple services.

This feature was intentionally skipped for the current project scope.

### 6.6 Gateway Logging

Gateway logs were improved to help diagnose request behavior.

Useful fields include:

- HTTP method
- Request URL
- Response status
- Request duration
- Client name, where available
- Log severity

Example:

```text
[INFO] [GET] /api/products -> 200 -> 48ms
[WARN] [GET] /api/products -> 429 -> 3ms
[ERROR] [GET] /api/products -> 502 -> 5012ms
```

Sensitive credentials, especially raw API keys, should not be included in logs.

### 6.7 Phase 6 Verification

The following behaviors were tested during development:

- Normal Gateway requests
- Backend timeout behavior
- Retry behavior
- Service health checks
- Circuit-breaker failure and recovery
- Gateway logging

**Phase 6 result:** Timeout, retry logic, health monitoring, circuit breaker, and improved logging were implemented and verified within the development scope.

---

# Phase 7 — Security and Reliability Review

## Goal

Review the existing Gateway's security and reliability behavior and address important issues within the project's learning scope.

This phase focused on practical improvements rather than expanding the project into a full production-hardening exercise.

### 7.1 API Key Handling

Client API keys are stored as SHA-256 hashes in MongoDB rather than as raw API keys.

```text
Raw Client API Key
        |
        v
      SHA-256
        |
        v
    MongoDB Hash
```

The raw key is returned when a client is created.

**Reviewed:**

- API key authentication and handling
- Hash-based API key storage
- Revoked client rejection
- Avoiding raw API key exposure in logs

### 7.2 JSON Request Body Size Limit

The Express JSON body parser was configured with a 100 KB limit.

```javascript
express.json({ limit: "100kb" })
```

Request flow:

```text
Incoming JSON Request
         |
         v
     Body Parser
         |
         v
   Within 100 KB?
       /     \
     Yes      No
      |        |
      v        v
   Continue   413
              Payload Too Large
```

**Verified:**

- Normal-sized JSON requests are accepted by the parser.
- Oversized JSON requests return `413 Payload Too Large`.
- Oversized requests are rejected before reaching the normal route-processing flow.

### 7.3 Sensitive Logging Review

Gateway logging was reviewed to avoid exposing raw client API keys and other secrets.

Logs focus on diagnostic information such as request method, URL, response status, duration, and client identity where available.

### 7.4 Admin Endpoint Protection

Administrative endpoints use a separate admin API key.

A regular client API key must not be accepted as an admin credential.

Admin authorization and rejection of unauthorized requests were checked manually.

### 7.5 Deferred Security Work

The following items were intentionally deferred:

- Explicit Helmet/security-header configuration
- CORS configuration for frontend integration
- Advanced security monitoring and observability
- Additional production-hardening features

These items are not claimed as implemented.

### Phase 7 Result

- Reviewed API key handling
- Reviewed hash-based key storage
- Added a 100 KB JSON body size limit
- Verified oversized JSON request handling
- Reviewed sensitive logging
- Reviewed admin endpoint authorization

The phase improved the existing Gateway within the project's current scope.

---

# Phase 8 — Manual Testing and Verification

## Goal

Verify the Gateway's main request flows and previously implemented features through manual API requests.

Testing was performed during development using API requests and controlled failure scenarios. This phase consolidated verification rather than adding new Gateway functionality.

### 8.1 Authentication Testing

The following client API key scenarios were checked:

| Scenario | Expected Behavior |
|---|---|
| Valid active client key | Request proceeds |
| Missing API key | `401 Unauthorized` |
| Invalid API key | `401 Unauthorized` |
| Revoked client key | `401 Unauthorized` |

These checks verify that protected routes require a valid, active client.

### 8.2 Admin Authorization Testing

Administrative routes were checked separately from normal client routes.

| Scenario | Expected Behavior |
|---|---|
| Valid admin key | Admin request is authorized |
| Missing admin key | Request is rejected |
| Invalid admin key | Request is rejected |
| Normal client key used for admin access | Request is rejected |

### 8.3 Rate Limiting Testing

The Redis-backed Token Bucket implementation was tested with repeated requests.

The checks covered:

- Requests within the available token capacity
- Requests exceeding token capacity
- `429 Too Many Requests` responses
- Token refill after waiting
- Independent rate-limit state for different clients
- Plan-based capacity and refill configuration

```text
Client Request
      |
      v
Redis Token Bucket
      |
      +---- Token available -> Allow
      |
      +---- No token -------> 429
```

The Lua script performs the bucket operation atomically within Redis.

### 8.4 Reverse Proxy Testing

The product-service proxy route was checked.

```text
Client
   |
   v
Gateway :5000
   |
   v
Product Service :6500
   |
   v
Response through Gateway
```

Normal request forwarding and backend failure handling were tested during development.

### 8.5 Timeout and Retry Testing

Timeout and retry behavior was checked using controlled backend delays and failure scenarios.

The intended flow is:

1. The Gateway sends a request to the backend.
2. The request fails if the configured timeout is exceeded.
3. Eligible failures can be retried according to the retry policy.
4. If retries are exhausted, the Gateway returns an appropriate error response.

Configured values:

```text
GATEWAY_TIMEOUT=5000
MAX_RETRIES=2
RETRY_DELAY=500
```

### 8.6 Circuit Breaker Testing

The circuit breaker was checked across its three states.

```text
CLOSED
   |
   | Repeated failures
   v
OPEN
   |
   | Recovery interval expires
   v
HALF-OPEN
   |
   +---- Successful test -> CLOSED
   |
   +---- Failed test ----> OPEN
```

The configured failure threshold is 3, and the open duration is 10 seconds.

Checks covered circuit opening after repeated failures, blocking requests while open, and testing recovery after the waiting period.

### 8.7 Health Check Testing

Health-check behavior was reviewed for the configured backend services.

```text
Gateway
   |
   +---- Product Service :6500
   |
   +---- User Service :7000
   |
   +---- Order Service :8000
```

The services' health endpoints were checked during development to verify availability and support backend monitoring.

### 8.8 Request Body Size Testing

The body-size limit introduced in Phase 7 was verified.

| Scenario | Expected Behavior |
|---|---|
| JSON payload within 100 KB | Accepted by the body parser |
| JSON payload exceeding the limit | `413 Payload Too Large` |

### 8.9 Error Response and Logging Review

Common Gateway response outcomes were reviewed.

| Condition | Expected Status |
|---|---:|
| Invalid client API key | 401 |
| Rate limit exceeded | 429 |
| Circuit breaker open | 503 |
| Upstream failure after retries | Appropriate gateway error, commonly 502 |
| Oversized JSON request | 413 |

The exact response depends on which middleware or error handler handles the request.

Logs were reviewed to provide useful diagnostic information without intentionally exposing raw API keys.

### 8.10 Testing Scope and Limitations

The project uses manual API testing for the current learning scope.

The following were intentionally excluded:

- Automated unit tests
- Automated integration-test suites
- Load and stress testing
- Throughput and latency benchmarking
- Production-scale deployment testing

Manual testing verifies the scenarios checked during development. It does not guarantee that every edge case or production failure mode is covered.

### Phase 8 Result

Core Gateway behaviors were manually checked during development, including:

- Client authentication and revocation
- Admin authorization
- Rate limiting and token refill
- Independent client rate limits
- Product-service proxying
- Timeout and retry handling
- Circuit-breaker behavior
- Health checks
- Oversized JSON request handling
- Error responses and sensitive logging review

Phase 8 consolidates verification of implemented features and does not introduce additional Gateway functionality.

---

## Current Architecture

The Gateway brings together client management, rate limiting, reverse proxying, and backend resilience mechanisms.

```text
                    +-------------------+
                    |      Client       |
                    +---------+---------+
                              |
                              | X-API-Key
                              v
                    +-------------------+
                    |    API Gateway    |
                    |      :5000        |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    | Logger / Validation|
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    | Authentication    |
                    +---------+---------+
                              |
                              v
                          MongoDB
                              |
                              v
                         req.client
                              |
                              v
                    +-------------------+
                    |   Rate Limiter    |
                    +---------+---------+
                              |
                              v
                            Redis
                              |
                              v
                    +-------------------+
                    | Circuit Breaker   |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    | Reverse Proxy     |
                    +---------+---------+
                              |
                  +-----------+-----------+
                  |           |           |
                  v           v           v
               Product       User        Order
               :6500         :7000       :8000
```

The exact route and middleware order depends on the route being accessed.

## Current Request Pipeline

For a normal protected API request:

```text
Incoming Request
       |
       v
Logger
       |
       v
Request Validation
       |
       v
Client Authentication
       |
       v
MongoDB Client Lookup
       |
       v
Rate Limiter
       |
       v
Redis Token Bucket
       |
       v
Circuit Breaker
       |
       v
Reverse Proxy
       |
       v
Backend Service
       |
       v
Response
```

Possible rejection points include:

- Invalid credentials: `401 Unauthorized`
- Invalid request input: `400 Bad Request`
- Rate limit exceeded: `429 Too Many Requests`
- Circuit breaker open: `503 Service Unavailable`
- Oversized JSON body: `413 Payload Too Large`
- Upstream failure after eligible retries: appropriate gateway error response

Admin routes use their own authorization requirements.

---

## Security

### API Keys

Raw client API keys are not stored in MongoDB. SHA-256 hashes are stored for client identification.

### Revoked Clients

Revoked clients are rejected by authentication middleware.

### Admin Authorization

Administrative endpoints require the configured admin API key.

### Redis Atomicity

The rate-limit operation is executed through a Lua script to prevent competing requests from interleaving the bucket update.

### Request Body Size

The JSON body parser enforces a 100 KB limit.

### Logging

Gateway logs are intended to support debugging without exposing raw API keys.

**Security scope note:** Explicit Helmet/security-header configuration and CORS for future frontend integration were deferred. This project should not be considered production-hardened solely on the basis of these implemented checks.

---

## Current Project Structure

The following is a representative structure based on the implemented project. Adjust filenames if your local repository differs.

```text
api-rate-limiting-gateway/
|
+-- backend/
|   +-- server.js
|   +-- user-server.js
|   +-- order-server.js
|
+-- src/
|   +-- config/
|   |   +-- redis.js
|   |   +-- services.js
|   |   +-- database.js
|   |   +-- rateLimits.js
|   |
|   +-- gateway/
|   |   +-- proxy.js
|   |   +-- circuitBreaker.js
|   |
|   +-- health/
|   |   +-- healthCheck.js
|   |
|   +-- middleware/
|   |   +-- logger.js
|   |   +-- validation.js
|   |   +-- auth.js
|   |   +-- authorization.js
|   |   +-- rateLimeter.js
|   |   +-- errorhandler.js
|   |
|   +-- model/
|   |   +-- client.model.js
|   |
|   +-- routes/
|   |   +-- gatewayRoutes.js
|   |   +-- clientRoutes.js
|   |
|   +-- utils/
|   |   +-- response.js
|   |   +-- apiKey.js
|   |
|   +-- app.js
|   +-- server.js
|
+-- .env
+-- .gitignore
+-- compose.yaml
+-- package.json
+-- package-lock.json
+-- README.md
```

Do not commit real `.env` credentials to a public repository.

---

## Key Concepts Learned

Through Phases 0–8, this project covered:

- API Gateway architecture
- Reverse proxying and service routing
- Express middleware pipeline
- HTTP status codes and error handling
- API key authentication and admin authorization
- Request validation
- Fixed Window, Sliding Window, and Token Bucket algorithms
- Redis hashes and TTL
- Atomic Redis operations and Lua scripting
- Concurrency and race conditions
- MongoDB and Mongoose
- API key generation and SHA-256 hashing
- Client management and API key revocation
- Plan-based rate limiting
- Docker and Docker Compose
- Request timeout and retry logic
- Service health checks
- Circuit breaker states
- Gateway logging
- JSON request body size limits
- Sensitive logging review
- Manual API testing and failure-scenario verification

---

## Intentionally Not Implemented

To keep the project focused on backend learning, the following were intentionally excluded or deferred:

- Request ID / distributed correlation ID
- Automated unit and integration test suites
- Load and stress testing
- Advanced analytics
- Distributed tracing
- Complex role-based access control
- Kubernetes
- Kafka
- Advanced Redis failure fallback
- Advanced observability dashboards
- Explicit Helmet/security-header configuration
- CORS for frontend integration
- Frontend application

These features can be considered later if the project scope requires them.

---

## Current Project Status

```text
Phase 0 — Foundation and Core Concepts
COMPLETE

Phase 1 — Project Architecture and Foundation
COMPLETE

Phase 2 — Basic API Gateway
COMPLETE

Phase 3 — Rate Limiting Algorithms
COMPLETE

Phase 4 — Redis-Based Rate Limiter
COMPLETE

Phase 5 — API Keys and Client Management
COMPLETE

Phase 6 — Advanced Gateway Features
COMPLETE

Phase 7 — Security and Reliability Review
COMPLETE

Phase 8 — Manual Testing and Verification
COMPLETE
```

### Current Milestone

Phases 0–8 are complete within the project's current learning scope.

The Gateway demonstrates API key authentication, client management, plan-based Redis Token Bucket rate limiting, reverse proxying, request validation, timeout and retry handling, health monitoring, circuit-breaker behavior, logging, and manual verification of core request flows.

Automated testing, load testing, frontend integration, and advanced security hardening remain outside the current scope.
