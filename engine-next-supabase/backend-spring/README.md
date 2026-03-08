# Notification Engine — Java Spring Boot Backend

Java Spring Boot equivalent of the Node.js/TypeScript backend, connecting to the same Supabase PostgreSQL database with identical API endpoints and behavior.

## Tech Stack

- **Java 17** + **Spring Boot 3.4**
- **Spring Data JPA** (Hibernate) for database access
- **Spring Security** + **JWT** (jjwt) for authentication
- **PostgreSQL** (Supabase) — same database as the Node.js backend
- **Flyway** for database migrations
- **RestTemplate** for AI API calls (Groq / Gemini)

## API Endpoints (same as Node.js backend)

| Method | Path                                 | Auth   | Description                      |
| ------ | ------------------------------------ | ------ | -------------------------------- |
| GET    | `/health`                            | Public | Health check with DB & AI status |
| POST   | `/api/login`                         | Public | Login with email/password → JWT  |
| POST   | `/api/notifications`                 | Bearer | Submit notification event        |
| GET    | `/api/metrics`                       | Bearer | Dashboard live metrics           |
| GET    | `/api/metrics/timeline`              | Bearer | Hourly decision breakdown (24h)  |
| GET    | `/api/audit`                         | Bearer | Paginated audit logs             |
| GET    | `/api/rules`                         | Bearer | List active rules                |
| POST   | `/api/rules`                         | Admin  | Create a rule                    |
| PUT    | `/api/rules/:id`                     | Admin  | Update a rule                    |
| DELETE | `/api/rules/:id`                     | Admin  | Soft-delete a rule               |
| GET    | `/api/deferred-queue`                | Bearer | Paginated deferred queue         |
| POST   | `/api/deferred-queue/:id/force-send` | Admin  | Force-send a deferred item       |

## Setup

### 1. Environment Variables

Create an `application.properties` override or set environment variables:

```properties
DATABASE_URL=jdbc:postgresql://<supabase-host>:5432/postgres
DATABASE_USER=postgres
DATABASE_PASSWORD=<your-supabase-db-password>
JWT_SECRET=<your-jwt-secret>
GROQ_API_KEY=<your-groq-api-key>
GEMINI_API_KEY=<your-gemini-api-key>  # fallback if Groq not set
PORT=5000
CORS_ORIGINS=http://localhost:3000
```

### 2. Build & Run

```bash
# Build
./mvnw clean package -DskipTests

# Run
java -jar target/engine-1.0.0.jar

# Or run directly with Maven
./mvnw spring-boot:run
```

### 3. Maven Wrapper (if not present)

```bash
mvn wrapper:wrapper
```

## Architecture

Same behavior as the Node.js backend:

1. **Decision Engine Pipeline**: Event → Expiry Check → Dedup → Near-Duplicate (pg_trgm) → Rule Eval → Fatigue Check → AI Classification
2. **AI Service**: Groq (primary) → Gemini (fallback) → Safe fallback with circuit breaker
3. **Scheduler**: Background job every 60s processes LATER queue with retry logic and dead-letter handling
4. **Soft Deletes**: Rules are soft-deleted (is_active=false), never hard-deleted
5. **Data Seeder**: On startup, seeds admin/operator users and fatigue rule (same as seed_user.ts)

## Project Structure

```
backend-spring/
├── pom.xml
├── src/main/
│   ├── java/com/cyepro/engine/
│   │   ├── EngineApplication.java
│   │   ├── config/
│   │   │   ├── CorsConfig.java
│   │   │   ├── DataSeeder.java
│   │   │   ├── JacksonConfig.java
│   │   │   └── SecurityConfig.java
│   │   ├── controller/
│   │   │   ├── AuthController.java
│   │   │   ├── DeferredQueueController.java
│   │   │   ├── HealthController.java
│   │   │   ├── NotificationController.java
│   │   │   └── RuleController.java
│   │   ├── dto/
│   │   │   ├── LoginRequest.java
│   │   │   ├── LoginResponse.java
│   │   │   └── NotificationEventRequest.java
│   │   ├── entity/
│   │   │   ├── AuditLog.java
│   │   │   ├── DeferredQueueItem.java
│   │   │   ├── NotificationEvent.java
│   │   │   ├── Rule.java
│   │   │   └── User.java
│   │   ├── repository/
│   │   │   ├── AuditLogRepository.java
│   │   │   ├── DeferredQueueRepository.java
│   │   │   ├── NotificationEventRepository.java
│   │   │   ├── RuleRepository.java
│   │   │   └── UserRepository.java
│   │   ├── security/
│   │   │   ├── JwtAuthFilter.java
│   │   │   └── JwtUtil.java
│   │   └── service/
│   │       ├── AIService.java
│   │       ├── DecisionEngine.java
│   │       └── SchedulerService.java
│   └── resources/
│       ├── application.properties
│       └── db/migration/
│           └── V1__init_schema.sql
```
