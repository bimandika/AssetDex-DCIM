# AssetDex-DCIM: Datacenter Server Inventory Management System

## Project Overview
AssetDex-DCIM is a comprehensive system designed to manage datacenter server inventories. It provides tools for tracking servers, racks, and properties, with a focus on flexibility and security.

---

## Project Stack
### Frontend
- **React** (with TypeScript)
- **shadcn/ui** component library (built on Radix UI)
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** (@tanstack/react-query) for state management
- **Lucide Icons** for UI elements

### Backend
- **Supabase** (PostgreSQL-based backend as a service)
- **Deno** for serverless functions
- **PostgREST** for API generation

### Database
- **PostgreSQL** with custom schemas, enums, and policies
- **Row-Level Security (RLS)** for access control
- **Custom SQL functions** for dynamic schema and property management

### Orchestration
- **Docker Compose** for local development and deployment
- **Supabase Docker Stack** for backend services
- **Nginx** for serving the frontend

### Other Tools
- **ESLint** for linting
- **PostCSS** for CSS processing
- **Vite** for frontend bundling

---

## Data Schema
### Enums
- `user_role`: `super_admin`, `engineer`, `viewer`
- `device_type`: `Server`, `Storage`, `Network`
- `allocation_type`: `IAAS`, `PAAS`, `SAAS`, etc.
- `environment_type`: `Production`, `Testing`, etc.
- `server_status`: `Active`, `Ready`, `Inactive`, etc.

### Tables
- `profiles`: Extends `auth.users` with additional user details.
- `user_roles`: Maps users to roles.
- `property_definitions`: Defines dynamic server properties.
- `servers`: Stores server inventory details.

### Functions
- `get_enum_values()`: Returns all enum values.
- `get_table_schema()`: Provides schema details for dynamic forms.
- `get_property_definitions_with_schema()`: Database function that combines property definitions with schema details.
- `drop_server_column()`: Safely drops a column from the `servers` table.

### Policies
- RLS policies for fine-grained access control (e.g., engineers can manage servers).

---

## Pages and Components
### Pages
- `Auth.tsx`: Handles user authentication (login/signup).
- `Index.tsx`: Main dashboard with tabs for inventory, rack view, data center view, etc.
- `NotFound.tsx`: 404 error page.

### Components
- `Dashboard.tsx`: Displays an overview of server statuses and utilization.
- `ServerInventory.tsx`: Manages server inventory with search, filters, and pagination.
- `RackView.tsx`: Visualizes server racks.
- `DataCenterView.tsx`: Provides a high-level view of data center racks and servers.
- `Reports.tsx`: Comprehensive reporting interface with analytics and export capabilities.
- `UserManagement.tsx`: Manages user roles and permissions.
- `ServerProperties.tsx`: Handles dynamic server property definitions with support for creating enum-based columns.

### UI Components
- `accordion.tsx`, `alert.tsx`, `dialog.tsx`, etc., for reusable UI elements.

---

## Docker Compose and Supabase
### Docker Compose
- `docker-compose.yml`: Orchestrates the frontend and backend services.
- `docker-compose-supabase.yml`: Sets up Supabase services (auth, storage, database, etc.).
- `docker-compose.s3.yml`: Configures S3-compatible storage (MinIO).

### Supabase
- Provides authentication, storage, and database services.
- Includes custom SQL functions and policies for dynamic schema management.

---

## Functions in `/volumes/functions`
### Admin Functions
- `admin-create-user`: Creates new users.
- `admin-delete-user`: Deletes users.
- `admin-reset-password`: Resets user passwords.
- `admin-update-user`: Updates user information.

### Property Management
- `property-manager`: Handles CRUD operations for property definitions.
- `property-form-manager`: Manages dynamic form generation and property schema integration.

### Utility Functions
- `get-enums`: Fetches enum values.
- `get-table-schema`: Provides table schema details.

---

## Relationships
### Frontend and Backend
- The React frontend communicates with the Supabase backend via REST APIs and serverless functions.

### Database and Functions
- SQL functions dynamically manage schema and properties, enabling a flexible inventory system.

### Docker and Supabase
- Docker Compose orchestrates the Supabase stack, ensuring all services are interconnected.

---

## Acquiring JWT Token
To acquire a JWT token for authentication, use the following `curl` command:

```bash
curl -s -X POST 'http://localhost:8000/auth/v1/token?grant_type=password' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost.com","password":"admin123456"}'
```

This command sends a POST request to the Supabase authentication endpoint with the admin credentials to retrieve a JWT token.


