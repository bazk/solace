#!/bin/bash

database="solace"
user="solace"

read -s -p "Password (leave empty for random): " password
echo

if [ -z "${password}" ]; then
    password=$(tr -dc _A-Z-a-z-0-9 < /dev/urandom | head -c16)
else
    read -s -p "Repeat Password: " repeat
    echo

    if [ "$password" != "${repeat}" ]; then
        echo "Passwords doesn't match!"
        exit 1
    fi
fi

echo "Creating role and database..."
psql -c "CREATE ROLE ${user} WITH LOGIN ENCRYPTED PASSWORD '${password}';"
psql -c "CREATE DATABASE ${database} WITH OWNER ${user};"

psql "${database}" -c "CREATE EXTENSION IF NOT EXISTS plpgsql;"
psql "${database}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql "${database}" -c "CREATE EXTENSION IF NOT EXISTS citext;"

for sql in create/*.sql; do
    psql -U "${user}" "${database}" -f "$sql"
done

echo "Done."
echo
echo "Database: ${database}"
echo "User: ${user}"
echo "Password: ${password}"