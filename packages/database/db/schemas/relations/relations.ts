import { relations } from "drizzle-orm";
import {
  menusApp,
  permissions,
  rolePermissions,
  roles,
  userDetails,
  userRoles,
  users,
  userSessions,
  userTokens,
} from "../user.schema";
import { appLogs, tokenLogs } from "../log.schema";
import { kitchens, userKitchens } from "../kitchen.schema";
import { driverLocations, drivers } from "../driver.schema";
import {
  beneficiaryPortions,
  beneficiaries,
  userBeneficiaries,
  beneficiaryFoodAllergies,
} from "../school.schema";
import {
  foodItems,
  menuFoodItem,
  menuPlans,
  menuPlanBeneficiaries,
  foodConsumptionItems,
  foodConsumptionNotes,
} from "../food.schema";
import { suppliers, suppliersFoodItems, suppliersProducts } from "../supplier.schema";
import { deliveries, deliveryBeneficiaries, deliveryStepReports } from "../delivery.schema";
import { districts, provinces, regencies, villages } from "../master.schema";
import { dailyReports, eventReports, stepReports } from "../reporting.Schema";
import { masterSteps } from "../stepPlan.schema";
import { storage } from "../storage.schema";
import { notifications } from "../notification.schema";

/**
 * Users relations
 */
export const usersRelations = relations(users, ({ one, many }) => ({
  userDetails: one(userDetails, { fields: [users.id], references: [userDetails.userId] }),
  userSessions: many(userSessions),
  userTokens: many(userTokens),
  tokenLogs: many(tokenLogs),
  appLogs: many(appLogs),
  userRoles: many(userRoles, { relationName: "userToRoles" }),
  createdUsers: many(users, { relationName: "created_by" }),
  updatedUsers: many(users, { relationName: "updated_by" }),
  createdUserDetails: many(userDetails, { relationName: "created_by" }),
  updatedUserDetails: many(userDetails, { relationName: "updated_by" }),
  createdUserSessions: many(userSessions, { relationName: "created_by" }),
  createdUserTokens: many(userTokens, { relationName: "created_by" }),
  createdTokenLogs: many(tokenLogs, { relationName: "created_by" }),
  createdAppLogs: many(appLogs, { relationName: "created_by" }),
  createdRoles: many(roles, { relationName: "created_by" }),
  updatedRoles: many(roles, { relationName: "updated_by" }),
  createdPermissions: many(permissions, { relationName: "created_by" }),
  updatedPermissions: many(permissions, { relationName: "updated_by" }),
  createdUserRoles: many(userRoles, { relationName: "createdByUserRoles" }),

  createdRolePermissions: many(rolePermissions, { relationName: "created_by" }),
  createdMenusApp: many(menusApp, { relationName: "created_by" }),
  updatedMenusApp: many(menusApp, { relationName: "updated_by" }),
  userKitchens: many(userKitchens, { relationName: "user_kitchens_user" }),
  userBeneficiaries: many(userBeneficiaries, { relationName: "user_beneficiaries_user" }),
  drivers: many(drivers, { relationName: "drivers_user" }),
  createdFoodItems: many(foodItems, { relationName: "created_by" }),
  updatedFoodItems: many(foodItems, { relationName: "updated_by" }),
  createdSuppliers: many(suppliers, { relationName: "created_by" }),
  updatedSuppliers: many(suppliers, { relationName: "updated_by" }),
  createdMenuPlans: many(menuPlans, { relationName: "created_by" }),
  updatedMenuPlans: many(menuPlans, { relationName: "updated_by" }),
  createdMenuPlanBeneficiaries: many(menuPlanBeneficiaries, { relationName: "created_by" }),
  createdDeliveries: many(deliveries, { relationName: "created_by" }),
  updatedDeliveries: many(deliveries, { relationName: "updated_by" }),
  createdDeliveryBeneficiaries: many(deliveryBeneficiaries, { relationName: "created_by" }),
  dailyReports: many(dailyReports, { relationName: "user_daily_reports" }),

  stepReports: many(stepReports, { relationName: "user_step_reports" }),
}));

/**
 * Event reports
 */
export const eventReportsRelations = relations(eventReports, ({ one }) => ({
  createdByUser: one(users, {
    fields: [eventReports.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [eventReports.updatedBy],
    references: [users.id],
  }),
}));

/**
 * Daily reports
 */
export const dailyReportRelations = relations(dailyReports, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [dailyReports.createdBy],
    references: [users.id],
  }),

  updatedByUser: one(users, {
    fields: [dailyReports.updatedBy],
    references: [users.id],
  }),

  menuPlan: one(menuPlans, {
    fields: [dailyReports.menuPlanId],
    references: [menuPlans.id],
  }),

  steps: many(stepReports),
}));

/**
 * Step reports
 */
export const stepReportRelations = relations(stepReports, ({ one }) => ({
  storage: one(storage, { fields: [stepReports.storageId], references: [storage.id] }),
  dailyReport: one(dailyReports, {
    fields: [stepReports.dailyReportId],
    references: [dailyReports.id],
  }),

  step: one(masterSteps, {
    fields: [stepReports.stepId],
    references: [masterSteps.id],
  }),

  createdByUser: one(users, {
    fields: [stepReports.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [stepReports.updatedBy],
    references: [users.id],
  }),
  masterStep: one(masterSteps, {
    fields: [stepReports.stepId],
    references: [masterSteps.id],
  }),
}));

/**
 * Master steps
 */
export const masterStepRelations = relations(masterSteps, ({ many }) => ({
  stepReports: many(stepReports),
  deliveryStepReports: many(deliveryStepReports),
}));

/**
 * Storage relations
 */
export const storageRelations = relations(storage, ({ many }) => ({
  userDetails: many(userDetails),
  dailyReports: many(stepReports),
  beneficiaryPortions: many(beneficiaryPortions),
  kitchens: many(kitchens),
  suppliers: many(suppliers),
  beneficiaries: many(beneficiaries),
}));

/**
 * User details
 */
export const userDetailsRelations = relations(userDetails, ({ one }) => ({
  user: one(users, { fields: [userDetails.userId], references: [users.id] }),
  createdBy: one(users, {
    fields: [userDetails.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
  updatedBy: one(users, {
    fields: [userDetails.updatedBy],
    references: [users.id],
    relationName: "updated_by",
  }),
  storage: one(storage, { fields: [userDetails.storageId], references: [storage.id] }),
}));

/**
 * User sessions
 */
export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
  createdBy: one(users, {
    fields: [userSessions.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
}));

/**
 * User tokens
 */
export const userTokensRelations = relations(userTokens, ({ one, many }) => ({
  user: one(users, { fields: [userTokens.userId], references: [users.id] }),
  tokenLogs: many(tokenLogs),
  createdBy: one(users, {
    fields: [userTokens.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
}));

/**
 * Token logs
 */
export const tokenLogsRelations = relations(tokenLogs, ({ one }) => ({
  token: one(userTokens, { fields: [tokenLogs.tokenId], references: [userTokens.id] }),
  user: one(users, { fields: [tokenLogs.userId], references: [users.id] }),
  createdBy: one(users, {
    fields: [tokenLogs.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
}));

/**
 * App logs
 */
export const appLogsRelations = relations(appLogs, ({ one }) => ({
  user: one(users, { fields: [appLogs.userId], references: [users.id] }),
  createdBy: one(users, {
    fields: [appLogs.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
}));

/**
 * Roles
 */
export const rolesRelations = relations(roles, ({ many, one }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
  createdBy: one(users, {
    fields: [roles.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
  updatedBy: one(users, {
    fields: [roles.updatedBy],
    references: [users.id],
    relationName: "updated_by",
  }),
}));

/**
 * Permissions
 */
export const permissionsRelations = relations(permissions, ({ many, one }) => ({
  rolePermissions: many(rolePermissions),
  createdBy: one(users, {
    fields: [permissions.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
  updatedBy: one(users, {
    fields: [permissions.updatedBy],
    references: [users.id],
    relationName: "updated_by",
  }),
}));

/**
 * UserRoles
 */
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
    relationName: "userToRoles",
  }),

  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),

  createdBy: one(users, {
    fields: [userRoles.createdBy],
    references: [users.id],
    relationName: "createdByUserRoles",
  }),
}));

/**
 * RolePermissions
 */
export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
  createdBy: one(users, {
    fields: [rolePermissions.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
}));

/**
 * Menus App
 */
export const menusAppRelations = relations(menusApp, ({ one, many }) => ({
  parent: one(menusApp, { fields: [menusApp.parentId], references: [menusApp.id] }),
  children: many(menusApp),
  createdBy: one(users, {
    fields: [menusApp.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
  updatedBy: one(users, {
    fields: [menusApp.updatedBy],
    references: [users.id],
    relationName: "updated_by",
  }),
}));

/**
 * Kitchens
 */
export const kitchensRelations = relations(kitchens, ({ many, one }) => ({
  storage: one(storage, { fields: [kitchens.storageId], references: [storage.id] }),
  drivers: many(drivers),
  beneficiaries: many(beneficiaries),
  userKitchens: many(userKitchens),
  province: one(provinces, { fields: [kitchens.provinceId], references: [provinces.id] }),
  regency: one(regencies, { fields: [kitchens.regencyId], references: [regencies.id] }),
  district: one(districts, { fields: [kitchens.districtId], references: [districts.id] }),
  village: one(villages, { fields: [kitchens.villageId], references: [villages.id] }),
  suppliers: many(suppliers),
  updatedBy: one(users, {
    fields: [kitchens.updatedBy],
    references: [users.id],
    relationName: "updated_by",
  }),
  createdBy: one(users, {
    fields: [kitchens.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
  deliveries: many(deliveries),
  menuPlanKitchen: many(menuPlans),
}));

/**
 * Drivers
 */
export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
    relationName: "drivers_user",
  }),
  kitchen: one(kitchens, { fields: [drivers.kitchenId], references: [kitchens.id] }),
  createdBy: one(users, {
    fields: [drivers.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
  updatedBy: one(users, {
    fields: [drivers.updatedBy],
    references: [users.id],
    relationName: "updated_by",
  }),
  driverLocations: many(driverLocations),
  deliveries: many(deliveries),
}));

/**
 * Driver locations
 */
export const driverLocationsRelations = relations(driverLocations, ({ one }) => ({
  driver: one(drivers, { fields: [driverLocations.driverId], references: [drivers.id] }),
  delivery: one(deliveries, { fields: [driverLocations.deliveryId], references: [deliveries.id] }),
  createdBy: one(users, {
    fields: [driverLocations.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
}));

/**
 * Beneficiaries (former schools)
 */
export const beneficiariesRelations = relations(beneficiaries, ({ many, one }) => ({
  storage: one(storage, { fields: [beneficiaries.storageId], references: [storage.id] }),
  kitchen: one(kitchens, { fields: [beneficiaries.kitchenId], references: [kitchens.id] }),
  userBeneficiaries: many(userBeneficiaries),
  province: one(provinces, { fields: [beneficiaries.provinceId], references: [provinces.id] }),
  regency: one(regencies, { fields: [beneficiaries.regencyId], references: [regencies.id] }),
  district: one(districts, { fields: [beneficiaries.districtId], references: [districts.id] }),
  village: one(villages, { fields: [beneficiaries.villageId], references: [villages.id] }),
  createdBy: one(users, {
    fields: [beneficiaries.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
  updatedBy: one(users, {
    fields: [beneficiaries.updatedBy],
    references: [users.id],
    relationName: "updated_by",
  }),
  menuPlanBeneficiaries: many(menuPlanBeneficiaries),
  deliveryBeneficiaries: many(deliveryBeneficiaries),
  beneficiaryAllergies: many(beneficiaryFoodAllergies),
}));

export const beneficiaryFoodAllergiesRelations = relations(beneficiaryFoodAllergies, ({ one }) => ({
  beneficiary: one(beneficiaries, {
    fields: [beneficiaryFoodAllergies.beneficiaryId],
    references: [beneficiaries.id],
    relationName: "beneficiary_food_allergies_beneficiary",
  }),

  allergicFood: one(foodItems, {
    fields: [beneficiaryFoodAllergies.foodAlergicId],
    references: [foodItems.id],
    relationName: "beneficiary_food_allergies_allergic_food",
  }),

  alternativeFood: one(foodItems, {
    fields: [beneficiaryFoodAllergies.foodAltId],
    references: [foodItems.id],
    relationName: "beneficiary_food_allergies_alternative_food",
  }),
}));

/**
 * beneficiaryPortions (former schoolClassroom)
 */
export const beneficiaryClassRoomRelations = relations(beneficiaryPortions, ({ one, many }) => ({
  menuPlan: one(menuPlans, { fields: [beneficiaryPortions.menuPlanId], references: [menuPlans.id] }),
  storage: many(storage),
  beneficiary: one(beneficiaries, { fields: [beneficiaryPortions.beneficiaryId], references: [beneficiaries.id] }),
  createdBy: one(users, {
    fields: [beneficiaryPortions.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
}));

/**
 * userKitchens relations
 */
export const userKitchensRelations = relations(userKitchens, ({ one }) => ({
  user: one(users, {
    fields: [userKitchens.userId],
    references: [users.id],
    relationName: "user_kitchens_user",
  }),
  kitchen: one(kitchens, { fields: [userKitchens.kitchenId], references: [kitchens.id] }),
  createdBy: one(users, {
    fields: [userKitchens.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
}));

/**
 * userBeneficiaries relations (former userSchools)
 */
export const userBeneficiariesRelations = relations(userBeneficiaries, ({ one }) => ({
  user: one(users, {
    fields: [userBeneficiaries.userId],
    references: [users.id],
    relationName: "user_beneficiaries_user",
  }),
  beneficiary: one(beneficiaries, { fields: [userBeneficiaries.beneficiaryId], references: [beneficiaries.id] }),
  createdBy: one(users, {
    fields: [userBeneficiaries.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
}));

/**
 * Provinces / Regencies / Districts / Villages relations
 */
export const provincesRelations = relations(provinces, ({ many }) => ({
  regencies: many(regencies),
  kitchens: many(kitchens),
  beneficiaries: many(beneficiaries),
}));

export const regenciesRelations = relations(regencies, ({ one, many }) => ({
  province: one(provinces, { fields: [regencies.provinceId], references: [provinces.id] }),
  districts: many(districts),
  kitchens: many(kitchens),
  beneficiaries: many(beneficiaries),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  regency: one(regencies, { fields: [districts.regencyId], references: [regencies.id] }),
  villages: many(villages),
  kitchens: many(kitchens),
  beneficiaries: many(beneficiaries),
}));

export const villagesRelations = relations(villages, ({ one, many }) => ({
  district: one(districts, { fields: [villages.districtId], references: [districts.id] }),
  kitchens: many(kitchens),
  beneficiaries: many(beneficiaries),
  menuPlans: many(menuPlans),
}));

/**
 * Food items relations
 */
export const foodItemsRelations = relations(foodItems, ({ many, one }) => ({
  menuFoodItem: many(menuFoodItem),
  suppliersFoodItems: many(suppliersFoodItems),
  suppliers: many(suppliersFoodItems),
  createdBy: one(users, { fields: [foodItems.createdBy], references: [users.id], relationName: "created_by" }),
  updatedBy: one(users, { fields: [foodItems.updatedBy], references: [users.id], relationName: "updated_by" }),
}));

export const foodConsumptionRelation = relations(foodConsumptionItems, ({ many, one }) => ({
  menuFoodItem: one(menuFoodItem, { fields: [foodConsumptionItems.menuFoodItemId], references: [menuFoodItem.id] }),
  menuPlan: one(menuPlans, { fields: [foodConsumptionItems.menuPlanId], references: [menuPlans.id] }),
}));

export const foodConsumptionNoteRelation = relations(foodConsumptionNotes, ({ many, one }) => ({
  menuPlan: one(menuPlans, { fields: [foodConsumptionNotes.menuPlanId], references: [menuPlans.id] }),
}));

/**
 * Suppliers
 */
export const suppliersRelations = relations(suppliers, ({ many, one }) => ({
  storage: one(storage, { fields: [suppliers.storageId], references: [storage.id] }),
  foodItems: many(suppliersFoodItems),
  foodProducts: many(suppliersProducts),
  kitchen: one(kitchens, { fields: [suppliers.kitchenId], references: [kitchens.id] }),
  createdBy: one(users, { fields: [suppliers.createdBy], references: [users.id], relationName: "created_by" }),
  updatedBy: one(users, { fields: [suppliers.updatedBy], references: [users.id], relationName: "updated_by" }),
}));

/**
 * Suppliers products relations
 */
export const suppliersProductsRelations = relations(suppliersProducts, ({ many, one }) => ({
  menuFoodItem: one(foodItems, { fields: [suppliersProducts.foodItemId], references: [foodItems.id], relationName: "supplier_product" }),
  supplier: one(suppliers, { fields: [suppliersProducts.supplierId], references: [suppliers.id], relationName: "supplier_food_item" }),
  createdBy: one(users, { fields: [suppliersProducts.createdBy], references: [users.id], relationName: "created_by" }),
  updatedBy: one(users, { fields: [suppliersProducts.updatedBy], references: [users.id], relationName: "updated_by" }),
}));

/**
 * SuppliersFoodItems
 */
export const suppliersFoodItemsRelations = relations(suppliersFoodItems, ({ one }) => ({
  supplier: one(suppliers, { fields: [suppliersFoodItems.supplierId], references: [suppliers.id] }),
  foodItem: one(foodItems, { fields: [suppliersFoodItems.foodItemId], references: [foodItems.id] }),
  menuPlan: one(menuPlans, { fields: [suppliersFoodItems.menuPlanId], references: [menuPlans.id] }),
  createdByUser: one(users, { fields: [suppliersFoodItems.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [suppliersFoodItems.updatedBy], references: [users.id] }),
}));

/**
 * MenuFood relations
 */
export const menusFoodRelations = relations(menuFoodItem, ({ one, many }) => ({
  foodItem: one(foodItems, { fields: [menuFoodItem.foodItemId], references: [foodItems.id] }),
  foodConsumtions: many(foodConsumptionItems),
  menuPlan: one(menuPlans, { fields: [menuFoodItem.menuFoodPlanId], references: [menuPlans.id] }),
  createdBy: one(users, { fields: [menuFoodItem.createdBy], references: [users.id], relationName: "created_by" }),
}));

/**
 * MenuPlans relations
 */
export const menuPlansRelations = relations(menuPlans, ({ one, many }) => ({
  village: one(villages, { fields: [menuPlans.villageId], references: [villages.id] }),
  menuFoodItem: many(menuFoodItem),
  dailyReports: many(dailyReports),
  consumptionNote: one(foodConsumptionNotes, { fields: [menuPlans.id], references: [foodConsumptionNotes.menuPlanId] }),
  foodConsumtions: many(foodConsumptionItems),
  beneficiaryClassRoom: many(beneficiaryPortions),
  menuPlanBeneficiaries: many(menuPlanBeneficiaries),
  deliveryBeneficiaries: many(deliveryBeneficiaries),
  menuPlankitchen: one(kitchens, { fields: [menuPlans.kitchenId], references: [kitchens.id], relationName: "kitchen_id" }),
  createdBy: one(users, { fields: [menuPlans.createdBy], references: [users.id], relationName: "created_by" }),
  updatedBy: one(users, { fields: [menuPlans.updatedBy], references: [users.id], relationName: "updated_by" }),
  suppliersFoodItems: many(suppliersFoodItems),
}));

/**
 * menuPlanBeneficiaries relations
 */
export const menuPlanBeneficiariesRelations = relations(menuPlanBeneficiaries, ({ one }) => ({
  menuPlan: one(menuPlans, { fields: [menuPlanBeneficiaries.menuPlanId], references: [menuPlans.id] }),
  beneficiary: one(beneficiaries, { fields: [menuPlanBeneficiaries.beneficiaryId], references: [beneficiaries.id] }),
  createdBy: one(users, { fields: [menuPlanBeneficiaries.createdBy], references: [users.id], relationName: "created_by" }),
}));

/**
 * Deliveries relations
 */
export const deliveriesRelations = relations(deliveries, ({ one, many }) => ({
  kitchen: one(kitchens, { fields: [deliveries.kitchenId], references: [kitchens.id] }),
  driver: one(drivers, { fields: [deliveries.driverId], references: [drivers.id] }),
  deliveryBeneficiaries: many(deliveryBeneficiaries),
  driverLocations: many(driverLocations),
  createdBy: one(users, { fields: [deliveries.createdBy], references: [users.id], relationName: "created_by" }),
  updatedBy: one(users, { fields: [deliveries.updatedBy], references: [users.id], relationName: "updated_by" }),
}));

/**
 * deliveryBeneficiaries relations
 */
export const deliveryBeneficiariesRelations = relations(deliveryBeneficiaries, ({ one, many }) => ({
  delivery: one(deliveries, { fields: [deliveryBeneficiaries.deliveryId], references: [deliveries.id] }),
  beneficiary: one(beneficiaries, { fields: [deliveryBeneficiaries.beneficiaryId], references: [beneficiaries.id] }),
  menuPlan: one(menuPlans, { fields: [deliveryBeneficiaries.menuPlanId], references: [menuPlans.id] }),
  createdBy: one(users, { fields: [deliveryBeneficiaries.createdBy], references: [users.id], relationName: "created_by" }),
  deliveryStepReports: many(deliveryStepReports),
}));

export const deliveryStepReportsRelations = relations(
  deliveryStepReports,
  ({ one }) => ({
    deliveryBeneficiary: one(deliveryBeneficiaries, {
      fields: [deliveryStepReports.deliveryBeneficiaryId],
      references: [deliveryBeneficiaries.id],
    }),
    step: one(masterSteps, {
      fields: [deliveryStepReports.stepId],
      references: [masterSteps.id],
    }),
    createdByUser: one(users, {
      fields: [deliveryStepReports.createdBy],
      references: [users.id],
      relationName: "created_by",
    }),
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  actor: one(users, {
    fields: [notifications.userActorId],
    references: [users.id],
    relationName: "notification_actor",
  }),

  receiver: one(users, {
    fields: [notifications.userReceivedId],
    references: [users.id],
    relationName: "notification_receiver",
  }),
}));