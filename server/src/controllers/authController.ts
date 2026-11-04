import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { User } from "../models/User";

// rules for the register body
const registerSchema = z.object({
  name: z.string().trim().min(2, "name is too short"),
  email: z.string().trim().email("invalid email"),
  password: z.string().min(8, "password must be at least 8 characters"),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  // 1. check the body
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return res.status(400).json({ message: "validation failed", errors });
  }

  const { name, email, password } = result.data;

  try {
    // 2. email already used?
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: "email is already registered" });
    }

    // 3. hash the password, never save the real one
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. save the user
    const user = await User.create({ name, email, passwordHash });

    // 5. send back only safe fields
    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    next(err);
  }
}