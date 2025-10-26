DOCKER_COMPOSE = docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ./.env

up:
	$(DOCKER_COMPOSE) up --build -d

down:
	$(DOCKER_COMPOSE) down

down-v:
	$(DOCKER_COMPOSE) down -v

clean:
	$(DOCKER_COMPOSE) down -v --rmi all
