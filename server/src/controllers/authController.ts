import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { User } from "../models/User";
import { signAccessToken } from "../services/tokenService";

// rules for the register body
const registerSchema = z.object({
  name: z.string().trim().min(2, "name is too short"),
  email: z.string().trim().email("invalid email"),
  password: z.string().min(8, "password must be at least 8 characters"),
});
const loginSchema = z.object({
  email: z.string().trim().email("invalid email"),
  password: z.string().min(1, "password is required"),
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

export async function login(req: Request, res: Response, next: NextFunction) {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "validation failed" });
  }

  const { email, password } = result.data;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    // if there is no user we skip compare, user would be null
    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;

    // same message for wrong email and wrong password
    if (!user || !passwordOk) {
      return res.status(401).json({ message: "invalid email or password" });
    }

    const accessToken = signAccessToken(user.id);

    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(res.locals.userId);

    if (!user) {
      return res.status(401).json({ message: "user not found" });
    }

    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    next(err);
  }
}