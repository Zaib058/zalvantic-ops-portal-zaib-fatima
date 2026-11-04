import jwt from "jsonwebtoken";

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET as string, {
    expiresIn: "15m",
  });
}