# System Design Specification

## 1. Architecture Overview

### 1.1 High-Level Architecture
The system follows a **Client-Server Architecture** with a progressive web application frontend and a backend API service. The application appears to be an image management system with drag-and-drop functionality, category management, and bulk operations.

```mermaid
graph TB
    A[Web Browser] --> B[Angular Frontend]
    B --> C[HTTP API Gateway]
    C --> D[Image Management Service]
    C --> E[File Storage Service]
    C --> F[Authentication Service]
    D --> G[Database]
    E --> H[Cloud Storage/CDN]
    F --> I[User Database]
```

### 1.2 Architecture Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   API Gateway   │    │   Backend       │
│   (Angular)     │◄──►│   (REST/HTTP)   │◄──►│   Services      │
│                 │    │                 │    │                 │
│ - Image Upload  │    │ - Rate Limiting │    │ - Image Proc.   │
│ - Drag & Drop   │    │ - Auth Check    │    │ - File Storage  │
│ - Category Mgmt │    │ - Validation    │    │ - Metadata DB   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.3 Technology Stack

**Frontend Technologies:**
- Angular 15+ (Component-based architecture)
- TypeScript for type safety
- Bootstrap 5 for responsive UI
- RxJS for reactive programming
- Angular Material for advanced UI components

**Backend Technologies:**
- Node.js with Express.js or NestJS
- TypeScript for backend consistency
- Multer for file upload handling
- Sharp or ImageMagick for image processing
- JWT for authentication

**Database Systems:**
- PostgreSQL for relational data (users, categories, metadata)
- Redis for caching and session management
- Cloud storage (AWS S3/Google Cloud Storage) for images

**Third-party Services:**
- CDN for image delivery (CloudFlare/AWS CloudFront)
- Email service (SendGrid/AWS SES)
- Image optimization service (Cloudinary/ImageKit)

## 2. Component Design

### 2.1 Frontend Components

**Core Components:**
```typescript
// Image Upload Component
@Component({
  selector: 'app-image-upload',
  template: './image-upload.component.html'
})
export class ImageUploadComponent {
  - dropArea: ElementRef
  - selectedFiles: File[]
  - uploadProgress: Observable<number>
  - onDragOver(): void
  - onDragLeave(): void
  - onDrop(event: DragEvent): void
  - selectFiles(): void
  - uploadImages(): Observable<UploadResponse>
}

// Image Gallery Component
@Component({
  selector: 'app-image-gallery'
})
export class ImageGalleryComponent {
  - images: Image[]
  - selectedImages: Set<string>
  - categories: Category[]
  - filterByCategory(categoryId: string): void
  - selectImage(imageId: string): void
  - deleteSelectedImages(): void
  - bulkUpdateCategory(): void
}

// Category Management Component
@Component({
  selector: 'app-category-manager'
})
export class CategoryManagerComponent {
  - categories: Category[]
  - createCategory(name: string): void
  - updateCategory(id: string, data: Partial<Category>): void
  - deleteCategory(id: string): void
}
```

### 2.2 Backend Services

**Service Architecture:**
```typescript
// Image Service
export class ImageService {
  - uploadImage(file: Express.Multer.File, metadata: ImageMetadata): Promise<Image>
  - getImages(filters: ImageFilters): Promise<Image[]>
  - deleteImage(id: string): Promise<void>
  - updateImageMetadata(id: string, metadata: Partial<ImageMetadata>): Promise<Image>
  - generateThumbnail(originalPath: string): Promise<string>
}

// Category Service
export class CategoryService {
  - createCategory(data: CreateCategoryDto): Promise<Category>
  - getCategories(): Promise<Category[]>
  - updateCategory(id: string, data: UpdateCategoryDto): Promise<Category>
  - deleteCategory(id: string): Promise<void>
}

// File Storage Service
export class StorageService {
  - uploadFile(file: Buffer, path: string): Promise<string>
  - deleteFile(path: string): Promise<void>
  - generateSignedUrl(path: string): Promise<string>
}
```

### 2.3 Database Layer

**Data Access Pattern:**
- Repository Pattern with TypeORM or Prisma
- Connection pooling for PostgreSQL
- Redis client for caching
- Transaction management for bulk operations

## 3. Data Models

### 3.1 Database Schema

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color code
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Images Table
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500),
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  width INTEGER,
  height INTEGER,
  category_id UUID REFERENCES categories(id),
  uploaded_by UUID REFERENCES users(id),
  tags TEXT[], -- PostgreSQL array
  alt_text VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Image Tags Junction Table (for many-to-many relationship)
CREATE TABLE image_tags (
  image_id UUID REFERENCES images(id),
  tag VARCHAR(100) NOT NULL,
  PRIMARY KEY (image_id, tag)
);

-- Indexes for performance
CREATE INDEX idx_images_category ON images(category_id);
CREATE INDEX idx_images_uploaded_by ON images(uploaded_by);
CREATE INDEX idx_images_created_at ON images(created_at);
CREATE INDEX idx_images_tags ON images USING GIN(tags);
```

### 3.2 Data Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant ImageService
    participant StorageService
    participant Database
    participant CDN

    Client->>API: Upload Image(s)
    API->>ImageService: Process Upload
    ImageService->>StorageService: Store Original
    StorageService->>CDN: Upload File
    ImageService->>ImageService: Generate Thumbnail
    ImageService->>StorageService: Store Thumbnail
    ImageService->>Database: Save Metadata
    Database-->>ImageService: Return Image Record
    ImageService-->>API: Return Image Data
    API-->>Client: Upload Success Response
```

## 4. API Design

### 4.1 Endpoints

**Authentication Endpoints:**
```
POST /api/auth/login
Request: { email: string, password: string }
Response: { token: string, user: User, expiresIn: number }
Authentication: None

POST /api/auth/register
Request: { email: string, password: string, firstName: string, lastName: string }
Response: { message: string, user: User }
Authentication: None

POST /api/auth/refresh
Request: { refreshToken: string }
Response: { token: string, expiresIn: number }
Authentication: Bearer Token
```

**Image Management Endpoints:**
```
POST /api/images/upload
Request: FormData with files[] and metadata
Response: { images: Image[], uploadCount: number }
Authentication: Bearer Token

GET /api/images
Query: ?page=1&limit=20&category=uuid&tags=tag1,tag2
Response: { images: Image[], total: number, page: number }
Authentication: Bearer Token

PUT /api/images/:id
Request: { categoryId?: string, tags?: string[], altText?: string }
Response: { image: Image }
Authentication: Bearer Token

DELETE /api/images/:id
Response: { message: string }
Authentication: Bearer Token

POST /api/images/bulk-update
Request: { imageIds: string[], updates: Partial<ImageMetadata> }
Response: { updatedCount: number }
Authentication: Bearer Token

DELETE /api/images/bulk-delete
Request: { imageIds: string[] }
Response: { deletedCount: number }
Authentication: Bearer Token
```

**Category Management Endpoints:**
```
GET /api/categories
Response: { categories: Category[] }
Authentication: Bearer Token

POST /api/categories
Request: { name: string, description?: string, color?: string }
Response: { category: Category }
Authentication: Bearer Token

PUT /api/categories/:id
Request: { name?: string, description?: string, color?: string }
Response: { category: Category }
Authentication: Bearer Token

DELETE /api/categories/:id
Response: { message: string }
Authentication: Bearer Token
```

### 4.2 API Patterns

**RESTful Conventions:**
- Use HTTP status codes appropriately (200, 201, 400, 401, 404, 500)
- Consistent URL naming (nouns, not verbs)
- Proper HTTP methods (GET, POST, PUT, DELETE)
- Pagination for list endpoints
- Filtering and sorting support

**Response Format:**
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: ValidationError[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

## 5. Security Design

### 5.1 Authentication Strategy

**JWT-based Authentication:**
- Access tokens (15-minute expiry)
- Refresh tokens (7-day expiry)
- Token storage in HTTP-only cookies
- Token rotation on refresh

```typescript
interface JWTPayload {
  sub: string; // user ID
  email: string;
  role: string;
  iat: number;
  exp: number;
}
```

### 5.2 Authorization

**Role-Based Access Control:**
```typescript
enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user'
}

// Permissions matrix
const permissions = {
  [UserRole.ADMIN]: ['*'], // All permissions
  [UserRole.MODERATOR]: ['images:read', 'images:create', 'images:update', 'images:delete', 'categories:*'],
  [UserRole.USER]: ['images:read', 'images:create', 'images:update:own', 'images:delete:own']
};
```

### 5.3 Data Protection

**Security Measures:**
- File type validation (whitelist approach)
- File size limits (configurable per user role)
- Image scanning for malicious content
- SQL injection prevention with parameterized queries
- XSS protection with content sanitization
- CSRF protection with tokens
- Rate limiting per endpoint
- Input validation with Joi/class-validator

**File Upload Security:**
```typescript
const uploadConfig = {
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 20,
  virusScan: true,
  generateUniqueNames: true
};
```

## 6. Integration Points

### 6.1 External Services

**Cloud Storage Integration:**
```typescript
interface StorageProvider {
  uploadFile(file: Buffer, path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  generatePresignedUrl(path: string, expiry: number): Promise<string>;
}

// AWS S3 Implementation
class S3StorageService implements StorageProvider {
  private s3Client: AWS.S3;
  // Implementation details...
}
```

**Email Service Integration:**
- Welcome emails for new users
- Password reset notifications
- Bulk operation completion notifications

**CDN Integration:**
- Automatic image optimization
- Global content delivery
- Bandwidth optimization

### 6.2 Internal Integrations

**Service Communication:**
- Event-driven architecture for decoupled services
- Message queues for async operations (Bull/Redis)
- Webhooks for external system notifications

## 7. Performance Considerations

### 7.1 Optimization Strategies

**Caching Strategy:**
```typescript
// Redis caching layers
const cacheConfig = {
  userSessions: { ttl: 3600 }, // 1 hour
  imageMetadata: { ttl: 1800 }, // 30 minutes
  categories: { ttl: 3600 * 24 }, // 24 hours
  thumbnails: { ttl: 3600 * 24 * 7 } // 7 days
};
```

**Database Optimization:**
- Indexed queries for common search patterns
- Connection pooling (max 20 connections)
- Query result caching
- Lazy loading for related entities

**Frontend Optimization:**
- Virtual scrolling for large image lists
- Progressive image loading
- Image lazy loading with intersection observer
- Bundle splitting and code splitting
- Service worker for offline capabilities

### 7.2 Scalability

**Horizontal Scaling:**
- Stateless application servers
- Load balancer (NGINX/AWS ALB)
- Database read replicas
- CDN for static assets

**Auto-scaling Configuration:**
```yaml
# Kubernetes HPA example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: image-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: image-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 8. Error Handling and Logging

### 8.1 Error Handling Strategy

**Error Classification:**
```typescript
enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

class AppError extends Error {
  public statusCode: number;
  public type: ErrorType;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, type: ErrorType) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = true;
  }
}
```

**Global Error Handler:**
```typescript
const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      type: error.type
    });
  }

  // Log unexpected errors
  logger.error('Unexpected error:', error);
  
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};
```

### 8.2 Logging and Monitoring

**Logging Strategy:**
```typescript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});
```

**Monitoring Metrics:**
- Request duration and throughput
- Error rates by endpoint
- File upload success/failure rates
- Database query performance
- Memory and CPU usage
- Storage usage and costs

## 9. Development Workflow

### 9.1 Project Structure

```
team7/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── image-upload/
│   │   │   ├── image-gallery/
│   │   │   └── category-manager/
│   │   ├── services/
│   │   ├── models/
│   │   ├── guards/
│   │   └── shared/
│   ├── assets/
│   └── environments/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └─�� config/
│   ├── tests/
│   └── uploads/
├── docker-compose.yml
├── Dockerfile
└── README.md
```

### 9.2 Development Environment

**Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/imagedb
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1

# Email
SENDGRID_API_KEY=your-sendgrid-key

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:4200
```

### 9.3 Testing Strategy

**Testing Pyramid:**
```typescript
// Unit Tests (70%)
describe('ImageService', () => {
  it('should upload image successfully', async () => {
    const mockFile = createMockFile();
    const result = await imageService.uploadImage(mockFile, metadata);
    expect(result).toBeDefined();
    expect(result.id).toBeTruthy();
  });
});

// Integration Tests (20%)
describe('Image API', () => {
  it('should handle file upload endpoint', async () => {
    const response = await request(app)
      .post('/api/images/upload')
      .attach('files', 'test-image.jpg')
      .expect(201);
    
    expect(response.body.images).toHaveLength(1);
  });
});

// E2E Tests (10%)
describe('Image Upload Flow', () => {
  it('should allow user to upload and view images', async () => {
    await page.goto('/upload');
    await page.setInputFiles('input[type="file"]', 'test-image.jpg');
    await page.click('[data-testid="upload-button"]');
    await expect(page.locator('[data-testid="image-card"]')).toBeVisible();
  });
});
```

**Test Coverage Goals:**
- Unit tests: 80% code coverage
- Integration tests: 70% endpoint coverage
- E2E tests: Critical user flows

## 10. Deployment Architecture

### 10.1 Deployment Strategy

**CI/CD Pipeline:**
```yaml
# GitHub Actions example
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker image
        run: docker build -t image-app:${{ github.sha }} .
      - name: Push to registry
        run: docker push image-app:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: kubectl set image deployment/image-app app=image-app:${{ github.sha }}
```

### 10.2 Infrastructure

**Container Configuration:**
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**Kubernetes Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: image-service
  template:
    metadata:
      labels:
        app: image-service
    spec:
      containers:
      - name: app
        image: image-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

**Infrastructure Components:**
- **Frontend**: Deployed on Vercel/Netlify with CDN
- **Backend**: Kubernetes cluster on AWS EKS/Google GKE
- **Database**: Managed PostgreSQL (AWS RDS/Google Cloud SQL)
- **Cache**: Managed Redis (AWS ElastiCache/Google Memorystore)
- **Storage**: AWS S3/Google Cloud Storage with CDN
- **Monitoring**: DataDog/New Relic/Prometheus + Grafana

This design specification provides a solid foundation for building a scalable, secure, and maintainable image management system with drag-and-drop functionality. The architecture supports the current CSS styling requirements while providing room for future enhancements and scaling.