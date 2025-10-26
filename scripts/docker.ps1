$DOCKER_COMPOSE = "docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ./.env"

param (
    [string]$command
)

switch ($command) {
    "up"    { Invoke-Expression "$DOCKER_COMPOSE up --build -d" }
    "down"  { Invoke-Expression "$DOCKER_COMPOSE down" }
    "down-v" { Invoke-Expression "$DOCKER_COMPOSE down -v" }
    "clean" { Invoke-Expression "$DOCKER_COMPOSE down -v --rmi all" }
    default { Write-Host "Usage: ./docker.ps1 [up|down|down-v|clean]" }
}
