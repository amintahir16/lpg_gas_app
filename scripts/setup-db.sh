#!/bin/bash

# Database setup script for LPG Gas App
echo "Setting up database for LPG Gas App..."

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    echo "PostgreSQL is not running. Starting it..."
    sudo systemctl start postgresql
fi

# Create database if it doesn't exist
echo "Creating database lpg_gas_app..."
sudo -u postgres psql -c "CREATE DATABASE lpg_gas_app;" 2>/dev/null || echo "Database already exists"

# Create user if it doesn't exist
echo "Creating user lpg_user..."
sudo -u postgres psql -c "CREATE USER lpg_user WITH PASSWORD 'StrongPasswordHere';" 2>/dev/null || echo "User already exists"

# Grant privileges
echo "Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE lpg_gas_app TO lpg_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE lpg_gas_app TO postgres;"

echo "Database setup complete!"
echo "You can now run: npx prisma db push" 