# Medical Case Study Platform

## Overview

This is a medical education platform designed for collaborative medical case studies. The application enables students to annotate medical images and receive feedback from instructors in real-time. It provides role-based dashboards, canvas-based annotation tools, version control, real-time presence tracking, and discussion threads for collaborative learning.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tooling**
- React with TypeScript, built using Vite for fast development and optimized production builds
- Hot Module Replacement (HMR) configured for development environment with WebSocket support for Replit deployment

**Routing & Navigation**
- Wouter for lightweight client-side routing
- Role-based route protection to ensure students and instructors access appropriate dashboards
- Automatic redirection based on user authentication status and role verification

**State Management**
- TanStack Query (React Query) for server state management with custom query client configuration
- React hooks (useState, useEffect, useContext) for local component state
- Context API for global authentication state via AuthProvider

**UI Component Library**
- Radix UI primitives for accessible, unstyled components (dialogs, dropdowns, tooltips, etc.)
- shadcn/ui component patterns built on top of Radix UI
- Tailwind CSS for styling with CSS custom properties for theming
- Class Variance Authority (CVA) for component variant management

**Canvas-based Annotation System**
- Custom annotation hook (useAnnotation) managing drawing state, tool selection, and history
- Support for multiple annotation types: rectangle, circle, polygon, freehand, text
- Real-time canvas rendering with coordinate tracking relative to image bounds
- Undo/redo functionality with history stack management
- Multi-selection, drag-and-drop, and resize capabilities for annotations

**Collaborative Features**
- Version control system tracking annotation changes over time
- Presence tracking showing which users are currently viewing cases
- Peer comparison mode for overlaying multiple users' annotations
- Discussion threads with nested replies for case-specific conversations
- Real-time chat panel for instant communication

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for REST API endpoints
- All backend routes prefixed with `/api` for clear separation from frontend routes
- Custom middleware for request logging with duration tracking and response capture

**Development Setup**
- Vite middleware integration for seamless HMR during development
- Environment-aware configuration (NODE_ENV) for development vs production behavior
- Replit-specific plugins for error overlays and development banners

**Authentication System**
- JWT-based authentication with token storage in localStorage
- Session persistence with automatic token refresh on mount
- Role-based access control (student, instructor, admin)
- Instructor approval workflow with verification status tracking

**API Design**
- RESTful endpoint structure for CRUD operations
- Centralized error handling middleware with structured error responses
- Credential-based requests for session management
- Type-safe request/response handling with TypeScript interfaces

### Database Design

**ORM & Migration Strategy**
- Drizzle ORM with PostgreSQL dialect for type-safe database queries
- Drizzle Kit for schema migrations stored in `/migrations` directory
- Schema definitions in shared TypeScript files for frontend/backend type sharing
- UUID primary keys generated via PostgreSQL's `gen_random_uuid()`

**Schema Structure**

Users Table:
- Role-based user system (student, instructor, admin)
- Password hashing for secure authentication
- Approval status field for instructor verification workflow
- Timestamp tracking for account creation

Medical Cases Table:
- Case metadata (title, description, category)
- Image URL references for medical imagery
- Creator tracking via foreign key to users table
- Category classification (Neurology, Pulmonology, Cardiology, etc.)

Annotations Table:
- Polymorphic type field supporting multiple annotation shapes
- JSONB storage for flexible coordinate data structures
- Color and label properties for visual customization
- Version tracking for annotation history
- User ownership via foreign key relationship

Feedback Table:
- Instructor-to-student feedback mechanism
- Reference to specific annotations being reviewed
- Typed feedback categories (correction, suggestion, praise)
- Timestamp tracking for feedback chronology

Sessions Table:
- Collaborative session management
- Real-time presence tracking infrastructure
- Support for shared annotation sessions

**Data Relationships**
- One-to-many: Users to MedicalCases (creator relationship)
- One-to-many: Users to Annotations (annotator relationship)
- One-to-many: MedicalCases to Annotations (case annotations)
- Many-to-many: Feedback linking instructors, students, and annotations

### Storage Abstraction Layer

**Interface Design**
- IStorage interface defining CRUD operations for data access
- MemStorage implementation providing in-memory storage for development
- Designed for easy swap to database-backed storage (Drizzle ORM integration ready)
- Type-safe methods matching shared schema definitions

**Migration Path**
- Current: In-memory storage using JavaScript Maps
- Future: Database-backed storage via Drizzle ORM with connection pooling
- Storage interface remains unchanged, only implementation swaps

### Deployment Configuration

**Replit-specific Setup**
- Vite server configured for 0.0.0.0:5000 with strict port enforcement
- HMR WebSocket protocol (wss) on port 443 for Replit proxy compatibility
- File system security with strict mode and dot-file denial
- Autoscale deployment with separate build and production commands

**Build Process**
- Frontend: Vite builds React application to `dist/public`
- Backend: esbuild bundles server code to `dist/index.js` with ESM format
- Cross-env ensures consistent environment variables across platforms

## External Dependencies

### Core Framework Dependencies
- **React 18**: UI framework with hooks and concurrent features
- **Express.js**: Node.js web server framework for REST API
- **TypeScript**: Static typing for improved developer experience and code safety
- **Vite**: Build tool and development server with fast HMR

### Database & ORM
- **Drizzle ORM**: Type-safe SQL query builder with migration support
- **@neondatabase/serverless**: PostgreSQL driver for Neon serverless database
- **drizzle-zod**: Integration between Drizzle schemas and Zod validation
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI Component Libraries
- **Radix UI**: Headless UI component primitives (30+ component packages)
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **class-variance-authority**: Component variant utilities
- **clsx & tailwind-merge**: Utility for merging Tailwind classes

### State Management & Data Fetching
- **TanStack Query**: Server state management with caching and synchronization
- **Wouter**: Lightweight routing library (~1.5KB)

### Form Handling & Validation
- **React Hook Form**: Performant form state management
- **@hookform/resolvers**: Integration with validation libraries
- **Zod**: TypeScript-first schema validation

### Authentication
- **jwt-decode**: JWT token parsing on the client
- **bcrypt** (implied): Password hashing for secure storage

### Development Tools
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast JavaScript bundler for production builds
- **cross-env**: Cross-platform environment variable setting
- **@replit/vite-plugin-***: Replit-specific development plugins

### Utilities
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation
- **embla-carousel-react**: Carousel component functionality

### External Services
- **Neon Database**: Serverless PostgreSQL hosting (via DATABASE_URL environment variable)
- **Image Storage**: URLs stored in database (external CDN or storage service implied)