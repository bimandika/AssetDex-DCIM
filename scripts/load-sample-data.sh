#!/bin/bash

# Sample Dashboard Data Installation Script
# This script loads comprehensive sample data for dashboard demonstration

echo "🗄️  Installing Sample Dashboard Data..."
echo ""

# Set default values
DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:password@localhost:5432/postgres"}
SAMPLE_DATA_FILE="dev/sample-dashboard-data.sql"

# Check if sample data file exists
if [ ! -f "$SAMPLE_DATA_FILE" ]; then
    echo "❌ Sample data file not found: $SAMPLE_DATA_FILE"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Load sample data
echo "📊 Loading sample server and dashboard data..."
if psql "$DATABASE_URL" -f "$SAMPLE_DATA_FILE"; then
    echo ""
    echo "✅ Sample data loaded successfully!"
    echo ""
    echo "📈 Sample Data Includes:"
    echo "  • 30+ realistic server records across 4 data centers"
    echo "  • Various server types: Web, Database, Application, Network, Storage"
    echo "  • Multiple environments: Production, Testing, Development, Pre-Production"
    echo "  • Different statuses: Active, Ready, Maintenance, Decommissioned"
    echo "  • 2 pre-configured sample dashboards with widgets"
    echo "  • Timeline data showing recent deployments"
    echo ""
    echo "🎯 Ready to Use:"
    echo "  1. Navigate to Dashboard → Custom Dashboard tab"
    echo "  2. Select 'Server Operations Dashboard' or 'Infrastructure Overview'"
    echo "  3. View real data visualizations and metrics"
    echo "  4. Create new dashboards with the sample data"
    echo ""
    echo "📊 Sample Dashboards Created:"
    echo "  • Server Operations Dashboard - Comprehensive server monitoring"
    echo "  • Infrastructure Overview - Executive-level infrastructure metrics"
    echo ""
else
    echo ""
    echo "❌ Failed to load sample data"
    echo "Please check:"
    echo "  • Database connection: $DATABASE_URL"
    echo "  • Database is running and accessible"
    echo "  • Main migration has been run first"
    exit 1
fi
