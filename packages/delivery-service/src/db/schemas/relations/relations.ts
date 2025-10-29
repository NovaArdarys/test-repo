import { relations } from "drizzle-orm";
import { menusApp, permissions, rolePermissions, roles, userDetails, userRoles, users, userSessions, userTokens } from "../user.schema";
import { appLogs, tokenLogs } from "../log.schema";
import { kitchens, userKitchens } from "../kitchen.schema";
import { driverLocations, drivers } from "../driver.schema";
import { schools, userSchools } from "../school.schema";
import { foodItems, menuPlans, menuPlanSchoolsKitchen, menuFoodItem } from "../food.schema";
import { suppliers, suppliersFoodItems, suppliersProducts } from "../supplier.schema";
import { deliveries, deliverySchools } from "../delivery.schema";
import { districts, provinces, regencies, villages } from "../master.schema";
import { dailyReports, stepReports } from "../reporting.Schema";
import { masterSteps } from "../stepPlan.schema";
import { storage } from "../storage.schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  userDetails: one(userDetails, { fields: [users.id], references: [userDetails.userId] }),
  userSessions: many(userSessions),
  userTokens: many(userTokens),
  tokenLogs: many(tokenLogs),
  appLogs: many(appLogs),
  userRoles: many(userRoles, { relationName: 'userToRoles' }),
  createdUsers: many(users, { relationName: 'created_by' }),
  updatedUsers: many(users, { relationName: 'updated_by' }),
  createdUserDetails: many(userDetails, { relationName: 'created_by' }),
  updatedUserDetails: many(userDetails, { relationName: 'updated_by' }),
  createdUserSessions: many(userSessions, { relationName: 'created_by' }),
  createdUserTokens: many(userTokens, { relationName: 'created_by' }),
  createdTokenLogs: many(tokenLogs, { relationName: 'created_by' }),
  createdAppLogs: many(appLogs, { relationName: 'created_by' }),
  createdRoles: many(roles, { relationName: 'created_by' }),
  updatedRoles: many(roles, { relationName: 'updated_by' }),
  createdPermissions: many(permissions, { relationName: 'created_by' }),
  updatedPermissions: many(permissions, { relationName: 'updated_by' }),
  createdUserRoles: many(userRoles, { relationName: 'createdByUserRoles' }),

  createdRolePermissions: many(rolePermissions, { relationName: 'created_by' }),
  createdMenusApp: many(menusApp, { relationName: 'created_by' }),
  updatedMenusApp: many(menusApp, { relationName: 'updated_by' }),
  userKitchens: many(userKitchens, { relationName: 'user_kitchens_user' }),
  userSchools: many(userSchools, { relationName: 'user_schools_user' }),
  drivers: many(drivers, { relationName: 'drivers_user' }),
  createdFoodItems: many(foodItems, { relationName: 'created_by' }),
  updatedFoodItems: many(foodItems, { relationName: 'updated_by' }),
  createdSuppliers: many(suppliers, { relationName: 'created_by' }),
  updatedSuppliers: many(suppliers, { relationName: 'updated_by' }),
  createdmenuFoodItem: many(menuFoodItem, { relationName: 'created_by' }),
  createdMenuPlans: many(menuPlans, { relationName: 'created_by' }),
  updatedMenuPlans: many(menuPlans, { relationName: 'updated_by' }),
  createdMenuPlanSchoolsKitchen: many(menuPlanSchoolsKitchen, { relationName: 'created_by' }),
  createdDeliveries: many(deliveries, { relationName: 'created_by' }),
  updatedDeliveries: many(deliveries, { relationName: 'updated_by' }),
  createdDeliverySchools: many(deliverySchools, { relationName: 'created_by' }),
}));

export const storageRelations = relations(storage, ({ many }) => ({
  userDetails: many(userDetails),
  dailyReports: many(stepReports),
  kitchens: many(kitchens),
  suppliers: many(suppliers),
  schools: many(schools),
}));

export const userDetailsRelations = relations(userDetails, ({ one }) => ({
  user: one(users, { fields: [userDetails.userId], references: [users.id] }),
  createdBy: one(users, { fields: [userDetails.createdBy], references: [users.id], relationName: 'created_by' }),
  updatedBy: one(users, { fields: [userDetails.updatedBy], references: [users.id], relationName: 'updated_by' }),
  storage: one(storage, { fields: [userDetails.storageId], references: [storage.id] }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
  createdBy: one(users, { fields: [userSessions.createdBy], references: [users.id], relationName: 'created_by' }),
}));

export const userTokensRelations = relations(userTokens, ({ one, many }) => ({
  user: one(users, { fields: [userTokens.userId], references: [users.id] }),
  tokenLogs: many(tokenLogs),
  createdBy: one(users, { fields: [userTokens.createdBy], references: [users.id], relationName: 'created_by' }),
}));

export const tokenLogsRelations = relations(tokenLogs, ({ one }) => ({
  token: one(userTokens, { fields: [tokenLogs.tokenId], references: [userTokens.id] }),
  user: one(users, { fields: [tokenLogs.userId], references: [users.id] }),
  createdBy: one(users, { fields: [tokenLogs.createdBy], references: [users.id], relationName: 'created_by' }),
}));

export const appLogsRelations = relations(appLogs, ({ one }) => ({
  user: one(users, { fields: [appLogs.userId], references: [users.id] }),
  createdBy: one(users, { fields: [appLogs.createdBy], references: [users.id], relationName: 'created_by' }),
}));

export const rolesRelations = relations(roles, ({ many, one }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
  createdBy: one(users, { fields: [roles.createdBy], references: [users.id], relationName: 'created_by' }),
  updatedBy: one(users, { fields: [roles.updatedBy], references: [users.id], relationName: 'updated_by' }),
}));

export const permissionsRelations = relations(permissions, ({ many, one }) => ({
  rolePermissions: many(rolePermissions),
  createdBy: one(users, { fields: [permissions.createdBy], references: [users.id], relationName: 'created_by' }),
  updatedBy: one(users, { fields: [permissions.updatedBy], references: [users.id], relationName: 'updated_by' }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  // 🎯 FIX 2A: Match the unique functional relation name
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
    relationName: 'userToRoles'
  }),

  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),

  // 🎯 FIX 2B: Match the unique audit relation name
  createdBy: one(users, {
    fields: [userRoles.createdBy],
    references: [users.id],
    relationName: 'createdByUserRoles'
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
  createdBy: one(users, { fields: [rolePermissions.createdBy], references: [users.id], relationName: 'created_by' }),
}));

export const menusAppRelations = relations(menusApp, ({ one, many }) => ({
  parent: one(menusApp, { fields: [menusApp.parentId], references: [menusApp.id] }),
  children: many(menusApp),
  createdBy: one(users, { fields: [menusApp.createdBy], references: [users.id], relationName: 'created_by' }),
  updatedBy: one(users, { fields: [menusApp.updatedBy], references: [users.id], relationName: 'updated_by' }),
}));

export const kitchensRelations = relations(kitchens, ({ many, one }) => ({
  storage: one(storage, { fields: [kitchens.storageId], references: [storage.id] }),
  drivers: many(drivers),
  schools: many(schools),
  userKitchens: many(userKitchens),
  province: one(provinces, { fields: [kitchens.provinceId], references: [provinces.id] }),
  regency: one(regencies, { fields: [kitchens.regencyId], references: [regencies.id] }),
  district: one(districts, { fields: [kitchens.districtId], references: [districts.id] }),
  village: one(villages, { fields: [kitchens.villageId], references: [villages.id] }),
  suppliers: many(suppliers),
  updatedBy: one(users, { fields: [kitchens.updatedBy], references: [users.id], relationName: 'updated_by' }),
  deliveries: many(deliveries),
  menuPlanSchoolsKitchen: many(menuPlanSchoolsKitchen),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, { fields: [drivers.userId], references: [users.id], relationName: 'drivers_user' }),
  kitchen: one(kitchens, { fields: [drivers.kitchenId], references: [kitchens.id] }),
  createdBy: one(users, { fields: [drivers.createdBy], references: [users.id], relationName: 'created_by' }),
  updatedBy: one(users, { fields: [drivers.updatedBy], references: [users.id], relationName: 'updated_by' }),
  driverLocations: many(driverLocations),
  deliveries: many(deliveries),
}));

export const driverLocationsRelations = relations(driverLocations, ({ one }) => ({
  driver: one(drivers, { fields: [driverLocations.driverId], references: [drivers.id] }),
  delivery: one(deliveries, { fields: [driverLocations.deliveryId], references: [deliveries.id] }),
  createdBy: one(users, { fields: [driverLocations.createdBy], references: [users.id], relationName: 'created_by' }),
}));

export const schoolsRelations = relations(schools, ({ many, one }) => ({
  storage: one(storage, { fields: [schools.storageId], references: [storage.id] }),
  kitchen: one(kitchens, { fields: [schools.kitchenId], references: [kitchens.id] }),
  userSchools: many(userSchools),
  province: one(provinces, { fields: [schools.provinceId], references: [provinces.id] }),
  regency: one(regencies, { fields: [schools.regencyId], references: [regencies.id] }),
  district: one(districts, { fields: [schools.districtId], references: [districts.id] }),
  village: one(villages, { fields: [schools.villageId], references: [villages.id] }),
  createdBy: one(users, { fields: [schools.createdBy], references: [users.id], relationName: 'created_by' }),
  updatedBy: one(users, { fields: [schools.updatedBy], references: [users.id], relationName: 'updated_by' }),
  menuPlanSchoolsKitchen: many(menuPlanSchoolsKitchen),
  deliverySchools: many(deliverySchools),
}));

export const userKitchensRelations = relations(userKitchens, ({ one }) => ({
  user: one(users, {
    fields: [userKitchens.userId],
    references: [users.id],
    relationName: "user_kitchens_user",
  }),
  kitchen: one(kitchens, { fields: [userKitchens.kitchenId], references: [kitchens.id] }),
  createdBy: one(users, { fields: [userKitchens.createdBy], references: [users.id], relationName: 'created_by' }),
}));

export const userSchoolsRelations = relations(userSchools, ({ one }) => ({
  user: one(users, {
    fields: [userSchools.userId],
    references: [users.id],
    relationName: "user_schools_user",
  }), school: one(schools, { fields: [userSchools.schoolId], references: [schools.id] }),
  createdBy: one(users, { fields: [userSchools.createdBy], references: [users.id], relationName: 'created_by' }),
}));

export const provincesRelations = relations(provinces, ({ many }) => ({
  regencies: many(regencies),
  kitchens: many(kitchens),
  schools: many(schools),
}));

export const regenciesRelations = relations(regencies, ({ one, many }) => ({
  province: one(provinces, { fields: [regencies.provinceId], references: [provinces.id] }),
  districts: many(districts),
  kitchens: many(kitchens),
  schools: many(schools),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  regency: one(regencies, { fields: [districts.regencyId], references: [regencies.id] }),
  villages: many(villages),
  kitchens: many(kitchens),
  schools: many(schools),
}));

export const villagesRelations = relations(villages, ({ one, many }) => ({
  district: one(districts, { fields: [villages.districtId], references: [districts.id] }),
  kitchens: many(kitchens),
  schools: many(schools),
  menuPlans: many(menuPlans),
}));

export const foodItemsRelations = relations(foodItems, ({ many, one }) => ({
  menuFoodItem: many(menuFoodItem),
  menuFoodProducts: many(foodItems),
  suppliersFoodItems: many(suppliersFoodItems),
  suppliers: many(suppliersFoodItems),
  createdBy: one(users, { fields: [foodItems.createdBy], references: [users.id], relationName: 'created_by' }),
  updatedBy: one(users, { fields: [foodItems.updatedBy], references: [users.id], relationName: 'updated_by' }),
}));


export const suppliersRelations = relations(suppliers, ({ many, one }) => ({
  storage: one(storage, { fields: [suppliers.storageId], references: [storage.id] }),
  foodItems: many(suppliersFoodItems),
  foodProducts: many(suppliersProducts),
  kitchen: one(kitchens, { fields: [suppliers.kitchenId], references: [kitchens.id] }),
  createdBy: one(users, { fields: [suppliers.createdBy], references: [users.id], relationName: 'created_by' }),
  updatedBy: one(users, { fields: [suppliers.updatedBy], references: [users.id], relationName: 'updated_by' }),
}));

export const suppliersProductsRelations = relations(suppliersProducts, ({ many, one }) => ({
  menuFoodItem: one(foodItems, { fields: [suppliersProducts.foodItemId], references: [foodItems.id], relationName: 'supplier_product' }),
  supplier: one(suppliers, { fields: [suppliersProducts.supplierId], references: [suppliers.id], relationName: 'supplier_food_item' }),
  createdBy: one(users, { fields: [suppliersProducts.createdBy], references: [users.id], relationName: 'created_by' }),
  updatedBy: one(users, { fields: [suppliersProducts.updatedBy], references: [users.id], relationName: 'updated_by' }),
}));

export const suppliersFoodItemsRelations = relations(suppliersFoodItems, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [suppliersFoodItems.supplierId],
    references: [suppliers.id],
  }),
  foodItem: one(foodItems, {
    fields: [suppliersFoodItems.foodItemId],
    references: [foodItems.id],
  }),
  menuPlan: one(menuPlans, {
    fields: [suppliersFoodItems.menuPlanId],
    references: [menuPlans.id],
  }),
  createdByUser: one(users, {
    fields: [suppliersFoodItems.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [suppliersFoodItems.updatedBy],
    references: [users.id],
  }),
}));

export const menusFoodRelations = relations(menuFoodItem, ({ one }) => ({
  foodItem: one(foodItems, { fields: [menuFoodItem.foodItemId], references: [foodItems.id] }),
  menuPlan: one(menuPlans, { fields: [menuFoodItem.menuFoodPlanId], references: [menuPlans.id] }),
  createdBy: one(users, { fields: [menuFoodItem.createdBy], references: [users.id], relationName: 'created_by' }),
}));

export const menuPlansRelations = relations(menuPlans, ({ one, many }) => ({
  village: one(villages, { fields: [menuPlans.villageId], references: [villages.id] }),
  menuFoodItem: many(menuFoodItem),
  dailyReports: many(dailyReports),
  menuPlanSchoolsKitchen: many(menuPlanSchoolsKitchen),
  deliverySchools: many(deliverySchools),
  createdBy: one(users, { fields: [menuPlans.createdBy], references: [users.id], relationName: 'created_by' }),
  updatedBy: one(users, { fields: [menuPlans.updatedBy], references: [users.id], relationName: 'updated_by' }),
  suppliersFoodItems: many(suppliersFoodItems),
}));

export const menuPlanSchoolsKitchenRelations = relations(menuPlanSchoolsKitchen, ({ one }) => ({
  menuPlan: one(menuPlans, { fields: [menuPlanSchoolsKitchen.menuPlanId], references: [menuPlans.id] }),
  school: one(schools, { fields: [menuPlanSchoolsKitchen.schoolId], references: [schools.id] }),
  kitchen: one(kitchens, { fields: [menuPlanSchoolsKitchen.kitchenId], references: [kitchens.id] }),
  createdBy: one(users, { fields: [menuPlanSchoolsKitchen.createdBy], references: [users.id], relationName: 'created_by' }),
}));

export const deliveriesRelations = relations(deliveries, ({ one, many }) => ({
  kitchen: one(kitchens, { fields: [deliveries.kitchenId], references: [kitchens.id] }),
  driver: one(drivers, { fields: [deliveries.driverId], references: [drivers.id] }),
  deliverySchools: many(deliverySchools),
  driverLocations: many(driverLocations),
  createdBy: one(users, { fields: [deliveries.createdBy], references: [users.id], relationName: 'created_by' }),
  updatedBy: one(users, { fields: [deliveries.updatedBy], references: [users.id], relationName: 'updated_by' }),
}));

export const deliverySchoolsRelations = relations(deliverySchools, ({ one }) => ({
  delivery: one(deliveries, { fields: [deliverySchools.deliveryId], references: [deliveries.id] }),
  school: one(schools, { fields: [deliverySchools.schoolId], references: [schools.id] }),
  menuPlan: one(menuPlans, { fields: [deliverySchools.menuPlanId], references: [menuPlans.id] }),
  createdBy: one(users, { fields: [deliverySchools.createdBy], references: [users.id], relationName: 'created_by' }),
}));

/* ==============================
   DAILY REPORT RELATIONS
   ============================== */
export const dailyReportsRelations = relations(dailyReports, ({ many, one }) => ({
  // Relasi ke step reports
  steps: many(stepReports),
  menuPlan: one(menuPlans, {
    fields: [dailyReports.menuPlanId],
    references: [menuPlans.id],
  }),
  // Relasi ke user (pembuat & pengupdate)
  createdByUser: one(users, {
    fields: [dailyReports.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [dailyReports.updatedBy],
    references: [users.id],
  }),
}));

/* ==============================
   STEP REPORT RELATIONS
   ============================== */
export const stepReportsRelations = relations(stepReports, ({ one }) => ({
  // Relasi ke daily report induknya
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
}));