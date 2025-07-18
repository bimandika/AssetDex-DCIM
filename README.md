# AssetDex - Datacenter Server Inventory Management

A modern web application for managing datacenter server inventory with user management, role-based access control, and comprehensive server tracking capabilities.

<img width="1816" height="1448" alt="image" src="https://github.com/user-attachments/assets/f270e3cd-91ae-470f-bf74-c8f84bb3f5bf" />


## Features

- 🔐 **User Authentication & Authorization** - Role-based access (Super Admin, Engineer, Viewer)
- 🖥️ **Server Management** - Complete server inventory with specifications
- 🏢 **Datacenter Organization** - Track servers across sites, buildings, floors, and rooms
- 📊 **Dynamic Properties** - Configurable server properties and specifications
- 📈 **Dashboard & Reports** - Visual insights and data export capabilities
- 🔍 **Advanced Search** - Filter and search servers by multiple criteria
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## 🚀 Quick Start (Local & Docker)

### 🛠️ Prerequisites
- Docker & Docker Compose
- (Dev only) Node.js 18+ and npm

### 1️ Clone the Repository
```bash
git clone https://github.com/bimandika/AssetDex-DCIM.git
cd AssetDex-DCIM
```

### 2 Start Supabase Backend
```bash
docker compose -f docker-compose-supabase.yml up -d
```
- Wait until all Supabase services are healthy.
- Stop with:
  ```bash
  docker compose -f docker-compose-supabase.yml down
  ```

### 3 Start Main App (React Frontend)
```bash
docker compose up
```
- The app will be available at [http://localhost:3001](http://localhost:3001)
- Stop with:
  ```bash
  docker compose down
  ```

### 5️⃣ Database Migration (Automatic or Manual)
- 🟢 **Automatic:**
  - The schema will be created by one time running container and then check supabase if the table apprears then its normal, if it not you can running manually
- 🟡 **Manual Fallback:**
  1. Go to your [Supabase Dashboard](http://localhost:8000)
     - 🧑‍💻 **Login Credentials:**
       - Username: `supabase`
       - Password: `admin123456`
  2. Open the SQL Editor
  3. Copy & paste `database/consolidated-migration.sql`
  4. Click "Run"

### 6️⃣ Login
- **Default Admin:**
  - Email: `admin@localhost.com`
  - Password: `admin123456`

> 🚨 **Security Reminder:**
> 
> For your security, please change the default admin password **immediately after setup is complete**. Keeping the default password is a serious security risk!

---

### 📝 Notes
- Run Supabase backend before starting the main app.
- Both stacks can run concurrently (separate terminals).
- To use a different Supabase instance, update `.env`.

### 🐳 Manual Docker Build/Run
```bash
docker build -t AssetDex-DCIM .
docker run -p 3000:80 --env-file .env AssetDex-DCIM
```

---

(Images and the rest of the README remain unchanged)

## Development Setup

If you want to run the application in development mode:

### Prerequisites

- Node.js 18+ and npm
- Docker or Podman

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run the database migration (see step 3 above)

# Start development server
npm run dev
```

The application will be available at [http://localhost:3001](http://localhost:3001).

If you want to using supabase cloud, you can simply change the SUPABASE_URL and SUPABASE_ANON_KEY on client.ts and .env

## Supabase Setup Guide

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization and set project details
4. Wait for the project to be created

### 2. Get Your Credentials

1. Go to your project dashboard
2. Navigate to Settings → API
3. Copy your:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

### 3. Configure Authentication (Optional)

If you want to enable user registration:

1. Go to Authentication → Settings
2. Configure your site URL and redirect URLs
3. Set up any additional authentication providers you want

### 4. Run the Database Migration

Execute the SQL migration file (`database/consolidated-migration.sql`) in your Supabase SQL Editor.

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public key | `eyJ...` |
| `APP_PORT` | Port for the application (Docker) | `3000` |

### Docker Configuration

The application includes several Docker configuration files:

- `Dockerfile` - Multi-stage build for production
- `docker-compose.yml` - Easy orchestration with environment variables
- `nginx.conf` - Optimized Nginx configuration
- `.dockerignore` - Excludes unnecessary files from build

## User Management

### User Roles

The application supports three user roles:

- **Super Admin** - Full access to all features including user management
- **Engineer** - Can view, create, and edit servers and properties
- **Viewer** - Read-only access to server information

### User Sign-up and Approval Flow

1. **New User Registration**
   - New users can sign up through the registration form
   - Upon registration, accounts are created with `status: false` (inactive) by default
   - Users see an informational message that their account is pending admin approval
   - An email notification is sent to administrators about the new registration

2. **Admin Approval Process**
   - Super Admins can view pending user registrations in the User Management section
   - Each pending user has Approve/Reject actions available
   - Approved users receive an email notification that their account has been activated
   - Rejected users are notified via email with an optional reason

3. **Account Activation**
   - Only users with `status: true` can log in to the system
   - Inactive users see a clear message that their account is pending approval
   - Super Admins can deactivate/reactivate accounts at any time

## Database Schema

The application uses the following main tables:

- `profiles` - Extended user information
- `user_roles` - Role-based access control
- `servers` - Server inventory data

## Standardized Server Fields

The server inventory follows a standardized field order across the application (UI, database, and imports/exports):

1. **Serial Number** - Unique identifier for the hardware
2. **Hostname** - Server hostname (required)
3. **Manufacturer** - Hardware manufacturer (e.g., Dell, HPE, Cisco)
4. **Model** - Hardware model (e.g., PowerEdge R740)
5. **IP Address** - Primary IP address
6. **DC Site** - Datacenter location (required)
7. **DC Building** - Building identifier
8. **DC Floor** - Floor number/identifier
9. **DC Room** - Room identifier
10. **Allocation** - Resource allocation type:
    - IAAS (Infrastructure as a Service)
    - PAAS (Platform as a Service)
    - SAAS (Software as a Service)
    - Load Balancer
    - Database
11. **Environment** - Deployment environment:
    - Production
    - Testing
    - Pre-Production
    - Development
12. **Status** - Current operational status:
    - Active
    - Inactive
    - Maintenance
    - Retired
13. **Device Type** - Hardware type (required):
    - Server
    - Storage
    - Network
14. **Notes** - Additional information or comments
- `property_definitions` - Dynamic server properties

## API Documentation

The application uses Supabase's auto-generated API. Key endpoints include:

- `/rest/v1/servers` - Server CRUD operations
- `/rest/v1/profiles` - User profile management
- `/rest/v1/user_roles` - Role management
- `/rest/v1/property_definitions` - Property configuration

All endpoints support filtering, sorting, and pagination via URL parameters.


### Custom Domain and SSL

For production deployments:

1. Configure your domain's DNS to point to your deployment
2. Set up SSL certificates (most cloud platforms handle this automatically)
3. Update your Supabase project's authentication settings with your domain

## Backup and Restore

### Database Backup

Use Supabase's built-in backup features or pg_dump:

```bash
# Using Supabase CLI
supabase db dump --file backup.sql

# Or using pg_dump directly
pg_dump -h your-host -U postgres -d postgres > backup.sql
```

### Restore

```bash
# Using psql
psql -h your-host -U postgres -d postgres < backup.sql
```

## Troubleshooting

### Common Issues

1. **Can't connect to Supabase**
   - Verify your SUPABASE_URL and SUPABASE_ANON_KEY
   - Check that your Supabase project is active

2. **Authentication redirects to localhost**
   - Update your Supabase authentication settings
   - Set the correct site URL and redirect URLs

3. **Database permissions errors**
   - Ensure the database migration was run successfully
   - Check that RLS policies are properly configured

4. **Docker build fails**
   - Ensure you have sufficient disk space
   - Check that all required files are present

### Logs

Check application logs:

```bash
# Docker Compose logs
docker-compose logs -f

# Docker container logs
docker logs container-name
```

### Support

For issues and questions:

1. Check the [Issues](https://github.com/your-repo/datacenter-inventory/issues) page
2. Create a new issue with detailed information
3. Include logs, environment details, and steps to reproduce

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [React](https://reactjs.org/) and [Vite](https://vitejs.dev/)
- UI components by [shadcn/ui](https://ui.shadcn.com/)
- Backend powered by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
