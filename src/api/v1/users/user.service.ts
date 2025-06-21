import { User } from "@prisma/client";
import userRepository from "./user.repository";
import { CustomError } from "../../../types/custom-errors";
import { HttpStatus } from "../../../utils/httpStatus.enum";
import { UserServiceInterface } from "./interfaces/user.service.interface";
import { UserRepositoryInterface } from "./interfaces/user.repository.interface";
import { UpdateUserInput } from "./user.validator";
import { RegisterInput } from "../auth/auth.validator";
import { RoleServiceInterface } from "../roles/interfaces/role.service.interface";
import roleService from "../roles/role.service";
import hasherUtils from "../../../utils/hasher.utils";
import { AuthenticatedUser } from "../../../types/express";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";

/**
 * User Service
 *
 * Core business logic layer for user management operations.
 * This service is responsible for:
 * - User CRUD operations with business rules
 * - Data validation and integrity checks
 * - Password hashing and security
 * - Role assignment and validation
 * - Error handling and custom error creation
 *
 * The service follows the dependency injection pattern and
 * implements the UserServiceInterface for consistency.
 */
class UserServices implements UserServiceInterface {
  constructor(
    private userRepository: UserRepositoryInterface,
    private roleService: RoleServiceInterface,
  ) {}

  /**
   * Validates that an email is not already taken by another user.
   * This method is used during user registration and email updates
   * to ensure email uniqueness across the system.
   *
   * @param email - Email address to validate
   * @returns Promise<boolean> - True if email is available
   * @throws CustomError - If email is already taken
   *
   * Error Codes:
   * - EMAIL_CONFLICT: Email already exists in the system
   *
   * This method is private as it's an internal validation helper.
   */
  private async findByEmailOrFail(email: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);
    if (user)
      throw new CustomError(
        `Email ${email} has already been taken. Please use another email.`,
        HttpStatus.CONFLICT,
        "EMAIL_CONFLICT",
      );
    return true;
  }

  /**
   * Validates that a user exists by ID and returns the user if found.
   * This method is used across multiple operations to ensure
   * the user exists before performing any modifications.
   *
   * @param id - User ID to validate
   * @returns Promise<User> - User object if found
   * @throws CustomError - If user is not found
   *
   * Error Codes:
   * - ID_NOT_FOUND: User with the specified ID doesn't exist
   *
   * This method is private as it's an internal validation helper.
   */
  private async findByIdOrFail(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user)
      throw new CustomError(
        `User with ID ${id} not found.`,
        HttpStatus.NOT_FOUND,
        "ID_NOT_FOUND",
      );
    return user;
  }

  /**
   * Validates that all provided role IDs exist in the system.
   * This method ensures data integrity when assigning roles to users
   * by checking that all role IDs reference valid roles.
   *
   * @param roleIds - Array of role IDs to validate
   * @returns Promise<void>
   * @throws CustomError - If any role ID is invalid
   *
   * Error Codes:
   * - INVALID_ROLE_IDS: One or more role IDs don't exist
   *
   * The method removes duplicates and validates each unique role ID.
   */
  private async validateRoleIds(roleIds: number[]) {
    const uniqueRoleIds = [...new Set(roleIds)];

    const rolesExistPromises = uniqueRoleIds.map((id) =>
      this.roleService.findById(id),
    );

    const existingRoles = await Promise.all(rolesExistPromises);

    const nonExistentRoleIds = uniqueRoleIds.filter(
      (id, index) => !existingRoles[index],
    );

    if (nonExistentRoleIds.length > 0)
      throw new CustomError(
        `One or more role IDs are invalid: ${nonExistentRoleIds.join(", ")}.`,
        HttpStatus.BAD_REQUEST,
        "INVALID_ROLE_IDS",
      );
  }

  /**
   * Retrieves a paginated list of all users in the system.
   * This method supports pagination for efficient data retrieval
   * and is typically used for admin interfaces or user management.
   *
   * @param params - Pagination parameters (page, limit)
   * @returns Promise<PaginatedResponse<User>> - Paginated user data
   *
   * The response includes:
   * - Users array with basic user information
   * - Pagination metadata (total, page, limit, etc.)
   * - Excludes sensitive data like passwords
   */
  async findAll(params: PaginationParams): Promise<PaginatedResponse<User>> {
    return this.userRepository.findAll(params);
  }

  /**
   * Retrieves a specific user by their unique identifier.
   * This method validates the user exists before returning the data.
   *
   * @param id - User ID (UUID string)
   * @returns Promise<User> - User object if found
   * @throws CustomError - If user is not found
   *
   * Error Codes:
   * - ID_NOT_FOUND: User with the specified ID doesn't exist
   *
   * Returns complete user information excluding sensitive data.
   */
  async findById(id: string): Promise<User> {
    return this.findByIdOrFail(id);
  }

  /**
   * Retrieves a user by their email address.
   * This method is commonly used during authentication processes
   * and user lookup operations.
   *
   * @param email - User's email address
   * @returns Promise<User> - User object if found
   * @throws CustomError - If user is not found
   *
   * Error Codes:
   * - NOT_FOUND: User with the specified email doesn't exist
   *
   * Note: This method throws an error if the user is not found,
   * unlike findByEmailOrFail which is used for validation.
   */
  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user)
      throw new CustomError(
        `User with email ${email} not found. Please retry.`,
        HttpStatus.CONFLICT,
        "NOT_FOUND",
      );
    return user;
  }

  /**
   * Registers a new user in the system.
   * This method handles the complete user registration process including:
   * - Email uniqueness validation
   * - Password hashing for security
   * - User creation in the database
   * - Role assignment (if provided)
   *
   * @param data - User registration data
   * @returns Promise<User> - Created user object (without password)
   * @throws CustomError - If email is already taken or validation fails
   *
   * Error Codes:
   * - EMAIL_CONFLICT: Email already exists in the system
   *
   * Security Features:
   * - Password is hashed using bcrypt
   * - Password is excluded from the response
   * - Email uniqueness is enforced
   */
  async register(data: RegisterInput): Promise<User> {
    await this.findByEmailOrFail(data.email);

    const hashedPass = hasherUtils.hash(data.password);

    const newUser = await this.userRepository.create({
      ...data,
      password: hashedPass,
    });

    const { password: _password, ...dataWithoutPassword } = newUser;

    return dataWithoutPassword as User;
  }

  /**
   * Updates an existing user's information.
   * This method supports partial updates and includes validation
   * to ensure data integrity and uniqueness.
   *
   * @param id - User ID to update
   * @param data - Update data (all fields optional)
   * @returns Promise<User> - Updated user object
   * @throws CustomError - If user not found or email conflict
   *
   * Error Codes:
   * - ID_NOT_FOUND: User with the specified ID doesn't exist
   * - EMAIL_CONFLICT: Email already exists (if email is being changed)
   *
   * Validation:
   * - Ensures user exists before update
   * - Validates email uniqueness if email is being changed
   * - Supports partial updates (only provided fields are updated)
   */
  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    await this.findByIdOrFail(id);

    if (data.email) await this.findByEmailOrFail(data.email);

    return this.userRepository.update(id, data);
  }

  /**
   * Retrieves a user with their complete role and permission information.
   * This method is essential for authentication and authorization systems
   * as it provides the complete access control context for a user.
   *
   * @param id - User ID
   * @returns Promise<AuthenticatedUser> - User with roles and permissions
   * @throws CustomError - If user is not found
   *
   * Error Codes:
   * - ID_NOT_FOUND: User with the specified ID doesn't exist
   *
   * Response includes:
   * - User basic information
   * - All assigned roles with their details
   * - All permissions from assigned roles
   *
   * This data is typically used for:
   * - JWT token generation
   * - Access control decisions
   * - UI permission rendering
   * - Security audits and logging
   */
  async findUserWithRolesAndPermissions(
    id: string,
  ): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findUserWithPermissions(id);
    if (!user) {
      throw new CustomError(
        `User with ID ${id} not found`,
        HttpStatus.NOT_FOUND,
        "ID_NOT_FOUND",
      );
    }
    return user;
  }
}

export default new UserServices(userRepository, roleService);
