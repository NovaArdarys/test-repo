    Kubernetes manifests for production-ready setup (testing single-node as well)

Deploy order (recommended):
1. Ensure cluster has enough nodes/resources.
2. Install Ingress-NGINX, Metrics Server, Cert-Manager (bootstrap script can install these).
3. Create namespace and real secrets (or use ExternalSecrets).
4. Apply stateful resources (Redis & RabbitMQ).
5. Apply Deployments + Services (auth/user/tracking).
6. Apply Ingress + HPA + NetworkPolicy + PDBs.

Example commands:
kubectl apply -f 00-namespace-configs.yaml
kubectl apply -f 10-redis-statefulset.yaml
kubectl apply -f 11-rabbitmq-statefulset.yaml
kubectl apply -f 20-auth-deployment.yaml
kubectl apply -f 21-user-deployment.yaml
kubectl apply -f 22-tracking-deployment.yaml
kubectl apply -f 30-ingress.yaml
kubectl apply -f 40-hpa.yaml
kubectl apply -f 50-imagepull-sa.yaml
kubectl apply -f 60-networkpolicy.yaml
kubectl apply -f 70-pdbs.yaml

Notes:
- Replace image placeholders with your registry images.
- Create secrets with kubectl or ExternalSecrets operator.
- For production, consider managed Redis/RabbitMQ for HA.

References:
- Ingress NGINX: https://kubernetes.github.io/ingress-nginx/
- Cert-Manager: https://cert-manager.io/docs/
- Metrics Server: https://github.com/kubernetes-sigs/metrics-server
- HPA docs: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
