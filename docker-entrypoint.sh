#!/bin/sh
# Aplica las migraciones y arranca la app (ADR-0006).
set -e
node scripts/migrar.js
exec node build
