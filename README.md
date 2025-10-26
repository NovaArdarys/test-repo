```my-microservices/
├── bun.lockb                 # Bun lockfile (auto-generated)
├── package.json              # Root package.json (workspaces config)
├── tsconfig.json             # Shared TS config
├── docker-compose.yml        # For local dev (DB, services)
├── README.md                 # Project overview
├── .env.example              # Shared env vars
├── .gitignore
├── packages/                 # Microservices (one per domain)
│   ├── database/
│   │   ├── package.json
│   │   ├── drizzle.config.ts
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   ├── migrations/
│   │   │   ├── index.ts
│   │   └── .env
│   ├── auth-service/         # $Handles login/register, tokens, sessions
│   │   ├── package.json      # Service deps (hono, drizzle-orm, etc.)
│   │   ├── bun.ts            # Entry point: Bun.serve(app)
│   │   ├── src/
│   │   │   ├── routes/       # Hono routes (e.g., /auth/register)
│   │   │   │   └── auth.ts
│   │   │   ├── controllers/  # Business logic (e.g., registerUser)
│   │   │   ├── services/     # Data layer (e.g., UserService with Drizzle)
│   │   │   ├── middleware/   # Service-specific middleware (e.g., rate limiting)
│   │   │   └── index.ts      # App setup: new Hono().route(...)
│   │   ├── tests/            # Service tests (Bun Test)
│   │   └── .env              # Service env vars
│   ├── user-service/         # M$anages users, roles, permissions (RBAC)
│   │   ├── package.json
│   │   ├── bun.ts
│   │   ├── src/
│   │   │   ├── routes/       # e.g., /users, /roles, /permissions
│   │   │   ├── controllers/  # e.g., createUser, assignRole
│   │   │   ├── services/     # e.g., UserRepository (Drizzle queries)
│   │   │   └── middleware/   # e.g., RBAC middleware
│   │   └── tests/
│   ├── kitchen-service/      # Handles kitchens, drivers, schools
│   │   ├── package.json
│   │   ├── bun.ts
│   │   ├── src/
│   │   │   ├── routes/       # e.g., /kitchens, /drivers, /schools
│   │   │   ├── controllers/  # e.g., createKitchen
│   │   │   ├── services/     # e.g., KitchenService
│   │   │   └── middleware/
│   │   └── tests/
│   ├── school-service/      # Handles schools
│   │   ├── package.json
│   │   ├── bun.ts
│   │   ├── src/
│   │   │   ├── routes/       # e.g., /kitchens, /drivers, /schools
│   │   │   ├── controllers/  # e.g., createKitchen
│   │   │   ├── services/     # e.g., KitchenService
│   │   │   └── middleware/
│   │   └── tests/
│   ├── delivery-service/         # delivery
│   │   ├── package.json
│   │   ├── bun.ts
│   │   ├── src/
│   │   │   ├── routes/       # e.g., /menus, /food-items, /suppliers, /menu-plans
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── middleware/
│   │   └── tests/
│   ├── menu-service/         # Menus, food items, suppliers, menu plans
│   │   ├── package.json
│   │   ├── bun.ts
│   │   ├── src/
│   │   │   ├── routes/       # e.g., /menus, /food-items, /suppliers, /menu-plans
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── middleware/
│   │   └── tests/
│   ├── tracking-service/         # tracking driver position
│   │   ├── package.json
│   │   ├── bun.ts
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── queue/
│   │   │   ├── template/
│   │   │   └── middleware/
│   │   └── tests/
│   ├── ai-service/         # processing image for ai analysis
│   │   ├── package.json
│   │   ├── bun.ts
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── queue/
│   │   │   ├── template/
│   │   │   └── middleware/
│   │   └── tests/
│   ├── reporting-service/         # processing report
│   │   ├── package.json
│   │   ├── bun.ts
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── queue/
│   │   │   ├── template/
│   │   │   └── middleware/
│   │   └── tests/
│   ├── logs-service/         # processing logs
│   │   ├── package.json
│   │   ├── bun.ts
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── queue/
│   │   │   ├── template/
│   │   │   └── middleware/
│   │   └── tests/
│   └── notification-service/         # email, push notification
│       ├── package.json
│       ├── bun.ts
│       ├── src/
│       │   ├── routes/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── queue/
│       │   ├── template/
│       │   └── middleware/
│       └── tests/
└── scripts/                  # Build/deploy scripts (e.g., bun run build-all)
    └── deploy.sh
```

# RabbitMQ Event Configuration

This document outlines the RabbitMQ event configuration for the food delivery microservices system, built with Hono and Bun. It defines the exchange, queues, routing keys, events, and binding rules for inter-service communication, aligned with the provided database schema and microservices (`auth-service`, `user-service`, `kitchen-service`, `menu-service`, `delivery-service`).

## Design Principles

- **Topic Exchange**: Uses a single `food_delivery_events` topic exchange for flexible routing with patterns (e.g., `delivery.*`, `user.*`).
- **Routing Keys**: Structured as `<entity>.<action>` (e.g., `delivery.created`, `user.registered`) to match schema entities and actions.
- **Queues**: Each service has a durable queue (e.g., `auth-service-queue`) bound to the exchange with specific routing keys.
- **Events**: Derived from key schema actions (e.g., creating/updating `users`, `deliveries`, `driver_locations`).
- **Durability**: Exchanges and queues are durable to ensure no message loss, critical for `deliveries.status` or `menu_plans.status`.
- **Bun Integration**: Uses `amqplib` for RabbitMQ client, compatible with Bun.
- **Auditing**: Events are logged in the `app_logs` table (e.g., `log_level: INFO, message: 'Published delivery.created'`).

## Exchange

- **Name**: `food_delivery_events`
- **Type**: Topic
- **Properties**:
  - `durable: true` (survives broker restarts)
  - `autoDelete: false`
- **Purpose**: Central exchange for all microservices to publish and subscribe to events.

## Queues

Each service has a dedicated queue:

- **auth-service-queue**: For `auth-service` (handles `user.registered`, `user.logged_in`).
- **user-service-queue**: For `user-service` (handles `user.updated`, `role.assigned`).
- **kitchen-service-queue**: For `kitchen-service` (handles `kitchen.created`, `driver.assigned`).
- **menu-service-queue**: For `menu-service` (handles `menu_plan.created`, `food_item.updated`).
- **delivery-service-queue**: For `delivery-service` (handles `delivery.created`, `delivery.status_updated`, `driver_location.updated`).
- **Properties**:
  - `durable: true` (messages persist)
  - `autoDelete: false`
- **Binding**: Each queue binds to the `food_delivery_events` exchange with specific routing keys.

## Routing Keys and Events

Events are triggered by API actions (e.g., `POST /deliveries`) and published to the `food_delivery_events` exchange with routing keys in the format `<entity>.<action>`.

### Auth Service

- **user.registered**: Triggered on `POST /auth/register` (new `users` record).
- **user.logged_in**: Triggered on `POST /auth/login` (new `user_sessions`/`user_tokens` record).

### User Service

- **user.updated**: On `PUT /users/{id}` or `PUT /users/{id}/details`.
- **user.deleted**: On `DELETE /users/{id}` (soft delete).
- **role.assigned**: On assigning a role (`user_roles` insert).
- **permission.assigned**: On assigning a permission (`role_permissions` insert).

### Kitchen Service

- **kitchen.created**: On `POST /kitchens`.
- **kitchen.updated**: On `PUT /kitchens/{id}`.
- **driver.assigned**: On `POST /drivers` or `PUT /drivers/{id}` (links to `kitchen_id`).
- **school.created**: On `POST /schools`.

### Menu Service

- **menu.created**: On `POST /menus`.
- **food_item.created**: On `POST /food-items`.
- **food_item.updated**: On `PUT /food-items/{id}` (e.g., `is_available` change).
- **supplier.created**: On `POST /suppliers`.
- **menu_plan.created**: On `POST /menu-plans`.
- **menu_plan.status_updated**: On `PUT /menu-plans/{id}` (e.g., `status: APPROVED`).

### Delivery Service

- **delivery.created**: On `POST /deliveries`.
- **delivery.status_updated**: On `PUT /deliveries/{id}` (e.g., `status: IN_PROGRESS` to `DELIVERED`).
- **delivery_school.created**: On `POST /delivery-schools`.
- **delivery_school.status_updated**: On `PUT /delivery-schools/{id}` (e.g., `status: DELIVERED`).
- **driver_location.updated**: On updates to `driver_locations` (e.g., new coordinates).

## Binding Rules

Each service's queue binds to specific routing keys to receive relevant events:

- **Auth Service**: Binds to `user.*` (e.g., `user.registered`, `user.logged_in`).
- **User Service**: Binds to `user.*`, `role.*`, `permission.*`.
- **Kitchen Service**: Binds to `kitchen.*`, `driver.*`, `school.*`.
- **Menu Service**: Binds to `menu.*`, `food_item.*`, `supplier.*`, `menu_plan.*`.
- **Delivery Service**: Binds to `delivery.*`, `delivery_school.*`, `driver_location.*`.
- **Wildcard Binding**: Services can bind to `*.*` for cross-service events (e.g., `user-service` listening to `delivery.created` for notifications).

## Example Setup

### Docker Compose for RabbitMQ

```yaml
version: '3'
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - '5672:5672' # AMQP port
      - '15672:15672' # Management UI
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
volumes:
  rabbitmq_data:
```

Run: `docker-compose up -d` to start RabbitMQ. Access the management UI at `http://localhost:15672` (guest/guest).

### Environment Variables

In each service's `.env`:

```
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### Implementation Notes

- **Shared RabbitMQ Client**: Use `shared/src/rabbit.ts` to connect to RabbitMQ, set up queues, and publish/consume events (see example implementation in `delivery-service`).
- **Publishing**: After API actions (e.g., `POST /deliveries`), publish events using `rabbitMQ.publish('delivery.created', data)`.
- **Consuming**: Each service runs a consumer (e.g., `consumer.ts`) to process events (e.g., log `delivery.status_updated` to `app_logs`).
- **Auditing**: Log all published/consumed events in `app_logs` (e.g., `log_level: INFO, message: 'Published delivery.created'`).
- **Real-Time Integration**: Combine with WebSocket (e.g., `/ws/deliveries`) to push events like `delivery.status_updated` to clients.

## Notes

- **Schema Alignment**: Events map to schema actions (e.g., `deliveries.status` changes trigger `delivery.status_updated`). Use `app_logs` for auditing.
- **Scalability**: Topic exchange allows new services to bind to existing events (e.g., add `notification-service` binding to `delivery.*`).
- **Error Handling**: Use `try/catch` in consumers and log errors to `app_logs` (e.g., `log_level: ERROR`).
- **Missing Entities**: Excluded `vehicles` and `price` in `food_items` as they’re not in the schema. Add events like `vehicle.created` if needed.

For detailed code examples (e.g., `delivery-service` publishing `delivery.created`), refer to the service-specific implementation guides or request specific code snippets.

# API Endpoints

## Authentication

- **POST** `/api/v1/auth/register`  
  Permissions: None (public)
- **POST** `/api/v1/auth/login`  
  Permissions: None (public)
- **POST** `/api/v1/auth/refresh`  
  Permissions: None (public)

## Users

- **GET** `/api/v1/users?page={page}&limit={limit}&is_active={boolean}`  
  Permissions: `resource: /api/users, action: read`
- **POST** `/api/v1/users`  
  Permissions: `resource: /api/users, action: write`
- **GET** `/api/v1/users/{id}`  
  Permissions: `resource: /api/users, action: read`
- **PUT** `/api/v1/users/{id}`  
  Permissions: `resource: /api/users, action: write`
- **DELETE** `/api/v1/users/{id}`  
  Permissions: `resource: /api/users, action: delete`
- **GET** `/api/v1/users/{id}/details`  
  Permissions: `resource: /api/users/details, action: read`
- **PUT** `/api/v1/users/{id}/details`  
  Permissions: `resource: /api/users/details, action: write`

## Roles

- **GET** `/api/v1/roles?page={page}&limit={limit}`  
  Permissions: `resource: /api/roles, action: read`
- **POST** `/api/v1/roles`  
  Permissions: `resource: /api/roles, action: write`
- **GET** `/api/v1/roles/{id}`  
  Permissions: `resource: /api/roles, action: read`
- **PUT** `/api/v1/roles/{id}`  
  Permissions: `resource: /api/roles, action: write`
- **DELETE** `/api/v1/roles/{id}`  
  Permissions: `resource: /api/roles, action: delete`

## Permissions

- **GET** `/api/v1/permissions?page={page}&limit={limit}&type={API|MENU}`  
  Permissions: `resource: /api/permissions, action: read`
- **POST** `/api/v1/permissions`  
  Permissions: `resource: /api/permissions, action: write`
- **GET** `/api/v1/permissions/{id}`  
  Permissions: `resource: /api/permissions, action: read`
- **PUT** `/api/v1/permissions/{id}`  
  Permissions: `resource: /api/permissions, action: write`
- **DELETE** `/api/v1/permissions/{id}`  
  Permissions: `resource: /api/permissions, action: delete`

## Kitchens

- **GET** `/api/v1/kitchens?page={page}&limit={limit}`  
  Permissions: `resource: /api/kitchens, action: read`
- **POST** `/api/v1/kitchens`  
  Permissions: `resource: /api/kitchens, action: write`
- **GET** `/api/v1/kitchens/{id}`  
  Permissions: `resource: /api/kitchens, action: read`
- **PUT** `/api/v1/kitchens/{id}`  
  Permissions: `resource: /api/kitchens, action: write`
- **DELETE** `/api/v1/kitchens/{id}`  
   Permissions: `resource: /api/kitchens, action: delete`
  --> new
- **POST** `/api/v1/kitchens/{id}/users`  
  Permissions: `resource: /api/kitchens, action: write`
- **DELETE** `/api/v1/kitchens/{id}/users/{userId}`  
  Permissions: `resource: /api/kitchens, action: delete`

## Drivers

- **GET** `/api/v1/drivers?page={page}&limit={limit}&is_active={boolean}`  
  Permissions: `resource: /api/drivers, action: read`
- **POST** `/api/v1/drivers`  
  Permissions: `resource: /api/drivers, action: write`
- **GET** `/api/v1/drivers/{id}`  
  Permissions: `resource: /api/drivers, action: read`
- **PUT** `/api/v1/drivers/{id}`  
  Permissions: `resource: /api/drivers, action: write`
- **DELETE** `/api/v1/drivers/{id}`  
  Permissions: `resource: /api/drivers, action: delete`

## Schools

- **GET** `/api/v1/schools?page={page}&limit={limit}`  
  Permissions: `resource: /api/schools, action: read`
- **POST** `/api/v1/schools`  
  Permissions: `resource: /api/schools, action: write`
- **GET** `/api/v1/schools/{id}`  
  Permissions: `resource: /api/schools, action: read`
- **PUT** `/api/v1/schools/{id}`  
  Permissions: `resource: /api/schools, action: write`
- **DELETE** `/api/v1/schools/{id}`  
   Permissions: `resource: /api/schools, action: delete`
  --> new
- **POST** `/api/v1/schools/{id}/users`  
  Permissions: `resource: /api/kitchens, action: write`
- **DELETE** `/api/v1/schools/{id}/users/{userId}`  
  Permissions: `resource: /api/kitchens, action: delete`

## Menus

- **GET** `/api/v1/menus?page={page}&limit={limit}`  
  Permissions: `resource: /api/menus, action: read`
- **POST** `/api/v1/menus`  
  Permissions: `resource: /api/menus, action: write`
- **GET** `/api/v1/menus/{id}`  
  Permissions: `resource: /api/menus, action: read`
- **PUT** `/api/v1/menus/{id}`  
  Permissions: `resource: /api/menus, action: write`
- **DELETE** `/api/v1/menus/{id}`  
  Permissions: `resource: /api/menus, action: delete`

## Food Items

- **GET** `/api/v1/food-items?page={page}&limit={limit}&is_available={boolean}`  
  Permissions: `resource: /api/food-items, action: read`
- **POST** `/api/v1/food-items`  
  Permissions: `resource: /api/food-items, action: write`
- **GET** `/api/v1/food-items/{id}`  
  Permissions: `resource: /api/food-items, action: read`
- **PUT** `/api/v1/food-items/{id}`  
  Permissions: `resource: /api/food-items, action: write`
- **DELETE** `/api/v1/food-items/{id}`  
   Permissions: `resource: /api/food-items, action: delete`
  --> baru permission belum di sesuaikan
- **PATCH ** `/api/v1/food-items/{id}/availability`
  Permissions: `resource: /api/food-items, action: delete`
- **GET ** `/api/v1/food-items/{id}/menus`
  Permissions: `resource: /api/food-items, action: delete`

## Menu Plans

- **GET** `/api/v1/menu-plans?page={page}&limit={limit}&status={DRAFT|APPROVED|CANCELLED|COMPLETED}`  
  Permissions: `resource: /api/menu-plans, action: read`
- **POST** `/api/v1/menu-plans`  
  Permissions: `resource: /api/menu-plans, action: write`
- **GET** `/api/v1/menu-plans/{id}`  
  Permissions: `resource: /api/menu-plans, action: read`
- **PUT** `/api/v1/menu-plans/{id}`  
  Permissions: `resource: /api/menu-plans, action: write`
- **DELETE** `/api/v1/menu-plans/{id}`  
   Permissions: `resource: /api/menu-plans, action: delete`
  --> baru permission belum di sesuaikan
- **PATCH ** `/api/v1/menu-plans/{id}/status`
  Permissions: `resource: /api/food-items, action: delete`
- **POST ** `/api/v1/menu-plans/{id}/food-items`
  Permissions: `resource: /api/food-items, action: delete`
- **DELETE ** `/api/v1/menu-plans/{id}/food-items/{foodItemId}`
  Permissions: `resource: /api/food-items, action: delete`
- **POST ** `/api/v1/menu-plans/{id}/distribution`
  Permissions: `resource: /api/food-items, action: delete`
- **GET ** `/api/v1/menu-plans/{id}/distribution`
  Permissions: `resource: /api/food-items, action: delete`
- **GET ** `/api/v1/menu-plans/{id}/distribution?schoolId={id}&kitchenId={id}`
  Permissions: `resource: /api/food-items, action: delete`

## Suppliers

- **GET** `/api/v1/suppliers?page={page}&limit={limit}`  
  Permissions: `resource: /api/suppliers, action: read`
- **POST** `/api/v1/suppliers`  
  Permissions: `resource: /api/suppliers, action: write`
- **GET** `/api/v1/suppliers/{id}`  
  Permissions: `resource: /api/suppliers, action: read`
- **PUT** `/api/v1/suppliers/{id}`  
  Permissions: `resource: /api/suppliers, action: write`
- **DELETE** `/api/v1/suppliers/{id}`  
  Permissions: `resource: /api/suppliers, action: delete`

## Deliveries

- **GET** `/api/v1/deliveries?page={page}&limit={limit}&status={PENDING|IN_PROGRESS|DELIVERED|CANCELLED|FAILED}`  
  Permissions: `resource: /api/deliveries, action: read`
- **POST** `/api/v1/deliveries`  
  Permissions: `resource: /api/deliveries, action: write`
- **GET** `/api/v1/deliveries/{id}`  
  Permissions: `resource: /api/deliveries, action: read`
- **PUT** `/api/v1/deliveries/{id}`  
  Permissions: `resource: /api/deliveries, action: write`
- **DELETE** `/api/v1/deliveries/{id}`  
  Permissions: `resource: /api/deliveries, action: delete`

## Delivery Schools

- **GET** `/api/v1/delivery-schools?page={page}&limit={limit}&status={PENDING|DELIVERED|FAILED}`  
  Permissions: `resource: /api/delivery-schools, action: read`
- **POST** `/api/v1/delivery-schools`  
  Permissions: `resource: /api/delivery-schools, action: write`
- **GET** `/api/v1/delivery-schools/{id}`  
  Permissions: `resource: /api/delivery-schools, action: read`
- **PUT** `/api/v1/delivery-schools/{id}`  
  Permissions: `resource: /api/delivery-schools, action: write`
- **DELETE** `/api/v1/delivery-schools/{id}`  
  Permissions: `resource: /api/delivery-schools, action: delete`

# RabbitMQ Event Configuration

This document outlines the RabbitMQ event configuration for the food delivery microservices system, built with Hono and Bun. It defines the exchange, queues, routing keys, events, and binding rules for inter-service communication, aligned with the provided database schema and microservices (`auth-service`, `user-service`, `kitchen-service`, `menu-service`, `delivery-service`).

## Design Principles

- **Topic Exchange**: Uses a single `food_delivery_events` topic exchange for flexible routing with patterns (e.g., `delivery.*`, `user.*`).
- **Routing Keys**: Structured as `<entity>.<action>` (e.g., `delivery.created`, `user.registered`) to match schema entities and actions.
- **Queues**: Each service has a durable queue (e.g., `auth-service-queue`) bound to the exchange with specific routing keys.
- **Events**: Derived from key schema actions (e.g., creating/updating `users`, `deliveries`, `driver_locations`).
- **Durability**: Exchanges and queues are durable to ensure no message loss, critical for `deliveries.status` or `menu_plans.status`.
- **Bun Integration**: Uses `amqplib` for RabbitMQ client, compatible with Bun.
- **Auditing**: Events are logged in the `app_logs` table (e.g., `log_level: INFO, message: 'Published delivery.created'`).

## Exchange

- **Name**: `food_delivery_events`
- **Type**: Topic
- **Properties**:
  - `durable: true` (survives broker restarts)
  - `autoDelete: false`
- **Purpose**: Central exchange for all microservices to publish and subscribe to events.

## Queues

Each service has a dedicated queue:

- **auth-service-queue**: For `auth-service` (handles `user.registered`, `user.logged_in`).
- **user-service-queue**: For `user-service` (handles `user.updated`, `role.assigned`).
- **kitchen-service-queue**: For `kitchen-service` (handles `kitchen.created`, `driver.assigned`).
- **menu-service-queue**: For `menu-service` (handles `menu_plan.created`, `food_item.updated`).
- **delivery-service-queue**: For `delivery-service` (handles `delivery.created`, `delivery.status_updated`, `driver_location.updated`).
- **Properties**:
  - `durable: true` (messages persist)
  - `autoDelete: false`
- **Binding**: Each queue binds to the `food_delivery_events` exchange with specific routing keys.

## Routing Keys and Events

Events are triggered by API actions (e.g., `POST /deliveries`) and published to the `food_delivery_events` exchange with routing keys in the format `<entity>.<action>`.

### Auth Service

- **user.registered**: Triggered on `POST /auth/register` (new `users` record).
- **user.logged_in**: Triggered on `POST /auth/login` (new `user_sessions`/`user_tokens` record).

### User Service

- **user.updated**: On `PUT /users/{id}` or `PUT /users/{id}/details`.
- **user.deleted**: On `DELETE /users/{id}` (soft delete).
- **role.assigned**: On assigning a role (`user_roles` insert).
- **permission.assigned**: On assigning a permission (`role_permissions` insert).

### Kitchen Service

- **kitchen.created**: On `POST /kitchens`.
- **kitchen.updated**: On `PUT /kitchens/{id}`.
- **driver.assigned**: On `POST /drivers` or `PUT /drivers/{id}` (links to `kitchen_id`).
- **school.created**: On `POST /schools`.

### Menu Service

- **menu.created**: On `POST /menus`.
- **food_item.created**: On `POST /food-items`.
- **food_item.updated**: On `PUT /food-items/{id}` (e.g., `is_available` change).
- **supplier.created**: On `POST /suppliers`.
- **menu_plan.created**: On `POST /menu-plans`.
- **menu_plan.status_updated**: On `PUT /menu-plans/{id}` (e.g., `status: APPROVED`).

### Delivery Service

- **delivery.created**: On `POST /deliveries`.
- **delivery.status_updated**: On `PUT /deliveries/{id}` (e.g., `status: IN_PROGRESS` to `DELIVERED`).
- **delivery_school.created**: On `POST /delivery-schools`.
- **delivery_school.status_updated**: On `PUT /delivery-schools/{id}` (e.g., `status: DELIVERED`).
- **driver_location.updated**: On updates to `driver_locations` (e.g., new coordinates).

## Binding Rules

Each service's queue binds to specific routing keys to receive relevant events:

- **Auth Service**: Binds to `user.*` (e.g., `user.registered`, `user.logged_in`).
- **User Service**: Binds to `user.*`, `role.*`, `permission.*`.
- **Kitchen Service**: Binds to `kitchen.*`, `driver.*`, `school.*`.
- **Menu Service**: Binds to `menu.*`, `food_item.*`, `supplier.*`, `menu_plan.*`.
- **Delivery Service**: Binds to `delivery.*`, `delivery_school.*`, `driver_location.*`.
- **Wildcard Binding**: Services can bind to `*.*` for cross-service events (e.g., `user-service` listening to `delivery.created` for notifications).

## Example Setup

### Docker Compose for RabbitMQ

```yaml
version: '3'
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - '5672:5672' # AMQP port
      - '15672:15672' # Management UI
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
volumes:
  rabbitmq_data:
```

Run: `docker-compose up -d` to start RabbitMQ. Access the management UI at `http://localhost:15672` (guest/guest).

### Environment Variables

In each service's `.env`:

```
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### Implementation Notes

- **Shared RabbitMQ Client**: Use `shared/src/rabbit.ts` to connect to RabbitMQ, set up queues, and publish/consume events (see example implementation in `delivery-service`).
- **Publishing**: After API actions (e.g., `POST /deliveries`), publish events using `rabbitMQ.publish('delivery.created', data)`.
- **Consuming**: Each service runs a consumer (e.g., `consumer.ts`) to process events (e.g., log `delivery.status_updated` to `app_logs`).
- **Auditing**: Log all published/consumed events in `app_logs` (e.g., `log_level: INFO, message: 'Published delivery.created'`).
- **Real-Time Integration**: Combine with WebSocket (e.g., `/ws/deliveries`) to push events like `delivery.status_updated` to clients.

## Notes

- **Schema Alignment**: Events map to schema actions (e.g., `deliveries.status` changes trigger `delivery.status_updated`). Use `app_logs` for auditing.
- **Scalability**: Topic exchange allows new services to bind to existing events (e.g., add `notification-service` binding to `delivery.*`).
- **Error Handling**: Use `try/catch` in consumers and log errors to `app_logs` (e.g., `log_level: ERROR`).
- **Missing Entities**: Excluded `vehicles` and `price` in `food_items` as they’re not in the schema. Add events like `vehicle.created` if needed.

For detailed code examples (e.g., `delivery-service` publishing `delivery.created`), refer to the service-specific implementation guides or request specific code snippets.

## <!-- docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ./.env up --build -d -->

## 🚀 Running the Services

### Build & Run All Services

```bash
make up
```

This is an alias for:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ./.env up --build -d
```

- `--build`: Rebuilds images if there are changes
- `-d`: Runs in the background (detached mode)

### Check Container Status

```bash
docker ps
```

### Check Logs for User Service

```bash
docker logs user_service -f
```

---

## 🛑 Stopping the Services

### 1. Stop Containers and Remove Network (data preserved)

```bash
make down
```

Alias:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ./.env down
```

### 2. Stop Containers, Remove Network & Volumes (data deleted)

⚠️ **Warning**: Data in Postgres and RabbitMQ will be lost.

```bash
make down-v
```

Alias:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ./.env down -v
```

### 3. Clean Everything (remove containers, network, volumes, and images)

```bash
make clean
```

Alias:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ./.env down -v --rmi all
```

---

## 🛠️ Makefile

The `Makefile` in the root directory (`backend/`):

```makefile
DOCKER_COMPOSE = docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ./.env

up:
	$(DOCKER_COMPOSE) up --build -d

down:
	$(DOCKER_COMPOSE) down

down-v:
	$(DOCKER_COMPOSE) down -v

clean:
	$(DOCKER_COMPOSE) down -v --rmi all
```

---

## 📌 Important Notes

- Use `make up` to start services.
- Use `make down` to stop services without deleting data.
- Use `make down-v` to reset the database and RabbitMQ.
- Use `make clean` to completely clean up (including images).
- To check the database connection from inside the container:
  ```bash
  docker exec -it database psql -U user_service -d user_service_db
  ```
- Access the RabbitMQ management UI at:
  ```
  http://localhost:15672
  ```
  - Username: `user`
  - Password: `password`

---

## ✅ Health Check Endpoint

The User Service provides health check endpoints:

### Check Service Status

```bash
GET http://localhost:3000/health
```

**Example Response**:

```json
{
  "status": "Running",
  "service": "User Service",
  "database": "Connected",
  "broker": "Connected"
}
```

# 💾 Skema Database Aplikasi Distribusi Makanan

Dokumen ini menyajikan struktur database lengkap, termasuk tipe ENUM, definisi tabel, kolom, batasan (constraints), dan hubungan Kunci Asing (Foreign Keys) dari skema yang disediakan.

---

## 1. Tipe ENUM (Custom Data Types)

| Tipe ENUM                  | Nilai yang Tersedia                                          | Deskripsi                                                                    |
| :------------------------- | :----------------------------------------------------------- | :--------------------------------------------------------------------------- |
| **user_token_type**        | `reset_password`, `verify_email`, `refresh_token`            | Jenis token otentikasi untuk tindakan spesifik.                              |
| **log_level**              | `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`                    | Tingkat keparahan (severity) untuk log aplikasi.                             |
| **permission_type**        | `API`, `MENU`                                                | Jenis sumber daya yang dikontrol oleh izin (endpoint API atau item menu UI). |
| **food_type**              | `PROTEIN`, `CARBO`, `VEGETABLE`, `FRUIT`, `DESSERT`, `OTHER` | Kategori makronutrien atau jenis makanan.                                    |
| **plan_status**            | `DRAFT`, `ACTIVE`                                            | Status siklus hidup rencana menu.                                            |
| **delivery_status**        | `PENDING`, `IN_PROGRESS`, `DELIVERED`, `FAILED`              | Status keseluruhan dari satu perjalanan pengiriman.                          |
| **delivery_school_status** | `PENDING`, `DELIVERED`, `FAILED`                             | Status pengiriman di tujuan sekolah tertentu.                                |

---

## 2. Definisi Tabel (Tables)

### A. Pengguna dan Otentikasi

| Tabel             | Kolom                  | Tipe Data         | Batasan & Default                    | Deskripsi                                                                           |
| :---------------- | :--------------------- | :---------------- | :----------------------------------- | :---------------------------------------------------------------------------------- |
| **users**         | **id**                 | `uuid`            | **PK**, Default: `gen_random_uuid()` | Kunci utama pengguna.                                                               |
|                   | **email**              | `text`            | **UNIQUE**, NOT NULL                 | Alamat email pengguna.                                                              |
|                   | **password**           | `text`            | NOT NULL                             | Hash kata sandi.                                                                    |
|                   | **is_active**          | `boolean`         | NOT NULL, Default: `true`            | Menunjukkan apakah pengguna aktif atau ditangguhkan.                                |
|                   | **is_deleted**         | `boolean`         | NOT NULL, Default: `false`           |                                                                                     |
|                   | **created_at**         | `timestamp`       | NOT NULL, Default: `now()`           |                                                                                     |
|                   | **created_by**         | `uuid`            | **FK** (`users.id`)                  | Pengguna yang membuat catatan ini, `NULL` untuk pendaftaran mandiri.                |
|                   | **updated_at**         | `timestamp`       | NOT NULL                             |                                                                                     |
|                   | **updated_by**         | `uuid`            | **FK** (`users.id`)                  | Pengguna yang terakhir memperbarui catatan ini.                                     |
| **user_details**  | **user_id**            | `uuid`            | **PK**, **FK** (`users.id`)          | Kunci utama sekaligus kunci asing ke tabel `users`.                                 |
|                   | **first_name**         | `varchar(100)`    |                                      |                                                                                     |
|                   | **last_name**          | `varchar(100)`    |                                      |                                                                                     |
|                   | **phone_number**       | `varchar(20)`     |                                      |                                                                                     |
|                   | **address**            | `text`            |                                      |                                                                                     |
|                   | **date_of_birth**      | `date`            |                                      |                                                                                     |
|                   | _(+ Metadata Audit)_   | `uuid/timestamp`  |                                      | Kolom audit (`is_deleted`, `created_at`, `created_by`, `updated_at`, `updated_by`). |
| **user_sessions** | **id**                 | `uuid`            | **PK**, Default: `gen_random_uuid()` |                                                                                     |
|                   | **user_id**            | `uuid`            | NOT NULL, **FK** (`users.id`)        |                                                                                     |
|                   | **refresh_token_hash** | `text`            | NOT NULL                             |                                                                                     |
|                   | **device_info**        | `varchar(255)`    |                                      | Informasi perangkat yang digunakan.                                                 |
|                   | **ip_address**         | `varchar(50)`     |                                      | Alamat IP saat sesi dibuat.                                                         |
|                   | **expires_at**         | `timestamp`       | NOT NULL                             | Waktu kadaluarsa sesi.                                                              |
|                   | **revoked_at**         | `timestamp`       |                                      | Waktu sesi dicabut/dibatalkan.                                                      |
| **user_tokens**   | **id**                 | `uuid`            | **PK**, Default: `gen_random_uuid()` |                                                                                     |
|                   | **user_id**            | `uuid`            | NOT NULL, **FK** (`users.id`)        |                                                                                     |
|                   | **token**              | `varchar(255)`    | **UNIQUE**, NOT NULL                 | Token unik yang digunakan.                                                          |
|                   | **type**               | `user_token_type` | NOT NULL                             | Jenis token (`reset_password`, `verify_email`, `refresh_token`).                    |
|                   | **expires_at**         | `timestamp`       | NOT NULL                             | Waktu kadaluarsa token.                                                             |
|                   | **used_at**            | `timestamp`       |                                      | Waktu token digunakan.                                                              |

### B. Peran, Perizinan, dan Menu Aplikasi

| Tabel                | Kolom             | Tipe Data         | Batasan & Default                    | Deskripsi                                                                      |
| :------------------- | :---------------- | :---------------- | :----------------------------------- | :----------------------------------------------------------------------------- |
| **roles**            | **id**            | `uuid`            | **PK**, Default: `gen_random_uuid()` | Kunci utama peran.                                                             |
|                      | **name**          | `varchar(100)`    | **UNIQUE**, NOT NULL                 | Nama peran.                                                                    |
|                      | **description**   | `text`            |                                      |                                                                                |
| **permissions**      | **id**            | `uuid`            | **PK**, Default: `gen_random_uuid()` | Kunci utama izin.                                                              |
|                      | **name**          | `varchar(100)`    | **UNIQUE**, NOT NULL                 | Nama unik izin.                                                                |
|                      | **type**          | `permission_type` | NOT NULL                             | Tipe izin (`API` atau `MENU`).                                                 |
|                      | **resource**      | `varchar(255)`    | NOT NULL                             | Endpoint API (e.g., `/api/users`) atau resource UI. **(FK ke `menus_app.id`)** |
|                      | **action**        | `varchar(50)`     | NOT NULL                             | Tindakan yang diizinkan (e.g., `read`, `write`, `view`).                       |
| **user_roles**       | **user_id**       | `uuid`            | NOT NULL, **FK** (`users.id`)        | Menghubungkan Pengguna ke Peran (Many-to-Many).                                |
|                      | **role_id**       | `uuid`            | NOT NULL, **FK** (`roles.id`)        |                                                                                |
| **role_permissions** | **role_id**       | `uuid`            | NOT NULL, **FK** (`roles.id`)        | Menghubungkan Peran ke Izin (Many-to-Many).                                    |
|                      | **permission_id** | `uuid`            | NOT NULL, **FK** (`permissions.id`)  |                                                                                |
| **menus_app**        | **id**            | `uuid`            | **PK**, Default: `gen_random_uuid()` | Item menu navigasi aplikasi/UI.                                                |
|                      | **name**          | `varchar(100)`    | **UNIQUE**, NOT NULL                 | Nama menu.                                                                     |
|                      | **path**          | `varchar(255)`    | NOT NULL                             | Rute frontend (e.g., `/dashboard`).                                            |
|                      | **parent_id**     | `uuid`            | **FK** (`menus_app.id`)              | Kunci asing untuk menu bertingkat.                                             |
|                      | **icon**          | `varchar(100)`    |                                      | Nama ikon untuk UI.                                                            |
|                      | **display_order** | `integer`         | Default: `0`                         | Urutan tampilan di UI.                                                         |

### C. Log Aplikasi

RANDOM

### D. Data Geografi

| Tabel         | Kolom           | Tipe Data      | Batasan & Default                 | Keterangan |
| :------------ | :-------------- | :------------- | :-------------------------------- | :--------- |
| **provinces** | **id**          | `bigint`       | **PK**                            |            |
|               | **name**        | `varchar(100)` | NOT NULL                          |            |
| **regencies** | **id**          | `bigint`       | **PK**                            |            |
|               | **province_id** | `bigint`       | NOT NULL, **FK** (`provinces.id`) |            |
| **districts** | **id**          | `bigint`       | **PK**                            |            |
|               | **regency_id**  | `bigint`       | NOT NULL, **FK** (`regencies.id`) |            |
| **villages**  | **id**          | `bigint`       | **PK**                            |            |
|               | **district_id** | `bigint`       | NOT NULL, **FK** (`districts.id`) |            |

### E. Lokasi Operasional (Kitchen, School) & Driver

| Tabel                | Kolom                                                            | Tipe Data       | Batasan & Default                         | Deskripsi                                 |
| :------------------- | :--------------------------------------------------------------- | :-------------- | :---------------------------------------- | :---------------------------------------- |
| **kitchens**         | **id**                                                           | `uuid`          | **PK**, Default: `gen_random_uuid()`      | Data dapur/pusat produksi.                |
|                      | **name**                                                         | `varchar(100)`  | **UNIQUE**, NOT NULL                      |                                           |
|                      | **lon**, **lat**                                                 | `decimal(10,6)` |                                           | Koordinat geografis.                      |
|                      | **province_id**, **regency_id**, **district_id**, **village_id** | `bigint`        | NOT NULL, **FK** (Geo tables)             | Detail alamat.                            |
| **schools**          | **id**                                                           | `uuid`          | **PK**, Default: `gen_random_uuid()`      | Data sekolah sebagai tujuan.              |
|                      | **name**                                                         | `varchar(100)`  | **UNIQUE**, NOT NULL                      |                                           |
|                      | **kitchen_id**                                                   | `uuid`          | NOT NULL, **FK** (`kitchens.id`)          | Dapur yang melayani sekolah ini.          |
|                      | **lon**, **lat**                                                 | `decimal(10,6)` |                                           | Koordinat geografis.                      |
|                      | **province_id**, **regency_id**, **district_id**, **village_id** | `bigint`        | NOT NULL, **FK** (Geo tables)             | Detail alamat.                            |
| **drivers**          | **id**                                                           | `uuid`          | **PK**, Default: `gen_random_uuid()`      | Data driver.                              |
|                      | **user_id**                                                      | `uuid`          | **UNIQUE**, NOT NULL, **FK** (`users.id`) | Akun pengguna driver.                     |
|                      | **kitchen_id**                                                   | `uuid`          | NOT NULL, **FK** (`kitchens.id`)          | Dapur tempat driver bertugas.             |
|                      | **license_number**                                               | `varchar(50)`   | **UNIQUE**                                | Nomor SIM driver.                         |
|                      | **is_active**                                                    | `boolean`       | NOT NULL, Default: `true`                 | Indikasi ketersediaan driver.             |
| **driver_locations** | **id**                                                           | `uuid`          | **PK**, Default: `gen_random_uuid()`      | Log lokasi driver.                        |
|                      | **driver_id**                                                    | `uuid`          | NOT NULL, **FK** (`drivers.id`)           |                                           |
|                      | **delivery_id**                                                  | `uuid`          | NOT NULL, **FK** (via `deliveries.id`)    | Pengiriman terkait lokasi.                |
|                      | **lon**, **lat**                                                 | `decimal(10,6)` | NOT NULL                                  |                                           |
|                      | **recorded_at**                                                  | `timestamp`     | NOT NULL, Default: `now()`                | Waktu perekaman lokasi.                   |
| **user_kitchens**    | **user_id**                                                      | `uuid`          | NOT NULL, **FK** (`users.id`)             | Hubungan pengguna-dapur (many-to-many).   |
|                      | **kitchen_id**                                                   | `uuid`          | NOT NULL, **FK** (`kitchens.id`)          |                                           |
| **user_schools**     | **user_id**                                                      | `uuid`          | NOT NULL, **FK** (`users.id`)             | Hubungan pengguna-sekolah (many-to-many). |
|                      | **school_id**                                                    | `uuid`          | NOT NULL, **FK** (`schools.id`)           |                                           |

### F. Inventaris dan Perencanaan Menu

| Tabel                         | Kolom               | Tipe Data      | Batasan & Default                    | Deskripsi                                                           |
| :---------------------------- | :------------------ | :------------- | :----------------------------------- | :------------------------------------------------------------------ |
| **food_items**                | **id**              | `uuid`         | **PK**, Default: `gen_random_uuid()` | Daftar makanan yang tersedia.                                       |
|                               | **name**            | `varchar(100)` | NOT NULL                             |                                                                     |
|                               | **type**            | `food_type`    | NOT NULL                             | Kategori makanan.                                                   |
|                               | **is_available**    | `boolean`      | NOT NULL, Default: `true`            |                                                                     |
| **suppliers**                 | **id**              | `uuid`         | **PK**, Default: `gen_random_uuid()` | Data pemasok bahan baku.                                            |
|                               | **name**            | `varchar(100)` | NOT NULL                             |                                                                     |
| **menu_plans**                | **id**              | `uuid`         | **PK**, Default: `gen_random_uuid()` | Rencana menu (periode).                                             |
|                               | **menu_id**         | `uuid`         | NOT NULL                             | ID menu (referensi ke tabel lain yang tidak didefinisikan di sini). |
|                               | **plan_start_date** | `date`         | NOT NULL                             |                                                                     |
|                               | **plan_end_date**   | `date`         | NOT NULL                             |                                                                     |
|                               | **village_id**      | `bigint`       | **FK** (`villages.id`)               | Rencana menu khusus wilayah.                                        |
|                               | **status**          | `plan_status`  | NOT NULL                             | Status rencana (`DRAFT`, `ACTIVE`).                                 |
| **menus_food**                | **id**              | `uuid`         | **PK**, Default: `gen_random_uuid()` | Item makanan dalam rencana menu.                                    |
|                               | **food_item_id**    | `uuid`         | NOT NULL, **FK** (`food_items.id`)   |                                                                     |
|                               | **menu_plans_id**   | `uuid`         | NOT NULL, **FK** (`menu_plans.id`)   |                                                                     |
| **menu_plan_schools_kitchen** | **id**              | `uuid`         | **PK**, Default: `gen_random_uuid()` | Penugasan rencana menu ke pasangan Sekolah-Dapur.                   |
|                               | **menu_plan_id**    | `uuid`         | NOT NULL, **FK** (`menu_plans.id`)   |                                                                     |
|                               | **school_id**       | `uuid`         | NOT NULL, **FK** (`schools.id`)      |                                                                     |
|                               | **kitchen_id**      | `uuid`         | NOT NULL, **FK** (`kitchens.id`)     |                                                                     |

### G. Pengiriman (Delivery)

| Tabel                | Kolom                        | Tipe Data                | Batasan & Default                    | Deskripsi                            |
| :------------------- | :--------------------------- | :----------------------- | :----------------------------------- | :----------------------------------- |
| **deliveries**       | **id**                       | `uuid`                   | **PK**, Default: `gen_random_uuid()` | Pengiriman (satu perjalanan driver). |
|                      | **kitchen_id**               | `uuid`                   | NOT NULL, **FK** (`kitchens.id`)     | Dapur asal.                          |
|                      | **driver_id**                | `uuid`                   | NOT NULL, **FK** (`drivers.id`)      | Driver yang ditugaskan.              |
|                      | **start_time**, **end_time** | `timestamp`              |                                      |                                      |
|                      | **estimated_delivery_time**  | `timestamp`              |                                      |                                      |
|                      | **status**                   | `delivery_status`        | NOT NULL                             | Status perjalanan pengiriman.        |
| **delivery_schools** | **id**                       | `uuid`                   | **PK**, Default: `gen_random_uuid()` | Status pengiriman di setiap sekolah. |
|                      | **delivery_id**              | `uuid`                   | NOT NULL, **FK** (`deliveries.id`)   |                                      |
|                      | **school_id**                | `uuid`                   | NOT NULL, **FK** (`schools.id`)      |                                      |
|                      | **menu_plan_id**             | `uuid`                   | NOT NULL, **FK** (`menu_plans.id`)   | Rencana menu yang dikirimkan.        |
|                      | **status**                   | `delivery_school_status` | NOT NULL, Default: `PENDING`         |                                      |
|                      | **delivered_at**             | `timestamp`              |                                      | Waktu aktual pengiriman.             |

---

## 3. Ringkasan Kunci Asing (Foreign Key Relationships)

Daftar ini mencantumkan semua relasi FK antar tabel, kecuali kolom audit (`created_by`, `updated_by`) yang secara konsisten mereferensikan `users.id`.

| Tabel Anak                    | Kolom Anak                                      | Mereferensikan Tabel Induk | Kolom Induk       | Keterangan                                                                                      |
| :---------------------------- | :---------------------------------------------- | :------------------------- | :---------------- | :---------------------------------------------------------------------------------------------- |
| **users**                     | `created_by`, `updated_by`                      | `users`                    | `id`              | Self-referencing (Audit).                                                                       |
| **user_details**              | `user_id`                                       | `users`                    | `id`              | Relasi 1-ke-1.                                                                                  |
| **user_sessions**             | `user_id`                                       | `users`                    | `id`              |                                                                                                 |
| **user_tokens**               | `user_id`                                       | `users`                    | `id`              |                                                                                                 |
| **token_logs**                | `user_id`                                       | `users`                    | `id`              |                                                                                                 |
| **token_logs**                | `token_id`                                      | `user_tokens`              | `id`              |                                                                                                 |
| **app_logs**                  | `user_id`                                       | `users`                    | `id`              |                                                                                                 |
| **user_roles**                | `user_id`                                       | `users`                    | `id`              | Many-to-Many Pengguna-Peran.                                                                    |
| **user_roles**                | `role_id`                                       | `roles`                    | `id`              |                                                                                                 |
| **role_permissions**          | `role_id`                                       | `roles`                    | `id`              | Many-to-Many Peran-Izin.                                                                        |
| **role_permissions**          | `permission_id`                                 | `permissions`              | `id`              |                                                                                                 |
| **menus_app**                 | `parent_id`                                     | `menus_app`                | `id`              | Hirarki menu (Nested Menu).                                                                     |
| **permissions**               | `resource`                                      | `menus_app`                | `id`              | Menghubungkan izin API ke menu (berpotensi tidak konsisten karena `resource` adalah `varchar`). |
| **regencies**                 | `province_id`                                   | `provinces`                | `id`              |                                                                                                 |
| **districts**                 | `regency_id`                                    | `regencies`                | `id`              |                                                                                                 |
| **villages**                  | `district_id`                                   | `districts`                | `id`              |                                                                                                 |
| **kitchens**                  | `province_id/regency_id/district_id/village_id` | Geo Tables                 | `id`              |                                                                                                 |
| **schools**                   | `province_id/regency_id/district_id/village_id` | Geo Tables                 | `id`              |                                                                                                 |
| **schools**                   | `kitchen_id`                                    | `kitchens`                 | `id`              | Sekolah ditugaskan ke Dapur.                                                                    |
| **drivers**                   | `user_id`                                       | `users`                    | `id`              |                                                                                                 |
| **drivers**                   | `kitchen_id`                                    | `kitchens`                 | `id`              |                                                                                                 |
| **user_kitchens**             | `user_id`, `kitchen_id`                         | `users`, `kitchens`        | `id`              |                                                                                                 |
| **user_schools**              | `user_id`, `school_id`                          | `users`, `schools`         | `id`              |                                                                                                 |
| **menus_food**                | `food_item_id`                                  | `food_items`               | `id`              |                                                                                                 |
| **menus_food**                | `menu_plans_id`                                 | `menu_plans`               | `id`              |                                                                                                 |
| **menu_plans**                | `village_id`                                    | `villages`                 | `id`              |                                                                                                 |
| **menu_plan_schools_kitchen** | `menu_plan_id`                                  | `menu_plans`               | `id`              |                                                                                                 |
| **menu_plan_schools_kitchen** | `school_id`                                     | `schools`                  | `id`              |                                                                                                 |
| **menu_plan_schools_kitchen** | `kitchen_id`                                    | `kitchens`                 | `id`              |                                                                                                 |
| **deliveries**                | `kitchen_id`                                    | `kitchens`                 | `id`              |                                                                                                 |
| **deliveries**                | `driver_id`                                     | `drivers`                  | `id`              |                                                                                                 |
| **delivery_schools**          | `delivery_id`                                   | `deliveries`               | `id`              |                                                                                                 |
| **delivery_schools**          | `school_id`                                     | `schools`                  | `id`              |                                                                                                 |
| **delivery_schools**          | `menu_plan_id`                                  | `menu_plans`               | `id`              |                                                                                                 |
| **driver_locations**          | `driver_id`                                     | `drivers`                  | `id`              |                                                                                                 |
| **deliveries**                | `id`                                            | **`driver_locations`**     | **`delivery_id`** | **Note**: Relasi unik, `deliveries` merujuk balik ke `driver_locations`.                        |
