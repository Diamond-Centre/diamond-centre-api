export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public error: string = "Error"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, "Not Found");
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message, "Bad Request");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message, "Unauthorized");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "Conflict");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message, "Forbidden");
  }
}
