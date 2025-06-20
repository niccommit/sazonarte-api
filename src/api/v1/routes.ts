import { Router } from "express";
import permissionsRouter from "../v1/permissions/permission.routes";
import rolesRouter from "../v1/roles/role.route";
import authRouter from "../v1/auth/auth.route";
import usersRouter from "../v1/users/user.route";
import profilesRouter from "../v1/profiles/profile.route";
import tablesRouter from "../v1/tables/table.route";
import menusRouter from "../v1/menus/menus.route";

const router = Router();

router.use("/permissions", permissionsRouter);
router.use("/roles", rolesRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/profiles", profilesRouter);
router.use("/tables", tablesRouter);
router.use("/menus", menusRouter);

export default router;
