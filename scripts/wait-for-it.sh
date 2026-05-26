#!/usr/bin/env bash

# Usage: wait-for-it.sh host:port [-t timeout] [-- command args]
#   Wait for a TCP connection to be available before executing a command

set -e

host="$1"
port="${1#*:}"
shift

timeout=60

while [ $# -gt 0 ]; do
  case "$1" in
    -t)
      timeout="$2"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

if [ -z "${host//:*}" ]; then
  echo "Error: You need to provide a host:port to test."
  echo "Usage: $0 host:port [-t timeout] [-- command args]"
  exit 1
fi

if ! command -v nc >/dev/null 2>&1; then
  echo "Error: netcat is not installed. Please install it and try again."
  exit 1
fi

start_time=$(date +%s)

until nc -z "$host" "$port"; do
  current_time=$(date +%s)
  elapsed=$((current_time - start_time))
  
  if [ $elapsed -ge $timeout ]; then
    echo "Timeout reached while waiting for $host:$port"
    exit 1
  fi

  sleep 1
done

if [ $# -gt 0 ]; then
  echo "$host:$port is available after $elapsed seconds"
  exec "$@"
else
  echo "$host:$port is available after $elapsed seconds"
fi

# End of script
