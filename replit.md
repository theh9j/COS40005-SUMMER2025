# Medical Case Study Platform

## Overview

This is a medical education platform designed for collaborative case-based learning. Students can annotate medical images using various drawing tools while receiving real-time feedback from instructors. The platform features role-based dashboards for students and instructors, progress tracking, and collaborative learning tools. Built with React, TypeScript, Express, and designed to work with PostgreSQL through Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server with hot module replacement
- Wouter for lightweight client-side routing with role-based navigation guards

**State Management**
- TanStack Query (React Query) for server state management and caching
- React Context API for authentication state
- Local state management with React hooks for component-level state

**UI & Styling**
- shadcn/ui component library built on Radix UI primitives for accessible components
- Tailwind CSS with CSS custom properties for theming and responsive design
- CSS variable-based theming system supporting light/dark modes

**Key Frontend Features**
- Canvas-based annotation system supporting multiple drawing tools (rectangle, circle, polygon, freehand)
- Real-time collaboration features including chat and shared annotation sessions
- Role-specific dashboards with different capabilities for students and instructors
- Progress tracking with data visualization using Recharts

### Backend Architecture

**Server Framework**
- Express.js server with TypeScript
- Development mode integrates Vite middleware for seamless full-stack development
- Production mode serves pre-built static assets

**API Design**
- RESTful API structure with `/api` prefix for all backend routes
- Centralized error handling middleware with structured error responses
- Request/response logging for API monitoring

**Data Layer**
- Abstracted storage interface (`IStorage`) allowing swappable implementations
- In-memory storage (`MemStorage`) for development and testing
- Designed to work with Drizzle ORM for production database operations

### Database Architecture

**ORM & Schema**
- Drizzle ORM configured for PostgreSQL dialect
- Type-safe database queries with Drizzle and Zod validation
- Migration system managed through Drizzle Kit

**Core Database Tables**
- `users`: User accounts with role-based access (student/instructor)
- `medical_cases`: Medical case studies with metadata and image references
- `annotations`: Student annotations with geometric data stored as JSONB
- `feedback`: Instructor feedback linked to student annotations with categorized types
- `sessions`: Collaborative session management with participant tracking

**Data Types**
- Annotation types: rectangle, circle, polygon, freehand
- Feedback types: correction, suggestion, praise
- User roles: student, instructor

### Authentication & Authorization

**Authentication System**
- Context-based authentication using React Context API
- Local storage persistence for user sessions
- Currently implements mock authentication (development phase)

**Authorization Model**
- Role-based access control (RBAC) with student and instructor roles
- Protected routes with automatic redirection for unauthorized access
- Different permission levels for data access and feature availability

### Additional Backend Services

**Python/FastAPI Service** (Supplementary)
- FastAPI-based authentication service for alternative backend
- MongoDB integration using Motor (async driver)
- JWT-based token authentication with bcrypt password hashing
- CORS-enabled for cross-origin requests from React frontend

## External Dependencies

### Core Infrastructure
- **Neon Database (@neondatabase/serverless)**: Serverless PostgreSQL database provider
- **Drizzle ORM**: Type-safe ORM for database operations with PostgreSQL support
- **Express.js**: Node.js web application framework for API server

### Frontend Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
- **TanStack Query**: Powerful async state management for data fetching and caching
- **Wouter**: Minimalist client-side router (2KB alternative to React Router)
- **Recharts**: Composable charting library for data visualization
- **React Hook Form**: Performant form validation library
- **Zod**: TypeScript-first schema validation

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Re-usable component collection built on Radix UI
- **class-variance-authority**: Utility for managing CSS class variants
- **Embla Carousel**: Lightweight carousel library

### Development Tools
- **Vite**: Next-generation frontend build tool
- **TypeScript**: Static type checking
- **ESBuild**: Fast JavaScript bundler for server-side code
- **tsx**: TypeScript execution environment for Node.js

### Authentication & Security (Python Service)
- **FastAPI**: Modern Python web framework for building APIs
- **Motor**: Async MongoDB driver for Python
- **Passlib**: Password hashing library with bcrypt support
- **Python-JOSE**: JavaScript Object Signing and Encryption for JWT tokens
- **Python-Decouple**: Environment variable management

### Session Management
- **connect-pg-simple**: PostgreSQL session store for Express sessions