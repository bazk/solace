#!/bin/bash

if [ $# -ne 3 ]; then
    echo -e "Usage:\n\t$0 username password email"
    exit 1
fi

username=$1
password=$2
email=$3

psql -U solace solace -c "INSERT INTO users (username, password, email) VALUES ('$username', crypt('$password', gen_salt('bf')), '$email');"