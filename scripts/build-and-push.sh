#!/bin/bash
# ============================================
# Build & Push Docker Images to Docker Hub
# ============================================

# 🚀 1. Ambil Unique Tag
if [ -z "$1" ]; then
    echo "❌ ERROR: Unique Tag harus diberikan sebagai argumen pertama dari CI/CD."
    exit 1
fi
UNIQUE_TAG=$1

# 🚀 2. Konfigurasi
USERNAME="rahvanna"

SERVICES=("auth-service" "user-service" "tracking-service" "log-service" "ai-service" "delivery-service" "kitchen-service" "menu-service" "notification-service" "reporting-service" "school-service")

for SERVICE in "${SERVICES[@]}"; do
    # Gunakan TAG UNIK
    UNIQUE_IMAGE_TAG="$USERNAME/$SERVICE:$UNIQUE_TAG"
    
    # Gunakan TAG STANDAR (untuk alias 'latest')
    LATEST_IMAGE_TAG="$USERNAME/$SERVICE:latest" 
    
    CONTEXT_DIR="./packages/$SERVICE"

    if [ ! -d "$CONTEXT_DIR" ]; then
        echo "❌ Directory $CONTEXT_DIR tidak ditemukan: $CONTEXT_DIR. Lewati..."
        continue
    fi

    echo "============================================"
    echo "📦 Building image untuk $SERVICE dengan tag: $UNIQUE_TAG"
    echo "============================================"

    # 1. BUILD menggunakan tag UNIK
    docker build -t $UNIQUE_IMAGE_TAG $CONTEXT_DIR
    if [ $? -ne 0 ]; then
        echo "❌ Build gagal untuk $SERVICE"
        exit 1
    fi

    # 2. Tambahkan tag :latest sebagai alias
    docker tag $UNIQUE_IMAGE_TAG $LATEST_IMAGE_TAG
    
    echo "🚀 Push image unik ke registry: $UNIQUE_IMAGE_TAG"
    docker push $UNIQUE_IMAGE_TAG
    if [ $? -ne 0 ]; then
        echo "❌ Push gagal untuk $SERVICE (Unique Tag)"
        exit 1
    fi
    
    echo "🚀 Push image latest ke registry: $LATEST_IMAGE_TAG"
    docker push $LATEST_IMAGE_TAG
    if [ $? -ne 0 ]; then
        echo "❌ Push gagal untuk $SERVICE (Latest Tag)"
        exit 1
    fi
done

echo "✅ Semua service berhasil di-build dan di-push ke Docker Hub!"
echo "➡️ Deployment akan menggunakan tag '$UNIQUE_TAG'."