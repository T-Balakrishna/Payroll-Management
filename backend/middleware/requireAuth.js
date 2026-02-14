import jwt from "jsonwebtoken";
export default function requireAuth(req, res, next) {
  const token = req.cookies.access_token;

  if (!token) {
    return res.sendStatus(401);
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.sendStatus(403);
  }
}
