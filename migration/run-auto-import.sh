#!/bin/bash
# LUMENGRID — Script de import automático
# Chamado pelo LaunchAgent diariamente às 7h

cd "$(dirname "$0")"
/usr/local/bin/node auto-import.mjs >> ../BACKUPS/import.log 2>&1
