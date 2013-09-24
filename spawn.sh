#!/bin/bash

if [ $# -lt 1 ]; then
    echo -e "Usage:\n\t$0 [LIST OF PORTS]\n" >&2
    exit 1
fi

mkdir -p logs
mkdir -p pids

for port in $*; do
    node server.js ${port} > logs/server-${port}.log 2>&1 &
    echo $! > pids/server-${port}.pid
done

exit 0
