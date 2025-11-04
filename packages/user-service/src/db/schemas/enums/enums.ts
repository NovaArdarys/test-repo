import { pgEnum } from "drizzle-orm/pg-core";

export const userTokenTypeEnum = pgEnum('user_token_type', ['reset_password', 'verify_email', 'refresh_token']);
export const logLevelEnum = pgEnum('log_level', ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);
export const permissionTypeEnum = pgEnum('permission_type', ['API', 'WEBSITE', 'MOBILE']);
export const foodTypeEnum = pgEnum('food_type', ['PROTEIN', 'PLANT_BASED_PROTEIN', 'CARBO', 'VEGETABLE', 'FRUIT', 'DRINK', 'OTHER']);
export const planStatusEnum = pgEnum('plan_status', ['DRAFT', 'ACTIVE']);
export const deliveryStatusEnum = pgEnum('delivery_status', ['PENDING', 'IN_PROGRESS', 'DELIVERED', 'FAILED']);
export const deliverySchoolStatusEnum = pgEnum('delivery_school_status', ['PENDING', 'DELIVERED', 'FAILED']);

export type PermissionType = 'API' | 'WEBSITE' | 'MOBILE';

export const entityTypeEnum = pgEnum("entity_type_enum", [
  "kitchen", // khusus daily report kitchen
  "driver", // khusus daily report driver
  "school", // khusus daily report school
  "kitchen_daily_report", // khusus daily report kitchen
  "driver_daily_report", // khusus daily report driver
  "school_daily_report", // khusus daily report school
  "profile", // entah ini untuk profile kitchen, school, atau user
  "profile_supplier", // entah ini untuk profile kitchen, school, atau user
  "incident_report_kitchen", // ini kalau ada laporan kejadian di suatu hari
  "incident_report_driver", // ini kalau ada laporan kejadian di suatu hari
  "incident_report_", // ini kalau ada laporan kejadian di suatu hari
  "other"
]);

export const stepKeyEnum = pgEnum("step_key_enum", [
  "preparationTool",
  "preparation",
  "cooking",
  "packaging",
  "pickup",
  "delivery",
  "confirmation",
  "receive",
  "receive_big_class",
  "receive_small_class",
  "inspection",
  "distribution",
]);

export const analysisTypeEnum = pgEnum('analysis_type', [
  'food_authenticity',  // computer vision check makanan asli atau bukan
  'people_count',       // hitung jumlah orang
  'cleanliness',        // cek kebersihan dapur
  'mealbox_count',      // hitung jumlah kotak makan
  'food_detection',     // deteksi makanan berdasarkan label
]);

export const roleDomainEnum = pgEnum('role_domain', [
  'kitchen',
  'beneficiary',
  'driver',
  'app_manager'
]);