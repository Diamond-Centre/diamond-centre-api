import { BadRequestError } from "../errors/AppError";

export function parseIdParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);

  if (!raw || Number.isNaN(id) || !Number.isInteger(id) || id <= 0) {
    throw new BadRequestError("Invalid id parameter");
  }

  return id;
}
