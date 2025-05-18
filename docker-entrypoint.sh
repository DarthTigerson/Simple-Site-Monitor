#!/bin/bash
set -e

# Check if config.json exists, if not copy from sample
if [ ! -f /app/data/config.json ]; then
  echo "Config file not found, creating from sample..."
  cp /app/data/config_sample.json /app/data/config.json
  echo "Created new config.json from sample"
fi

# Execute the original command (keeps the CMD from Dockerfile)
exec "$@" 