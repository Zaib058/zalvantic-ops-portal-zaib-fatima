import jwt from "jsonwebtoken";

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET as string, {
    expiresIn: "15m",
  });
}

export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, process.env.JWT_SECRET as string);

  if (typeof payload === "string" || !payload.sub) {
    throw new Error("bad token");
  }
  return payload.sub;
}
