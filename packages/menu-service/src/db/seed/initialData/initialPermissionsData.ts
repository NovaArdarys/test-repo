import type { PermissionType } from "../../schemas";

interface PermissionSeed {
  name: string;
  type: PermissionType;
  resource: string;
  action: 'read' | 'write' | 'update' | 'delete';
}

export const initialPermissionsData: PermissionSeed[] = [
  { name: "Users Read", type: "API", resource: "/api/users", action: "read" },
  { name: "Users Write (Create)", type: "API", resource: "/api/users", action: "write" },
  { name: "Users Update", type: "API", resource: "/api/users", action: "update" },
  { name: "Users Delete", type: "API", resource: "/api/users", action: "delete" },
  { name: "User Details Read", type: "API", resource: "/api/users/details", action: "read" },
  { name: "User Details Write (Update)", type: "API", resource: "/api/users/details", action: "write" },

  { name: "Roles Read", type: "API", resource: "/api/roles", action: "read" },
  { name: "Roles Write (Create)", type: "API", resource: "/api/roles", action: "write" },
  { name: "Roles Update", type: "API", resource: "/api/roles", action: "update" },
  { name: "Roles Delete", type: "API", resource: "/api/roles", action: "delete" },

  { name: "Permissions Read", type: "API", resource: "/api/permissions", action: "read" },
  { name: "Permissions Write (Create)", type: "API", resource: "/api/permissions", action: "write" },
  { name: "Permissions Update", type: "API", resource: "/api/permissions", action: "update" },
  { name: "Permissions Delete", type: "API", resource: "/api/permissions", action: "delete" },

  { name: "Kitchens Read", type: "API", resource: "/api/kitchens", action: "read" },
  { name: "Kitchens Write (Create)", type: "API", resource: "/api/kitchens", action: "write" },
  { name: "Kitchens Update", type: "API", resource: "/api/kitchens", action: "update" },
  { name: "Kitchens Delete", type: "API", resource: "/api/kitchens", action: "delete" },

  { name: "Drivers Read", type: "API", resource: "/api/drivers", action: "read" },
  { name: "Drivers Write (Create)", type: "API", resource: "/api/drivers", action: "write" },
  { name: "Drivers Update", type: "API", resource: "/api/drivers", action: "update" },
  { name: "Drivers Delete", type: "API", resource: "/api/drivers", action: "delete" },

  { name: "Schools Read", type: "API", resource: "/api/schools", action: "read" },
  { name: "Schools Write (Create)", type: "API", resource: "/api/schools", action: "write" },
  { name: "Schools Update", type: "API", resource: "/api/schools", action: "update" },
  { name: "Schools Delete", type: "API", resource: "/api/schools", action: "delete" },

  { name: "Menus Read", type: "API", resource: "/api/menus", action: "read" },
  { name: "Menus Write (Create)", type: "API", resource: "/api/menus", action: "write" },
  { name: "Menus Update", type: "API", resource: "/api/menus", action: "update" },
  { name: "Menus Delete", type: "API", resource: "/api/menus", action: "delete" },

  { name: "Food Items Read", type: "API", resource: "/api/food-items", action: "read" },
  { name: "Food Items Write (Create)", type: "API", resource: "/api/food-items", action: "write" },
  { name: "Food Items Update", type: "API", resource: "/api/food-items", action: "update" },
  { name: "Food Items Delete", type: "API", resource: "/api/food-items", action: "delete" },

  { name: "Suppliers Read", type: "API", resource: "/api/suppliers", action: "read" },
  { name: "Suppliers Write (Create)", type: "API", resource: "/api/suppliers", action: "write" },
  { name: "Suppliers Update", type: "API", resource: "/api/suppliers", action: "update" },
  { name: "Suppliers Delete", type: "API", resource: "/api/suppliers", action: "delete" },

  { name: "Menu Plans Read", type: "API", resource: "/api/menu-plans", action: "read" },
  { name: "Menu Plans Write (Create)", type: "API", resource: "/api/menu-plans", action: "write" },
  { name: "Menu Plans Update", type: "API", resource: "/api/menu-plans", action: "update" },
  { name: "Menu Plans Delete", type: "API", resource: "/api/menu-plans", action: "delete" },

  { name: "Deliveries Read", type: "API", resource: "/api/deliveries", action: "read" },
  { name: "Deliveries Write (Create)", type: "API", resource: "/api/deliveries", action: "write" },
  { name: "Deliveries Update", type: "API", resource: "/api/deliveries", action: "update" },
  { name: "Deliveries Delete", type: "API", resource: "/api/deliveries", action: "delete" },

  { name: "Delivery Schools Read", type: "API", resource: "/api/delivery-schools", action: "read" },
  { name: "Delivery Schools Write (Create)", type: "API", resource: "/api/delivery-schools", action: "write" },
  { name: "Delivery Schools Update", type: "API", resource: "/api/delivery-schools", action: "update" },
  { name: "Delivery Schools Delete", type: "API", resource: "/api/delivery-schools", action: "delete" },
];
