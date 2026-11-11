import { Request, Response, NextFunction } from "express";
import { User, Role } from "../models/User";

// use it after requireAuth, like: requireRole("admin")
export function requireRole(...allowed: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // requireAuth already put the user id in res.locals
      const user = await User.findById(res.locals.userId);

      if (!user) {
        return res.status(401).json({ message: "user not found" });
      }

      if (!allowed.includes(user.role as Role)) {
        return res.status(403).json({ message: "you do not have permission" });
      }

      res.locals.role = user.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
