import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/tokenService";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  // token must come as "Bearer <token>"
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "missing token" });
  }

  const token = header.split(" ")[1];

  try {
    const userId = verifyAccessToken(token);
    res.locals.userId = userId;
    next();
  } catch (err) {
    res.status(401).json({ message: "invalid or expired token" });
  }
}
