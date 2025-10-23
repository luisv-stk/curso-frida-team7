# System Design Specification

## 1. Architecture Overview

### 1.1 High-Level Architecture  
We will build a client–server web application for uploading, previewing, and managing images. The architecture is organized into three main tiers:

  1. **Frontend**  
     - Angular 16+ application (Standalone Components, RxJS)  
     - Material Design (Angular Material) for UI  
     - TypeScript, SCSS/CSS  

  2. **Backend (API Server)**  
     - Node.js + Express (TypeScript)  
     - RESTful JSON APIs  
     - File upload handling (Multer)  
     - Business logic (validation, deduplication)  

  3. **Persistence & Storage**  
     - Metadata store: PostgreSQL  
     - Binary store: AWS S3 (or Azure Blob Storage / Google Cloud Storage)  
     - CDN: AWS CloudFront for serving images  

#### Monolithic vs. Microservices  
We opt for a **modular monolith** initially. All server-side concerns (auth, uploads, image processing) live in one codebase but are organized into clear modules. This allows rapid iteration. If scaling demands emerge, we can extract microservices (e.g., a dedicated Image Processor service).

### 1.2 Architecture Diagram  

```mermaid
flowchart LR
  subgraph Client
    A[Angular App<br/>(Drag & Drop, UI)]
  end

  subgraph Server
    B[API Gateway<br/>(Express)]
    C[Auth Module<br/>(JWT)]
    D[Image Module<br/>(Multer, S3 Uploader)]
    E[Database Module<br/>(PostgreSQL)]
  end

  subgraph Storage
    F[AWS S3 Buckets]
    G[CDN: CloudFront]
  end

  A -->|HTTPS JSON| B
  B --> C
  B --> D
  D --> F
  D --> E
  A -->|S3 Signed GET| G
  G --> F
  B --> E
```

### 1.3 Technology Stack

- **Frontend technologies**  
  - Angular 16+ (Standalone Components)  
  - Angular Material (MatIconModule, MatButtonModule, MatDialog)  
  - RxJS  
  - HTML5 Drag & Drop API  
- **Backend technologies**  
  - Node.js v18+ with TypeScript  
  - Express.js  
  - Multer (multipart/form-data parser)  
  - AWS SDK (S3 integration)  
  - JWT (jsonwebtoken)  
- **Database systems**  
  - PostgreSQL (relational metadata store)  
  - Optional Redis for caching  
- **Third-party services and APIs**  
  - AWS S3 (object storage)  
  - AWS CloudFront (CDN)  
  - SendGrid / SES (email notifications)  
  - Sentry (error monitoring)  
- **Development tools**  
  - VSCode  
  - ESLint, Prettier  
  - Jest (unit & integration tests)  
  - Cypress (E2E tests)  
  - Docker & Docker Compose  
  - GitHub Actions (CI/CD)  

---

## 2. Component Design

### 2.1 Frontend Components

| Component              | Responsibilities                                                                          | Interactions                                 |
|------------------------|-------------------------------------------------------------------------------------------|----------------------------------------------|
| UploadAreaComponent    | - Handles drag & drop<br/>- Click-to-upload<br/>- Triggers file selection dialog           | Emits `filesSelected` event                 |
| ImagePreviewList       | - Renders a list/grid of thumbnails<br/>- Shows remove (✕) buttons                        | Inputs: `imageUrls: string[]`                |
| ImagePreviewItem       | - Displays single thumbnail and remove icon<br/>- Fires remove request on icon click      | Emits `remove(index: number)`                |
| FileInputHidden        | - Hidden `<input type="file" multiple>`<br/>- Relays change events to parent              | On change → emit FileList                   |
| NotificationService    | - Shows toasts/snackbars<br/>- Success/error messages                                     | Injected into all UI components              |

#### Interaction Flow

1. **User drags files** onto `UploadAreaComponent` → `onDragOver` & `onDrop` handlers  
2. **User clicks upload area** → hidden `FileInputHidden` is `.click()`-ed → `onFileInputChange()`  
3. Files are emitted to parent (`AppComponent`) → calls service to POST files  
4. On success → receives back list of processed image URLs → updates `ImagePreviewList`  

### 2.2 Backend Services

| Service            | Role                                                                 | Key Interfaces                                       |
|--------------------|----------------------------------------------------------------------|------------------------------------------------------|
| Express App        | HTTP server & routing                                               | `/api/auth`, `/api/images`, `/api/users`             |
| Auth Controller    | JWT issuance & validation                                           | POST `/api/auth/login`, POST `/api/auth/register`    |
| Image Controller   | Receive uploads, trigger S3 uploads, metadata CRUD                  | POST `/api/images`, GET `/api/images`, DELETE `/api/images/:id` |
| Image Service      | Business logic: dedupe, validations (type/size), generate presigned URLs | `uploadFiles(files: Express.Multer.File[])`, `delete(id: string)` |
| Database Module    | Encapsulates PostgreSQL queries via TypeORM/Prisma                   | Entities: `User`, `Image`                            |
| Cache Layer (Opt.) | Redis caching of presigned URLs or frequently-used data             | `cache.get`, `cache.set`                            |

### 2.3 Database Layer

- Use an ORM (Prisma or TypeORM) for schema migrations, type safety.  
- Connection pooling for performance.  
- Data access via repository pattern.  

---

## 3. Data Models

### 3.1 Database Schema

Users Table:
- id: UUID (PK)
- email: String (Unique, indexed)
- password_hash: String
- role: Enum('admin','user')
- created_at: Timestamp
- updated_at: Timestamp

Images Table:
- id: UUID (PK)
- user_id: UUID (FK → Users.id, indexed)
- original_filename: String
- s3_key: String (unique storage key)
- url: String (public/CloudFront URL)
- size: Integer (bytes)
- mime_type: String
- width: Integer (px)
- height: Integer (px)
- created_at: Timestamp

### 3.2 Data Flow

1. **Client → API (POST /api/images)**: multipart form data  
2. **API**:  
   - Validate JWT → extract user  
   - Validate files (type, size, dimension)  
   - Store metadata record in DB  
   - Upload binary to S3 → generate `s3_key`  
   - Update DB record with S3 info & computed dimensions  
   - Return array of image DTOs  
3. **Client**: displays returned URLs  

---

## 4. API Design

### 4.1 Endpoints

#### Authentication

```
POST /api/auth/register
Request:
  {
    "email": string,
    "password": string
  }
Response:
  {
    "id": string,
    "email": string,
    "token": string
  }
Authentication: None
```

```
POST /api/auth/login
Request:
  {
    "email": string,
    "password": string
  }
Response:
  {
    "token": string
  }
Authentication: None
```

#### Images

```
POST /api/images
Headers:
  Authorization: Bearer <token>
Body: multipart/form-data
  files: File[]
Response:
  [
    {
      "id": string,
      "url": string,
      "originalFilename": string,
      "size": number,
      "width": number,
      "height": number
    }
  ]
Authentication: Required
```

```
GET /api/images
Headers:
  Authorization: Bearer <token>
Query:
  page?: number
  size?: number
Response:
  {
    "items": [ ImageDTO ],
    "total": number,
    "page": number,
    "size": number
  }
Authentication: Required
```

```
DELETE /api/images/:id
Headers:
  Authorization: Bearer <token>
Response:
  { "success": true }
Authentication: Required
```

### 4.2 API Patterns

- **RESTful conventions**: CRUD resources under `/api/images`.  
- **Error handling**: Standard problem+json responses.  
- **Pagination**: `page`, `size` query parameters.  
- **Security**: JWT in `Authorization` header.  

---

## 5. Security Design

### 5.1 Authentication Strategy

- JWT Tokens (signed with RS256 or HS256)  
- Tokens issued at login/register, with 1h expiration and refresh tokens if needed  
- Token stored in HttpOnly Secure cookie or localStorage (depending on XSS concerns)  

### 5.2 Authorization

- Role-Based Access Control (RBAC)  
- `User` can CRUD own images  
- `Admin` can view/delete all images  
- Middleware checks `req.user.role` and resource ownership  

### 5.3 Data Protection

- **Encryption at Rest**: AWS S3 with SSE-S3 or SSE-KMS  
- **Encryption in Transit**: TLS for all HTTP endpoints  
- **Input Validation**:  
  - File type whitelisting (`image/jpeg`, `image/png`, etc.)  
  - Max file size (e.g., 5MB)  
- **Sanitization**: No user-submitted HTML, minimal risk  

---

## 6. Integration Points

### 6.1 External Services

- **AWS S3**: Object storage for images  
- **CloudFront CDN**: Edge caching of public images  
- **SendGrid/SES**: Transactional emails (welcome, alerts)  
- **Sentry**: Error tracking  

### 6.2 Internal Integrations

- **Redis**: Cache presigned S3 URLs  
- **PostgreSQL**: Central metadata store  
- **Local File System** (Dev): Fallback storage in Docker  

---

## 7. Performance Considerations

### 7.1 Optimization Strategies

- **Caching**  
  - CDN for static assets and images  
  - Redis for presigned URLs & hot metadata  
- **Database Indexing**  
  - Index on `user_id`, `created_at`  
- **Query Optimization**  
  - Use pagination to limit result sets  
- **Code Splitting**  
  - Angular lazy-loading modules  
- **Throttling & Rate Limiting**  
  - Prevent DoS on image upload endpoint  

### 7.2 Scalability

- **Horizontal Scaling**  
  - Stateless API servers in Auto Scaling Group  
  - Sticky sessions not required (JWT-based)  
- **Load Balancing**  
  - ALB / NGINX in front of Express servers  
- **Database Sharding** (Future)  
  - Horizontal read replicas for reporting  

---

## 8. Error Handling and Logging

### 8.1 Error Handling Strategy

- **Backend**  
  - Centralized error middleware  
  - Return HTTP status codes with problem+json body  
  - Retry mechanism for S3 transient failures  
- **Frontend**  
  - Catch HTTP errors in services  
  - Display user-friendly messages via `MatSnackBar`  
  - Fallback UI for network failures  

### 8.2 Logging and Monitoring

- **What gets logged**  
  - API requests: method, path, response time, status  
  - Errors with stack traces (Sentry)  
  - Upload metrics: file size, processing time  
- **Log Aggregation**  
  - Centralized in AWS CloudWatch or ELK Stack  
- **Performance Monitoring**  
  - APM (e.g., New Relic) for backend  
  - Web Vitals reporting for frontend  

---

## 9. Development Workflow

### 9.1 Project Structure

```
/client
  /src
    /app
      /components
      /services
      /models
    /assets
/docker
/docker-compose.yml
/server
  /src
    /controllers
    /services
    /repositories
    /middlewares
    /models
  /prisma /migrations
  Dockerfile
.github
  workflows/ci-cd.yml
```

### 9.2 Development Environment

- **Local Setup**  
  - Docker Compose (PostgreSQL, Redis, MinIO for S3)  
  - `yarn install && yarn start:dev` (client & server)  
- **Environment Variables**  
  - `.env.development`, `.env.test`, `.env.production`  
  - Keys: `JWT_SECRET`, `DATABASE_URL`, `S3_BUCKET`, etc.  
- **Config**  
  - Separate configs for dev vs prod (logging level, CORS)  

### 9.3 Testing Strategy

- **Unit Tests**  
  - Jest (server) & Karma/Jasmine (Angular)  
  - Mock external dependencies (S3, DB)  
- **Integration Tests**  
  - Spin up in-memory/postgres container  
  - Test API endpoints via Supertest  
- **E2E Tests**  
  - Cypress for user flows (upload, preview, delete)  
- **Coverage Goals**  
  - > 80% lines coverage on critical modules  

---

## 10. Deployment Architecture

### 10.1 Deployment Strategy

- **CI/CD with GitHub Actions**  
  - On `main` push: run lint, tests → build Docker images → push to registry  
  - On merge to `staging`: deploy to staging cluster  
  - On tag/release: promote to production  
- **Environments**  
  - **Development**: local & ephemeral Docker  
  - **Staging**: AWS EKS Fargate or ECS  
  - **Production**: AWS EKS with auto-scaling  

### 10.2 Infrastructure

- **Hosting Platform**: AWS  
- **Container Strategy**  
  - Docker containers orchestrated by Kubernetes (EKS)  
  - Separate deployments for `client` & `server`  
- **Database Hosting**  
  - AWS RDS for PostgreSQL (Multi-AZ)  
  - Read replicas for scaling reads  
- **Secrets Management**  
  - AWS Secrets Manager or Parameter Store  

---

**Trade-offs & Considerations**  
- Starting with a monolith accelerates time-to-market; splitting services can occur later.  
- Using managed services (AWS S3, RDS) reduces operational burden at the cost of vendor lock-in.  
- Presigned URLs enable direct client–S3 uploads but complicate security rules.  

This specification provides a clear, end-to-end blueprint for building, testing, and deploying a robust image upload and management system.