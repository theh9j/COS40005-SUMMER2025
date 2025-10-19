# Medical Imaging Platform

## Overview

This is a medical imaging platform for educational purposes, allowing students to annotate real medical cases and collaborate with instructors and peers. The platform features a comprehensive annotation system with support for multiple annotation types including rectangles, circles, polygons, freehand drawing, and text annotations with bounding boxes.

**Current State:** Development environment fully configured in Replit with text annotation feature implemented and tested.

## Recent Changes (October 19, 2025)

### Text Annotation Feature Implementation
- Extended database schema to support "text" annotation type
- Implemented text box annotation feature with click-and-drag to create bounding box
- Added inline text editor that appears within the drawn box
- Fixed boundary clamping to use actual image dimensions instead of hardcoded values
- Resolved naming collision between local and hook setImageBounds functions
- Text annotations now properly constrained to image boundaries

### Replit Environment Configuration
- Installed Node.js 20 and project dependencies (React, Vite, Tailwind CSS, etc.)
- Configured frontend workflow on port 5000 with proper host settings
- Updated Vite configuration to allow all hosts for Replit's proxied iframe environment
- Fixed HMR (Hot Module Replacement) websocket connection using REPLIT_DOMAINS environment variable
- Set up in-memory storage (MemStorage) for development (no PostgreSQL database required)

## Project Architecture

### Tech Stack
- **Frontend:** React 18 with TypeScript, Vite bundler
- **Styling:** Tailwind CSS with custom medical imaging theme
- **Storage:** In-memory storage for development (MemStorage implementation)
- **UI Components:** Radix UI primitives with custom styling

### Directory Structure
```
my-react-app/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components (AnnotationCanvas, InlineTextEditor, etc.)
│   │   ├── hooks/         # Custom hooks (use-annotation.tsx)
│   │   ├── lib/           # Utilities and mock data
│   │   └── pages/         # Page components
├── shared/                # Shared TypeScript types and schemas
│   └── schema.ts         # Annotation and AnnotationVersion types
├── vite.config.ts        # Vite configuration with Replit optimizations
└── package.json          # Dependencies and scripts
```

### Key Features

#### Annotation System
The annotation system supports the following tools:
1. **Select Tool** - Select, move, and resize existing annotations
2. **Rectangle Tool** - Draw rectangular annotations
3. **Circle Tool** - Draw circular annotations  
4. **Polygon Tool** - Draw multi-point polygon annotations
5. **Freehand Tool** - Draw freehand paths
6. **Text Tool** - Create text annotations with bounding boxes (NEW)

#### Text Annotation Implementation Details
- User drags to create a bounding box (like rectangle tool)
- Box is automatically clamped to actual image dimensions
- Inline text editor appears within the box boundaries
- Text is wrapped to fit within the box dimensions
- Stored annotations include width/height for proper hit-testing
- Selection and manipulation work using stored dimensions

### Technical Decisions

#### Image Boundary Management
- AnnotationCanvas tracks actual rendered image dimensions using ResizeObserver
- Image bounds are passed to the annotation hook via setImageBounds callback
- All text box coordinates are clamped to real image bounds (not hardcoded values)
- This ensures text annotations work correctly for any image size

#### Vite HMR Configuration
- Uses `REPLIT_DOMAINS` environment variable for websocket host
- Configured with `protocol: "wss"` and `clientPort: 443` for Replit proxy
- Conditional HMR configuration allows local development fallback

## Development Workflow

### Running the Application
The frontend is configured to run automatically via the "Frontend" workflow:
```bash
cd my-react-app && npm run frontend
```
This starts the Vite dev server on port 5000 with HMR enabled.

### Storage Configuration
The project uses in-memory storage (MemStorage) for development. No database setup is required. All data is stored in memory and resets on server restart.

## User Preferences
(No specific preferences recorded yet)

## Future Considerations
- Production deployment will require persistent storage configuration
- Consider adding database migrations if switching from in-memory to PostgreSQL
- Text annotation feature could be enhanced with font size, style, and color options
