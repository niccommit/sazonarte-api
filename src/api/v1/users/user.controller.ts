import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import userService from "./user.service";
import { HttpStatus } from "../../../utils/httpStatus.enum";
import { UpdateUserInput } from "./user.validator";
import { PaginationParams } from "../../../interfaces/pagination.interfaces";

class UserController {
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string);
    const limit = parseInt(req.query.limit as string);

    const params: PaginationParams = { page, limit };

    const users = await userService.findAll(params);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Users fetched success",
      data: users,
    });
  });

  getUser = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    const user = await userService.findById(id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  });

  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const data: UpdateUserInput = req.body;

    const userUpdated = await userService.updateUser(id, data);

    res.status(HttpStatus.ACCEPTED).json({
      success: true,
      message: "User updated successfully",
      data: userUpdated,
    });
  });
}

export default new UserController();
