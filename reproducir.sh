#!/usr/bin/env bash
# ==============================================================================
# reproducir.sh - Script de Reproducción Completa desde Cero (Punto 4 del Reto)
# ==============================================================================
# Resuelve:
# 1. Destruye toda la infraestructura (incluyendo base de datos y registro).
# 2. Crea primero el Artifact Registry mediante targeted apply.
# 3. Compila y sube las imágenes Docker al registro recién creado.
# 4. Aplica el resto de la infraestructura (Firestore, IAM, Cloud Run).
# ==============================================================================
# > NOTA: el script tarda más de 5 minutos en espera de que acabe el cooldown de firestore
# para generar la misma BD con el mismo nombre. Para el ejercicio de esta práctica lo dejamos así,
# aunque lo correcto sería generar un nombre de BD distinto cada reconstrucción para
# no tener que sufrir este cooldown de google.

set -euo pipefail

DIR_RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR_RAIZ"

echo "===================================================================="
echo " PASO 1: Destruyendo toda la infraestructura existente"
echo "===================================================================="
cd "$DIR_RAIZ/infra"
terraform destroy -auto-approve

echo ""
echo "===================================================================="
echo " PASO 2: Creando el registro de artefactos (Artifact Registry)"
echo "===================================================================="
terraform apply -target=google_artifact_registry_repository.imagenes -auto-approve

REGISTRO="$(terraform output -raw ruta_registro)"
echo "-> Registro creado exitosamente: $REGISTRO"

echo ""
echo "===================================================================="
echo " PASO 3: Construyendo y subiendo las imágenes Docker (v2)"
echo "===================================================================="
cd "$DIR_RAIZ"
echo "-> Subiendo backend:v2..."
gcloud builds submit backend --tag "${REGISTRO}/backend:v2"

echo "-> Subiendo frontend:v2..."
gcloud builds submit frontend --tag "${REGISTRO}/frontend:v2"

echo ""
echo "===================================================================="
echo " PASO 4: Levantando la infraestructura completa (Firestore, Cloud Run)"
echo "===================================================================="
cd "$DIR_RAIZ/infra"

echo "IMPORTANTE, para crear la misma base de datos en firestore con mismo nombre, google indica que"
echo "esperemos 5 minutos (300 segundos), si la intentamos crear antes, nos tira error." 
echo "Esperando: 5 minutos (300 segundos)"
sleep 300
echo "Ya pasaron los 5 minutos, intentando crear la infraestructura..."

terraform apply -auto-approve

echo ""
echo "===================================================================="
echo " VERIFICACIÓN FINAL: Estado de los servicios desplegados"
echo "===================================================================="
URL_FRONTEND="$(terraform output -raw url_frontend)"
URL_BACKEND="$(terraform output -raw url_backend)"

echo "URL Frontend: $URL_FRONTEND"
echo "URL Backend:  $URL_BACKEND"
echo ""
echo "Comprobando endpoint de salud del backend..."
curl -s -f "$URL_BACKEND/" && echo " -> Backend responde OK"
echo ""
echo "Reproducción completa desde cero finalizada exitosamente"
