CREATE TYPE "public"."analysis_type" AS ENUM('food_authenticity', 'people_count', 'cleanliness', 'mealbox_count', 'food_detection');--> statement-breakpoint
CREATE TYPE "public"."delivery_beneficiary_status" AS ENUM('PENDING', 'DELIVERED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('PENDING', 'IN_PROGRESS', 'DELIVERED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."entity_type_enum" AS ENUM('kitchen', 'driver', 'school', 'beneficiary', 'kitchen_daily_report', 'driver_daily_report', 'school_daily_report', 'beneficiary_daily_report', 'profile', 'profile_supplier', 'incident_report_kitchen', 'incident_report_driver', 'incident_report_school', 'incident_report_beneficiary', 'other');--> statement-breakpoint
CREATE TYPE "public"."food_type" AS ENUM('PROTEIN', 'PLANT_BASED_PROTEIN', 'CARBO', 'VEGETABLE', 'FRUIT', 'DRINK', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');--> statement-breakpoint
CREATE TYPE "public"."permission_type" AS ENUM('API', 'WEBSITE', 'MOBILE');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('DRAFT', 'ACTIVE');--> statement-breakpoint
CREATE TYPE "public"."role_domain" AS ENUM('kitchen', 'beneficiary', 'driver', 'app_manager', 'other');--> statement-breakpoint
CREATE TYPE "public"."step_key_enum" AS ENUM('preparationTool', 'preparation', 'cooking', 'packaging', 'pickup', 'delivery', 'confirmation', 'receive', 'receive_big_class', 'receive_big_portion', 'receive_small_class', 'receive_small_portion', 'inspection', 'distribution');--> statement-breakpoint
CREATE TYPE "public"."user_token_type" AS ENUM('reset_password', 'verify_email', 'refresh_token');--> statement-breakpoint
CREATE TABLE "ai_analysis_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid,
	"analysis_type" "analysis_type" NOT NULL,
	"source_image_url" text,
	"output_image_url" text,
	"processing_time" numeric(8, 3),
	"threshold" numeric(5, 2),
	"output" jsonb NOT NULL,
	"input" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kitchen_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"delivery_date" date DEFAULT now(),
	"start_time" timestamp,
	"end_time" timestamp,
	"estimated_delivery_time" timestamp,
	"notes" text,
	"status" "delivery_status" NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "delivery_beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"menu_plan_id" uuid NOT NULL,
	"status" "delivery_beneficiary_status" DEFAULT 'PENDING' NOT NULL,
	"delivered_at" timestamp,
	"notes" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "driver_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"lon" numeric(10, 6) NOT NULL,
	"lat" numeric(10, 6) NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kitchen_id" uuid NOT NULL,
	"license_number" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "drivers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "drivers_license_number_unique" UNIQUE("license_number")
);
--> statement-breakpoint
CREATE TABLE "food_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"type" "food_type" NOT NULL,
	"description" text,
	"description_en" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "food_items_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "menu_food_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"food_item_id" uuid NOT NULL,
	"menu_food_plan_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "menu_plan_beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_plan_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "menu_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kitchen_id" uuid,
	"name" text,
	"plan_start_date" date NOT NULL,
	"plan_end_date" date NOT NULL,
	"village_id" uuid,
	"status" "plan_status" NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "master_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "entity_type_enum" NOT NULL,
	"step_key" "step_key_enum" NOT NULL,
	"step_name" varchar(100) NOT NULL,
	"step_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"entity_type" "entity_type_enum" NOT NULL,
	"entity_id" uuid NOT NULL,
	"menu_plan_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"report_type" text,
	"date" date NOT NULL,
	"location" text,
	"description" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"entity_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "step_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_report_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"notes" text,
	"is_completed" boolean DEFAULT false,
	"storage_id" uuid,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "storages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"path" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" varchar(100),
	"size" varchar(50),
	"entity_type" "entity_type_enum" NOT NULL,
	"entity_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "kitchens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"address" text,
	"phone_number" varchar(20),
	"lon" numeric(10, 6),
	"lat" numeric(10, 6),
	"province_id" uuid,
	"regency_id" uuid,
	"district_id" uuid,
	"village_id" uuid,
	"storage_id" uuid,
	"image_url" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "kitchens_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_kitchens" (
	"user_id" uuid NOT NULL,
	"kitchen_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "app_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"level" "log_level" NOT NULL,
	"message" text NOT NULL,
	"payload" jsonb,
	"ip_address" varchar(50),
	"user_agent" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "token_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"ip_address" varchar(50),
	"user_agent" text,
	"success" boolean NOT NULL,
	"payload" jsonb,
	"message" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"regency_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"province_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "villages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"kitchen_id" uuid,
	"address" text,
	"phone_number" varchar(20),
	"lon" numeric(10, 6),
	"lat" numeric(10, 6),
	"province_id" uuid,
	"regency_id" uuid,
	"district_id" uuid,
	"village_id" uuid,
	"storage_id" uuid,
	"image_url" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "beneficiaries_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "beneficiary_portions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"menu_plan_id" uuid,
	"name" varchar(100) NOT NULL,
	"beneficiary_date" date DEFAULT now() NOT NULL,
	"total_recipient" integer DEFAULT 0 NOT NULL,
	"storage_id" uuid,
	"portion_type" varchar(50),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "beneficiary_portions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_beneficiaries" (
	"user_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kitchen_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone_number" text,
	"address" text,
	"description" text,
	"storage_id" uuid,
	"image_url" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "suppliers_food_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid,
	"food_item_id" uuid NOT NULL,
	"menu_plan_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "suppliers_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"food_item_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "menus_app" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"path" varchar(255) NOT NULL,
	"parent_id" uuid,
	"icon" varchar(100),
	"display_order" integer DEFAULT 0,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "menus_app_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "permission_type" NOT NULL,
	"resource" varchar(255) NOT NULL,
	"action" varchar(50) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"domain" "role_domain" DEFAULT 'other' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_details" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone_number" varchar(20),
	"address" text,
	"date_of_birth" date,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid,
	"storage_id" uuid,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"device_info" varchar(255),
	"ip_address" varchar(50),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(1024) NOT NULL,
	"type" "user_token_type" NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "user_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "menu_plans" ADD CONSTRAINT "menu_plans_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_menu_plan_id_menu_plans_id_fk" FOREIGN KEY ("menu_plan_id") REFERENCES "public"."menu_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_reports" ADD CONSTRAINT "step_reports_daily_report_id_daily_reports_id_fk" FOREIGN KEY ("daily_report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_reports" ADD CONSTRAINT "step_reports_step_id_master_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."master_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_reports" ADD CONSTRAINT "step_reports_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_reports" ADD CONSTRAINT "step_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_reports" ADD CONSTRAINT "step_reports_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_portions" ADD CONSTRAINT "beneficiary_portions_menu_plan_id_menu_plans_id_fk" FOREIGN KEY ("menu_plan_id") REFERENCES "public"."menu_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_portions" ADD CONSTRAINT "beneficiary_portions_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_food_items" ADD CONSTRAINT "suppliers_food_items_food_item_id_food_items_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_food_items" ADD CONSTRAINT "suppliers_food_items_menu_plan_id_menu_plans_id_fk" FOREIGN KEY ("menu_plan_id") REFERENCES "public"."menu_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_food_items" ADD CONSTRAINT "suppliers_food_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_food_items" ADD CONSTRAINT "suppliers_food_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_products" ADD CONSTRAINT "suppliers_products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_products" ADD CONSTRAINT "suppliers_products_food_item_id_food_items_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_products" ADD CONSTRAINT "suppliers_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_products" ADD CONSTRAINT "suppliers_products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_details" ADD CONSTRAINT "user_details_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_analysis_type" ON "ai_analysis_logs" USING btree ("analysis_type");--> statement-breakpoint
CREATE INDEX "idx_ai_created_at" ON "ai_analysis_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_kitchen_driver_date" ON "deliveries" USING btree ("kitchen_id","driver_id","delivery_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_entity_date" ON "daily_reports" USING btree ("entity_type","entity_id","menu_plan_id","date");--> statement-breakpoint
CREATE INDEX "storages_entity_idx" ON "storages" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "storages_created_by_idx" ON "storages" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "storages_created_at_idx" ON "storages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_kitchens_user_unique" ON "user_kitchens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "beneficiary_portions_beneficiary_id_idx" ON "beneficiary_portions" USING btree ("beneficiary_id");--> statement-breakpoint
CREATE INDEX "beneficiary_portions_portion_type_idx" ON "beneficiary_portions" USING btree ("portion_type");--> statement-breakpoint
CREATE INDEX "beneficiary_portions_not_deleted_idx" ON "beneficiary_portions" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "beneficiary_portions_total_recipient_idx" ON "beneficiary_portions" USING btree ("total_recipient");--> statement-breakpoint
CREATE UNIQUE INDEX "user_beneficiaries_user_beneficiary_unique" ON "user_beneficiaries" USING btree ("user_id","beneficiary_id");--> statement-breakpoint
CREATE INDEX "user_beneficiaries_not_deleted_idx" ON "user_beneficiaries" USING btree ("is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_supplier_fooditem" ON "suppliers_products" USING btree ("supplier_id","food_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_session_token" ON "user_sessions" USING btree ("user_id","device_info");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_token" ON "user_tokens" USING btree ("user_id","type");