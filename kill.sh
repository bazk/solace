#!/bin/bash

if [ $# -lt 1 ]; then
    echo -e "Usage:\n\t$0 [LIST OF PORTS]\n" >&2
    exit 1
fi

for port in $*; do
    pid=$(cat pids/server-${port}.pid)
    kill ${pid}
done

exit 0
