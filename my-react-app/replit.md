# Medical Case Study Platform

## Overview

This is a medical education platform designed for collaborative medical case studies. The application enables students to annotate medical images and receive feedback from instructors in real-time. The platform features role-based access with separate dashboards for students and instructors, supporting interactive learning through image annotation, real-time collaboration, and feedback systems.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### October 19, 2025 - Replit Environment Setup
- Configured project to run in Replit environment
- PostgreSQL database provisioned and migrations applied successfully using Drizzle
- Vite development server configured with proper host settings (0.0.0.0:5000) for Replit proxy
- Deployment configured for autoscale with build and production commands
- Application verified working with all features functional

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **Routing**: Wouter for client-side routing with role-based navigation
- **State Management**: TanStack Query for server state management and React hooks for local state
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with CSS variables for theming support
- **Authentication**: Context-based authentication system with localStorage persistence

### Backend Architecture
- **Server**: Express.js with TypeScript for API endpoints
- **Development Setup**: Vite middleware integration for hot module replacement in development
- **API Structure**: RESTful endpoints with `/api` prefix for all backend routes
- **Storage Interface**: Abstracted storage layer with in-memory implementation (MemStorage) and interface for database integration
- **Error Handling**: Centralized error handling middleware with structured error responses

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Structure**:
  - Users table with role-based access (student/instructor)
  - Medical cases with metadata and image URLs
  - Annotations with geometric data stored as JSON
  - Feedback system linking instructors to student annotations
  - Session management for collaborative features
- **Migration System**: Drizzle Kit for schema migrations and database management

### Key Features
- **Image Annotation System**: Canvas-based annotation tools supporting multiple shapes (rectangle, circle, polygon, freehand)
- **Real-time Collaboration**: Chat system and shared annotation sessions
- **Role-based Dashboards**: Separate interfaces for students and instructors with appropriate functionality
- **Feedback System**: Structured feedback with types (correction, suggestion, praise)
- **Progress Tracking**: Analytics and progress monitoring for student performance

### Authentication & Authorization
- **Role-based Access**: Student and instructor roles with different permission levels
- **Session Management**: Local storage-based authentication with mock user system
- **Route Protection**: Authentication guards on protected routes with automatic redirects

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection for Neon database
- **drizzle-orm & drizzle-kit**: Database ORM and migration tools
- **@tanstack/react-query**: Server state management and caching
- **@hookform/resolvers**: Form validation integration
- **wouter**: Lightweight client-side routing

### UI & Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx & tailwind-merge**: Conditional CSS class utilities

### Development Tools
- **vite**: Build tool and development server
- **@replit/vite-plugin-***: Replit-specific development enhancements
- **tsx**: TypeScript execution for server-side code
- **esbuild**: JavaScript bundler for production builds

### Validation & Data
- **drizzle-zod**: Zod integration for schema validation
- **date-fns**: Date manipulation utilities
- **nanoid**: Unique ID generation

### Session & File Handling
- **connect-pg-simple**: PostgreSQL session store
- **embla-carousel-react**: Image carousel component
- **cmdk**: Command palette component