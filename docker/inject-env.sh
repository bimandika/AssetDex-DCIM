#!/bin/sh

# Environment variable injection script for React app
# This script replaces environment variables in the built React app at runtime

set -e

# Define the main JS file pattern
MAIN_JS_FILE=$(find /usr/share/nginx/html/assets -name "*.js" -type f | head -1)

if [ -z "$MAIN_JS_FILE" ]; then
    echo "Warning: Could not find main JS file to inject environment variables"
    exit 0
fi

echo "Injecting environment variables into: $MAIN_JS_FILE"

# Replace placeholder values with actual environment variables
if [ -n "$SUPABASE_URL" ]; then
    sed -i "s|https://itsfttssdecjuyxrqgro.supabase.co|$SUPABASE_URL|g" $MAIN_JS_FILE
    echo "✓ Injected SUPABASE_URL: $SUPABASE_URL"
fi

if [ -n "$SUPABASE_ANON_KEY" ]; then
    sed -i "s|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0c2Z0dHNzZGVjanV5eHJxZ3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MDkzODMsImV4cCI6MjA2NzI4NTM4M30.fROnRK8cKr7JXRRBAyIWlbpitvsfYGrVw_bN_DSW5Vk|$SUPABASE_ANON_KEY|g" $MAIN_JS_FILE
    echo "✓ Injected SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}..."
fi

echo "Environment variable injection completed successfully!"