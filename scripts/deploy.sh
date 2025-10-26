#!/bin/bash
set -e

NAMESPACE="microservices"
REGISTRY="registry.digitalocean.com/myapp"
SERVICES=("auth-service" "user-service" "tracking-service")

echo "🔹 Building and pushing Docker images..."
for SERVICE in "${SERVICES[@]}"; do
  echo "➡️  Building $SERVICE..."
  docker build -t $REGISTRY/$service:latest  -f packages/$SERVICE/Dockerfile .
  docker push $REGISTRY/$service:latest 
done

echo "🔹 Applying Kubernetes manifests..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/redis.yaml

for SERVICE in "${SERVICES[@]}"; do
  kubectl apply -f k8s/$SERVICE.yaml
done

kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

echo "✅ Deployment complete!"
