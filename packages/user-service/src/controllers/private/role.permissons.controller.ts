import { catchAsync } from "../../utils/catchAsync";
import { isEmpty } from "lodash";
import { getPermissionsByRoleId } from "@/services/repositories/role.permission.service";

export const rolePermissionsHandler = catchAsync(async (c) => {
  const roleId = c.req.param('roleId');

  const findUser = await getPermissionsByRoleId(roleId);

  if (isEmpty(findUser)) {
    return c.json({
      data: [],
    });
  }

  return c.json({
    data: findUser,
  });
});
