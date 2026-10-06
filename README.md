# API Rate Limiting Gateway

A backend-focused API Gateway built with Node.js, Express, Redis, MongoDB, Docker, Lua, and http-proxy-middleware.

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
* Plan-based rate limiting
* Request timeout
* Retry logic
* Service health monitoring
* Circuit breaker
* Gateway logging

---

# Table of Contents

* [Project Overview](#project-overview)
* [Problem This Project Solves](#problem-this-project-solves)
* [How the Gateway Works](#how-the-gateway-works)
* [Tech Stack](#tech-stack)
* [Architecture Evolution](#architecture-evolution)
* [Phase 0 — Foundation & Core Concepts](#phase-0--foundation--core-concepts)
* [Phase 1 — Project Architecture & Foundation](#phase-1--project-architecture--foundation)
* [Phase 2 — Basic API Gateway](#phase-2--basic-api-gateway)
* [Phase 3 — Rate Limiting Algorithms](#phase-3--rate-limiting-algorithms)
* [Phase 4 — Redis-Based Rate Limiter](#phase-4--redis-based-rate-limiter)
* [Phase 5 — API Keys & Client Management](#phase-5--api-keys--client-management)
* [Phase 6 — Advanced Gateway Features](#phase-6--advanced-gateway-features)
* [Current Architecture](#current-architecture)
* [Current Request Pipeline](#current-request-pipeline)
* [Security](#security)
* [Current Project Structure](#current-project-structure)
* [Key Concepts Learned](#key-concepts-learned)
* [Intentionally Not Implemented](#intentionally-not-implemented)
* [Current Project Status](#current-project-status)

---

# Project Overview

An API Gateway acts as a single entry point between clients and backend services.

Instead of allowing clients to directly communicate with every backend service:

```text
Client
  |
  +-------------> Product Service
  |
  +-------------> User Service
  |
  +-------------> Order Service
```

the project introduces a centralized Gateway:

```text
                         +-----------------+
                         |     Client      |
                         +--------+--------+
                                  |
                                  v
                     +----------------------+
                     |     API Gateway      |
                     |                      |
                     | Authentication       |
                     | Validation           |
                     | Authorization        |
                     | Rate Limiting        |
                     | Routing              |
                     | Logging              |
                     | Timeout              |
                     | Retry                |
                     | Health Check         |
                     | Circuit Breaker      |
                     +----------+-----------+
                                |
               +----------------+----------------+
               |                |                |
               v                v                v
        Product Service   User Service    Order Service
```

The Gateway controls access to backend services and provides a centralized place for common API concerns.

---

# Problem This Project Solves

When multiple backend services exist, exposing every service directly to clients creates several problems.

## Without an API Gateway

```text
                    Client
                  /   |    \
                 /    |     \
                v     v      v
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
* Backend failure handling becomes harder to centralize.

---

# What Our Gateway Solves

The Gateway becomes the centralized control point:

```text
Client
  |
  v
+-----------------------------+
|         API Gateway         |
|                             |
|  1. Authentication          |
|  2. Validation              |
|  3. Authorization           |
|  4. Rate Limiting           |
|  5. Routing                 |
|  6. Logging                 |
|  7. Timeout                 |
|  8. Retry                   |
|  9. Health Check            |
| 10. Circuit Breaker         |
+--------------+--------------+
               |
       +-------+--------+
       |       |        |
       v       v        v
   Product    User     Order
   Service   Service   Service
```

---

# How the Gateway Works

For a normal protected API request:

```text
Client
  |
  | X-API-Key
  v
API Gateway
  |
  v
Logger
  |
  v
Validation
  |
  v
Authentication
  |
  +---- Invalid ----> 401
  |
  v
Client Identification
  |
  v
Rate Limiter
  |
  +---- Limit exceeded ----> 429
  |
  v
Circuit Breaker
  |
  +---- Service unavailable ----> 503
  |
  v
Reverse Proxy
  |
  +----------------+
  |                |
  v                v
Product          User/Order
Service          Service
  |
  v
Response
  |
  v
Client
```

Backend failures are handled by the Gateway using timeout, retry, and circuit-breaker mechanisms.

---

# Tech Stack

| Technology            | Purpose                            |
| --------------------- | ---------------------------------- |
| Node.js               | Backend runtime                    |
| Express.js            | HTTP server and middleware         |
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

# Architecture Evolution

The project was built gradually instead of implementing everything at once.

```text
Phase 0
Concepts & Requirements
        |
        v
Phase 1
Gateway Foundation
        |
        v
Phase 2
Authentication + Routing + Middleware
        |
        v
Phase 3
Rate Limiting Algorithms
        |
        v
Phase 4
Redis + Atomic Distributed Rate Limiter
        |
        v
Phase 5
API Keys + MongoDB + Client Management
        |
        v
Phase 6
Timeout + Retry + Health Check + Circuit Breaker
+ Better Gateway Logging
```

---

# Phase 0 — Foundation & Core Concepts

## Goal

Before writing the gateway, understand the core concepts required to build it.

---

## 0.1 API Gateway

An API Gateway is a centralized entry point for clients.

```text
Client
  |
  v
API Gateway
  |
  +-- Authentication
  +-- Rate Limiting
  +-- Routing
  +-- Logging
       |
       v
   Backend Services
```

The gateway handles common infrastructure concerns while backend services focus on business logic.

---

## 0.2 Reverse Proxy

The project uses a reverse proxy.

```text
Client
  |
  v
Reverse Proxy / Gateway
  |
  v
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

Redis was identified as useful for rate limiting because request counters and bucket state need fast access.

---

## 0.4 Rate Limiting

Rate limiting controls how frequently a client can access an API.

```text
Client
  |
  | Requests
  v
Rate Limiter
  |
  +-- Allowed ----------> Backend
  |
  +-- Limit exceeded
             |
             v
           429
```

---

## 0.5 Concurrency and Race Conditions

We studied why this can be unsafe:

```text
GET state
   |
   v
Modify in Node.js
   |
   v
SET state
```

Two requests can read the same state simultaneously.

```text
             Redis
               |
        tokens = 1
          /          \
         /            \
   Gateway 1        Gateway 2
   reads 1          reads 1
      |                |
   allows           allows
      |                |
      +-------+--------+
              |
              v
        Both requests
        were allowed
```

This became important later when implementing the Redis-based atomic rate limiter.

---

# Phase 0 Result

```text
API Gateway
Reverse Proxy
Redis
Rate Limiting
Concurrency
Race Conditions
System Requirements
        |
        v
Core architecture understood
```

---

# Phase 1 — Project Architecture & Foundation

## Goal

Build the initial Gateway infrastructure.

---

## Architecture

```text
                         Client
                           |
                           v
                  +-----------------+
                  |   API Gateway   |
                  |      :5000      |
                  +--------+--------+
                           |
                    Reverse Proxy
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
       Product :6500   User :7000   Order :8000

                           |
                           v
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
Product Service -> :6500
User Service    -> :7000
Order Service   -> :8000
```

---

## Redis with Docker

Redis runs inside Docker.

```text
+-------------------------+
|        Docker           |
|                         |
|  +-------------------+  |
|  |  Redis 7 Alpine   |  |
|  |      :6379        |  |
|  +-------------------+  |
+------------+------------+
             |
             v
        Node Gateway
```

Docker Compose manages the Redis container.

---

## Reverse Proxy

`http-proxy-middleware` was introduced.

```text
GET /api/products
       |
       v
API Gateway :5000
       |
       v
Product Service :6500
```

Similarly:

```text
/api/users  -> User Service :7000
/api/orders -> Order Service :8000
```

---

## Gateway Error Handling

Backend unavailable:

```text
Client
  |
  v
Gateway
  |
  v
Backend
  |
  X
  |
  v
502 Bad Gateway
```

---

## Request Logging

Basic Gateway logging was introduced:

```text
GET /api/products -> 200 -> 14ms
```

---

# Phase 1 Result

```text
Client
  |
  v
Gateway :5000
  |
  +------> Product :6500
  |
  +------> User    :7000
  |
  +------> Order   :8000

Redis :6379
```

The basic Gateway infrastructure was working.

---

# Phase 2 — Basic API Gateway

## Goal

Turn the basic reverse proxy into an actual API Gateway.

---

## 2.1 Middleware Pipeline

The request pipeline became:

```text
Request
   |
   v
Logger
   |
   v
Validation
   |
   v
Authentication
   |
   v
Rate Limiter
   |
   v
Routing / Proxy
   |
   v
Backend Service
```

---

## 2.2 API Key Authentication

Clients send:

```text
X-API-Key: API_KEY
```

Flow:

```text
Client
  |
  | X-API-Key
  v
Authentication Middleware
  |
  +-- Missing -> 401
  |
  +-- Invalid -> 401
  |
  +-- Valid
       |
       v
    Continue
```

---

## 2.3 Request Validation

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

## 2.4 Authorization

A separate admin API key was introduced.

```text
Normal API Key
      |
      v
Admin Endpoint
      |
      v
403 Forbidden
```

Admin operations require:

```text
ADMIN_API_KEY
```

---

## 2.5 Service Registry

Service URLs were centralized:

```text
services
 |
 +-- products -> http://localhost:6500
 |
 +-- users    -> http://localhost:7000
 |
 +-- orders   -> http://localhost:8000
```

This avoids scattering service URLs throughout the application.

---

## 2.6 Standardized Responses

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

## 2.7 Gateway Integration

The complete Phase 2 request flow:

```text
                     Client
                       |
                       v
                +-------------+
                |    Logger   |
                +------+------+
                       |
                       v
                +-------------+
                | Validation  |
                +------+------+
                       |
                       v
                +-------------+
                |    Auth     |
                +------+------+
                       |
                       v
                +-------------+
                |Authorization|
                +------+------+
                       |
                       v
                +-------------+
                |   Router    |
                +------+------+
                       |
                       v
                   Backend
```

---

# Phase 2 Result

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

# Phase 3 — Rate Limiting Algorithms

## Goal

Understand and implement different rate-limiting algorithms before choosing the final implementation.

---

## 3.1 Fixed Window

Basic idea:

```text
60-second window
+-----------------------------+
| Request  Request  Request   |
|    1        2        3      |
+-----------------------------+

Maximum = 5 requests
```

Initial implementation used JavaScript `Map`.

```text
API Key
   |
   v
JavaScript Map
   |
   +-- count
   |
   +-- windowStart
```

---

## 3.2 Sliding Window

Instead of resetting a complete counter, request timestamps are tracked.

```text
Current Time
     |
     v
--------------------------------
|    |     |       |       |
R1   R2    R3      R4      R5
--------------------------------
       <- 60 seconds ->
```

Old timestamps outside the window are removed.

---

## 3.3 Token Bucket

The project eventually selected Token Bucket for the main rate-limiting implementation.

```text
             Refill
               ^
               |
        +--------------+
        | Token Bucket |
        |              |
        |  o o o o o   |
        |   Capacity   |
        +------+-------+
               |
            Request
               |
               v
          Consume token
```

Each client has:

```text
tokens
lastRefillTime
```

---

## 3.4 Token Bucket Logic

```text
Request
  |
  v
Calculate elapsed time
  |
  v
Refill tokens
  |
  v
Is token available?
  |
  +-- YES -> Consume token -> Allow
  |
  +-- NO  -> 429 Too Many Requests
```

---

## 3.5 Algorithm Comparison

The following concepts were studied:

```text
Fixed Window
    |
    +-- Simple
    +-- Boundary limitations

Sliding Window Log
    |
    +-- Accurate
    +-- More memory

Sliding Window Counter
    |
    +-- Efficient
    +-- Approximate

Token Bucket
    |
    +-- Controlled bursts
    +-- Sustainable request rate

Leaky Bucket
    |
    +-- Smooth traffic flow
```

For this Gateway, Token Bucket was selected because it provides controlled bursts and refill-based rate control.

---

# Phase 4 — Redis-Based Rate Limiter

## Goal

Move rate-limit state from local JavaScript memory to Redis so it can be shared between multiple Gateway instances.

---

## Why JavaScript Map Was Not Enough

With an in-memory `Map`:

```text
             Load Balancer
                /      \
               v        v
         Gateway 1   Gateway 2
           Map A       Map B
```

Each Gateway has independent state.

The same client could therefore receive separate buckets.

---

## Redis Solution

```text
             Load Balancer
              /    |    \
             v     v     v
        Gateway1 Gateway2 Gateway3
             \      |      /
              \     |     /
               v    v    v
                  Redis
```

Now all Gateway instances share the same rate-limit state.

---

## Redis Bucket

For each client:

```text
rate_limit:<client-id>

+----------------------------+
| tokens                     |
| lastRefillTime             |
+----------------------------+
```

Redis Hashes are used to store the bucket state.

---

## Redis Token Bucket Flow

```text
Request
   |
   v
Client identified
   |
   v
Redis bucket
   |
   v
Calculate refill
   |
   v
Check token
   |
   +-- Available
   |      |
   |      v
   |   Consume token
   |      |
   |      v
   |    Allow
   |
   +-- Not available
          |
          v
         429
```

---

## Atomic Lua Script

A simple:

```text
READ
 |
 v
Calculate
 |
 v
WRITE
```

operation can suffer from race conditions.

Therefore the bucket operation was moved into a Redis Lua script.

```text
Node.js
   |
   | EVAL
   v
Redis
   |
   v
+---------------------------+
| Lua Script                |
|                           |
| Read bucket               |
| Calculate refill          |
| Check token               |
| Consume token             |
| Save bucket               |
| Set TTL                   |
+---------------------------+
```

The operation happens atomically inside Redis.

---

## TTL Cleanup

Inactive client buckets receive a TTL.

```text
rate_limit:<client-id>
        |
        v
      EXPIRE
        |
        v
Inactive bucket
        |
        v
Automatically removed
```

Current TTL:

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

# Phase 5 — API Keys & Client Management

## Goal

Move from one shared API key to a real client-management model.

Before Phase 5:

```text
All clients
     |
     v
One API Key
     |
     v
Same rate-limit configuration
```

After Phase 5:

```text
Client A -- API Key A --+
                        |
Client B -- API Key B --+--> Gateway
                        |
Client C -- API Key C --+
```

---

## 5.1 Client Data Model

MongoDB stores client information:

```text
Client
|
+-- name
+-- apiKeyHash
+-- plan
+-- rateLimit
|   +-- capacity
|   +-- refillRate
|
+-- status
+-- createdAt
+-- updatedAt
```

---

## 5.2 API Key Generation

API keys are generated using Node.js `crypto`.

Format:

```text
rk_live_<random-value>
```

The raw key is returned when the client is created.

---

## 5.3 API Key Hashing

The raw API key is not stored in MongoDB.

Instead:

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

Authentication performs the same operation:

```text
Incoming API Key
       |
       v
     SHA-256
       |
       v
 Search MongoDB
       |
       v
 apiKeyHash match?
       |
    +--+--+
   YES    NO
    |      |
    v      v
 Allow    401
```

---

## 5.4 MongoDB vs Redis

The project now has two different types of state.

### MongoDB

Stores relatively persistent client information:

```text
MongoDB
   |
   +-- Client identity
   +-- API key hash
   +-- Plan
   +-- Rate-limit configuration
   +-- Status
```

### Redis

Stores temporary high-frequency rate-limit state:

```text
Redis
   |
   +-- Current tokens
   +-- Last refill time
   +-- TTL
```

The separation is:

```text
MongoDB = Who is this client and what is their configuration?

Redis   = How many tokens does this client currently have?
```

---

## 5.5 MongoDB Authentication

The request flow became:

```text
Client
  |
  | X-API-Key
  v
Authentication Middleware
  |
  v
Hash API Key
  |
  v
MongoDB
  |
  +-- Client not found -> 401
  |
  +-- Client revoked   -> 401
  |
  +-- Client active
          |
          v
      req.client
```

---

## 5.6 Client-Specific Rate Limiting

The rate limiter reads the authenticated client:

```text
req.client
   |
   +-- _id
   +-- name
   +-- plan
   +-- rateLimit
        |
        +-- capacity
        +-- refillRate
```

Redis uses the client ID:

```text
rate_limit:<client-id>
```

instead of using the raw API key.

---

## 5.7 Plan-Based Rate Limiting

Different client plans have different rate-limit configurations.

```text
Free
    capacity = 5
    refillRate = 1

Pro
    capacity = 10
    refillRate = 2

Enterprise
    capacity = 20
    refillRate = 5
```

When a client is created, its plan automatically determines its rate-limit configuration.

```text
Client Plan
    |
    v
Rate Limit Configuration
    |
    +-- capacity
    +-- refillRate
    |
    v
MongoDB
    |
    v
Redis Token Bucket
```

---

## 5.8 Client Activation and Revocation

Clients can be:

```text
active
revoked
```

Admin can change the status.

```text
             Admin
               |
               v
PATCH /api/admin/clients/:id/status
               |
        +------+------+
        v             v
     active        revoked
        |             |
        v             v
   API works       API blocked
                   with 401
```

Revoking a client does not delete its MongoDB record.

---

## 5.9 Client Management API

### Create Client

```text
POST /api/clients
```

Flow:

```text
Client
  |
  v
Generate API Key
  |
  v
Hash API Key
  |
  v
MongoDB
  |
  v
Return raw API key once
```

### List Clients

```text
GET /api/admin/clients
```

API key hashes are not exposed in the response.

### Activate / Revoke Client

```text
PATCH /api/admin/clients/:clientId/status
```

---

# Phase 5 Result

Implemented:

* MongoDB client model
* Secure API key generation
* SHA-256 API key hashing
* Client authentication
* Client-specific rate limiting
* Free, Pro, and Enterprise plans
* Plan-based rate-limit configuration
* Client activation
* Client revocation
* Client listing
* Admin client management
* Redis client-specific token buckets

---

# Phase 6 — Advanced Gateway Features

## Goal

Make the Gateway more resilient and closer to a real-world backend gateway.

Phase 6 focused on handling backend failures, monitoring service health, controlling repeated failures, and improving Gateway logs.

---

## 6.1 Request Timeout

A Gateway timeout was added for backend requests.

Current configuration:

```text
GATEWAY_TIMEOUT=5000
```

The Gateway waits for a backend response for up to 5 seconds.

```text
Client
  |
  v
Gateway
  |
  v
Backend
  |
  | No response
  | after 5 seconds
  v
Timeout
  |
  v
Retry / Error Handling
```

This prevents the Gateway from waiting indefinitely for an unhealthy backend service.

---

## 6.2 Retry Logic

Failed backend requests can be retried.

Current configuration:

```text
MAX_RETRIES=2
RETRY_DELAY=500
```

Flow:

```text
Gateway
   |
   v
Backend Request
   |
   +-- Success
   |     |
   |     v
   |   Response
   |
   +-- Failure
         |
         v
      Retry 1
         |
         v
      Retry 2
         |
         v
    Final Failure
```

The retry delay is configurable.

Retries are applied before the failure is recorded by the circuit breaker.

---

## 6.3 Service Health Check

A dedicated service health-check system was added.

The Gateway checks:

```text
Product Service -> /health
User Service    -> /health
Order Service   -> /health
```

Health checks run when the Gateway starts and periodically afterward.

Current interval:

```text
30 seconds
```

Example:

```text
Checking Product Service: http://localhost:6500/health
Checking User Service: http://localhost:7000/health
Checking Order Service: http://localhost:8000/health

Product Service response: 200
User Service response: 200
Order Service response: 200

Service Health:
Product Service: healthy
User Service: healthy
Order Service: healthy
```

This allows the Gateway to monitor the availability of backend services.

---

## 6.4 Circuit Breaker

A circuit breaker was implemented to prevent repeatedly sending requests to an unhealthy backend.

The circuit has three states:

```text
CLOSED
   |
   | repeated failures
   v
OPEN
   |
   | after 10 seconds
   v
HALF-OPEN
   |
   +-- Success --> CLOSED
   |
   +-- Failure --> OPEN
```

Current configuration:

```text
FAILURE_THRESHOLD = 3
OPEN_DURATION = 10000ms
```

### Closed

Normal requests are allowed.

```text
CLOSED
  |
  v
Request allowed
```

### Open

After 3 recorded backend failures:

```text
CLOSED
  |
  | 3 failures
  v
OPEN
```

Requests are blocked without contacting the backend:

```text
OPEN
  |
  v
503 Service temporarily unavailable
```

### Half-Open

After 10 seconds, the circuit allows a request to test recovery.

```text
OPEN
  |
  | 10 seconds
  v
HALF-OPEN
```

If the backend succeeds:

```text
HALF-OPEN
    |
    | success
    v
 CLOSED
```

If it fails:

```text
HALF-OPEN
    |
    | failure
    v
 OPEN
```

The circuit breaker is currently maintained in Gateway memory.

---

## 6.5 Request ID

Request ID / correlation ID was intentionally skipped.

Reason:

The feature is useful for distributed tracing and advanced observability, but it was not considered necessary for the current learning scope of the project.

The project instead focuses on clear Gateway logging and service-level failure handling.

---

## 6.6 Better Gateway Logging

Gateway logging was improved to include:

* HTTP method
* Request URL
* Response status
* Request duration
* Client name
* Log level

Example:

```text
[INFO] [GET] /api/products -> 200 -> 48ms -> client: Khushi App
```

For client errors:

```text
[WARN] [GET] /api/products -> 429 -> 3ms -> client: Khushi App
```

For server errors:

```text
[ERROR] [GET] /api/products -> 502 -> 5012ms -> client: Khushi App
```

Log levels are determined using the response status:

```text
2xx / 3xx -> INFO
4xx        -> WARN
5xx        -> ERROR
```

This makes Gateway logs easier to read and debug.

---

## 6.7 Phase 6 Integration Testing

All Phase 6 features were individually tested.

### Normal Request

```text
GET /api/products
```

Result:

```text
200 OK
```

### Timeout

Backend response delay beyond the configured timeout was tested successfully.

### Retry

Failed backend requests were retried according to the configured retry count.

### Health Check

All three backend services were verified as healthy.

### Circuit Breaker

The complete circuit lifecycle was tested:

```text
CLOSED
   |
   v
OPEN
   |
   v
HALF-OPEN
   |
   v
CLOSED
```

Failure and recovery scenarios were verified.

### Logging

Improved logs were verified with:

```text
[INFO]
[WARN]
[ERROR]
```

and client/request information.

---

# Phase 6 Result

Implemented and tested:

* Request timeout
* Configurable retry logic
* Service health checks
* Circuit breaker
* Better Gateway logging
* Backend failure handling
* Gateway resilience improvements
* Complete Phase 6 integration testing

Request ID / correlation ID was intentionally skipped.

---

# Current Architecture

The current architecture after Phase 6:

```text
                                +------------------+
                                |      Client      |
                                +--------+---------+
                                         |
                                         | X-API-Key
                                         v
                         +----------------------------+
                         |        API Gateway         |
                         |          :5000             |
                         +-------------+--------------+
                                       |
                                       v
                              +----------------+
                              |     Logger     |
                              +-------+--------+
                                      |
                                      v
                              +----------------+
                              |   Validation   |
                              +-------+--------+
                                      |
                                      v
                              +----------------+
                              | Authentication |
                              +-------+--------+
                                      |
                                      v
                                  MongoDB
                                      |
                                      v
                                req.client
                                      |
                                      v
                              +----------------+
                              | Rate Limiter  |
                              +-------+--------+
                                      |
                                      v
                                  Redis
                                      |
                                      v
                              +----------------+
                              | Circuit Breaker|
                              +-------+--------+
                                      |
                                      v
                              +----------------+
                              | Reverse Proxy  |
                              +-------+--------+
                                      |
                         +------------+------------+
                         |            |            |
                         v            v            v
                  Product :6500   User :7000   Order :8000
```

Backend failures are handled through:

```text
Timeout
   |
   v
Retry
   |
   v
Failure Recording
   |
   v
Circuit Breaker
   |
   +-- CLOSED -> Request allowed
   |
   +-- OPEN -> Request blocked
   |
   +-- HALF-OPEN -> Recovery test
```

---

# Current Request Pipeline

For a protected API request:

```text
Incoming Request
       |
       v
     Logger
       |
       v
   Validation
       |
       v
 Authentication
       |
       v
    MongoDB
       |
       v
   req.client
       |
       v
  Rate Limiter
       |
       v
     Redis
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
       |
       v
     Logger
```

Possible rejection points:

```text
Authentication
      |
      +-- Invalid API key -> 401

Rate Limiter
      |
      +-- Limit exceeded -> 429

Circuit Breaker
      |
      +-- Circuit open -> 503

Backend failure
      |
      +-- Retries exhausted -> 502
```

---

# Admin Request Flow

Admin operations use a separate admin API key.

```text
Admin
  |
  | X-API-Key: ADMIN_API_KEY
  v
API Gateway
  |
  v
Authorization Middleware
  |
  +-- Invalid -> 403
  |
  +-- Valid
       |
       v
Client Management
       |
       +-- Create Client
       +-- List Clients
       +-- Activate Client
       +-- Revoke Client
```

---

# Security

## API Keys

Raw client API keys are not stored in MongoDB.

```text
Raw Key
   |
   v
SHA-256
   |
   v
MongoDB
```

## Revoked Keys

A revoked client cannot access protected Gateway routes.

```text
Revoked Client
      |
      v
Authentication
      |
      v
401 API key is revoked
```

## Admin Authorization

Administrative operations require the admin API key.

```text
Normal Key -> 403
Admin Key  -> Allowed
```

## Redis Atomicity

Rate-limit state updates happen inside a Lua script in Redis to avoid the simple read-modify-write race condition.

## Client-Specific Rate Limiting

Rate-limit configuration is associated with the authenticated client rather than using one global configuration.

---

# Current Project Structure

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

---

# Key Concepts Learned

Through Phase 0 to Phase 6, the project covered:

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
* Plan-based rate limiting
* Docker
* Docker Compose
* Request timeout
* Retry logic
* Service health checks
* Circuit breaker
* Gateway logging
* Backend failure handling
* Gateway resilience

---

# Intentionally Not Implemented

The project is intentionally being built gradually.

The following are not currently implemented:

* Request ID / distributed correlation ID
* Advanced analytics
* Distributed tracing
* Complex RBAC
* Kubernetes
* Kafka
* Advanced Redis failure fallback
* Advanced observability
* Advanced monitoring dashboards

These features can be considered later if they become necessary.

---

# Current Project Status

```text
Phase 0 — Foundation & Concepts
████████████████████ 100% COMPLETE

Phase 1 — Gateway Foundation
████████████████████ 100% COMPLETE

Phase 2 — Basic API Gateway
████████████████████ 100% COMPLETE

Phase 3 — Rate Limiting Algorithms
████████████████████ 100% COMPLETE

Phase 4 — Redis Rate Limiter
████████████████████ 100% COMPLETE

Phase 5 — API Keys & Client Management
████████████████████ 100% COMPLETE

Phase 6 — Advanced Gateway Features
████████████████████ 100% COMPLETE
```

---

# What Has Been Built

The project has evolved from a simple Express server into a multi-service API Gateway:

```text
                    +------------------+
                    |      Client      |
                    +--------+---------+
                             |
                             v
                  +----------------------+
                  |     API Gateway      |
                  |                      |
                  | Authentication       |
                  | Validation           |
                  | Authorization        |
                  | Rate Limiting        |
                  | Reverse Proxy        |
                  | Routing              |
                  | Logging              |
                  | Timeout              |
                  | Retry                |
                  | Health Check         |
                  | Circuit Breaker      |
                  +-------+------+-------+
                          |      |
                  +-------+      +-------+
                  v                      v
             +----------+          +----------+
             | MongoDB  |          |  Redis   |
             |          |          |          |
             | Clients  |          | Buckets  |
             | API Hash |          | Tokens   |
             | Plans    |          | TTL      |
             | Status   |          | Lua      |
             +----------+          +----------+
                          |
                          v
                 +------------------+
                 | Backend Services |
                 +------------------+
                 | Product :6500    |
                 | User    :7000    |
                 | Order   :8000    |
                 +------------------+
```

---

# Current Milestone

Phase 0 through Phase 6 are complete.

The Gateway currently provides:

```text
Client
  |
  v
API Key Authentication
  |
  v
MongoDB Client Identification
  |
  v
Plan-Based Rate Limiting
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
  +-- Product Service :6500
  +-- User Service    :7000
  +-- Order Service   :8000
```

The Gateway also provides:

```text
Timeout
Retry
Health Monitoring
Better Logging
Client Management
API Key Revocation
```

Phase 7 will be introduced gradually, with each new security or reliability component understood before implementation.
