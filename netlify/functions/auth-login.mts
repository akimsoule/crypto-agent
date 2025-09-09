import jwt from "jsonwebtoken";
import crypto from "crypto";
import { endpoint, json } from "./_lib/middleware.mts";

// Endpoint: POST /api/auth-login
// Body: { username: string, password: string }
// Response (succès): { success: true, data: { token, user: { id, username, role } } }
// Response (échec):  { success: false, error: string }

interface RawAuthUser {
  id: string;
  username: string;
  password: string;
  role: string;
}
interface PublicUser {
  id: string;
  username: string;
  role: string;
}

// Auth désormais strictement limitée à l'utilisateur demandé.
function getSingleAllowedUser(): RawAuthUser {
  return {
    id: "primary-user",
    username: "soule_akim@yahoo.fr",
    password: "akimsoule", // fourni explicitement par la demande
    role: "admin",
  };
}

function secureEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function toPublic(u: RawAuthUser): PublicUser {
  return { id: u.id, username: u.username, role: u.role };
}

export default endpoint({
  methods: ["POST"],
  auth: false,
  handler: async ({ req }) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return json(
        { success: false, error: "JWT_SECRET manquant côté serveur" },
        500
      );
    }
    const body = (await req.json().catch(() => ({}))) as {
      username?: string;
      password?: string;
    };
    const { username, password } = body;
    if (!username || !password) {
      return json({ success: false, error: "Identifiants requis" }, 400);
    }
    const user = getSingleAllowedUser();
    if (username !== user.username || !secureEqual(user.password, password)) {
      await sleep(150);
      return json({ success: false, error: "Identifiants invalides" }, 401);
    }
    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
    return { token, user: toPublic(user) };
  },
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
