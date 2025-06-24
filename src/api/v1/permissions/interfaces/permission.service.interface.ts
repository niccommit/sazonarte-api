import { Permission } from "@prisma/client";
import {
  CreatePermissionInput,
  UpdatePermissionInput,
  PermissionSearchParams,
  BulkPermissionInput,
} from "../permission.validator";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../../interfaces/pagination.interfaces";

/**
 * Permission Service Interface
 *
 * Defines the contract for permission business logic operations.
 *
 * The service layer handles:
 * - Business logic validation
 * - Data transformation
 * - Error handling and custom exceptions
 * - Duplicate checking and constraints
 * - Transaction management
 *
 * All methods throw CustomError for business logic failures:
 * - 404: Resource not found
 * - 409: Conflict (duplicate names, etc.)
 * - 400: Validation errors
 * - 500: Unexpected server errors
 */
export interface PermissionServiceInterface {
  /**
   * Retrieves all permissions with pagination support
   */
  findAllPermissions(
    params: PaginationParams,
  ): Promise<PaginatedResponse<Permission>>;

  /**
   * Finds a specific permission by its unique ID
   */
  findPermissionById(id: number): Promise<Permission>;

  /**
   * Creates a new permission with validation
   */
  createPermission(data: CreatePermissionInput): Promise<Permission>;

  /**
   * Updates an existing permission with validation
   */
  updatePermission(
    id: number,
    data: UpdatePermissionInput,
  ): Promise<Permission>;

  /**
   * Soft deletes a permission by setting deleted flag
   */
  deletePermission(id: number): Promise<Permission>;

  /**
   * Bulk deletes multiple permissions in a single operation
   */
  bulkDeletePermissions(data: BulkPermissionInput): Promise<number>;

  /**
   * Searches permissions with filtering and pagination
   */
  searchPermissions(
    params: PaginationParams & PermissionSearchParams,
  ): Promise<PaginatedResponse<Permission>>;
}
