import { getPrisma } from "./prisma.mjs";
import { verifyBearer, type AuthUser } from "./auth.mts";

export interface HandlerContext {
  req: Request;
  prisma: ReturnType<typeof getPrisma>;
  user?: AuthUser;
}

interface EndpointOptions {
  methods: string[]; // méthodes HTTP acceptées
  auth?: boolean; // auth obligatoire ?
  roles?: string[]; // rôles autorisés (si fourni)
  handler: (ctx: HandlerContext) => Promise<unknown> | unknown;
}

export function endpoint(opts: EndpointOptions) {
  const allow = opts.methods.map((m) => m.toUpperCase());
  return async function main(req: Request): Promise<Response> {
    try {
      if (!allow.includes(req.method.toUpperCase())) {
        return json({ success: false, error: "Méthode non autorisée" }, 405);
      }
      const prisma = getPrisma();
      let user: AuthUser | undefined;
      if (opts.auth) {
        const auth = verifyBearer(req);
        if (!auth.ok) {
          return json({ success: false, error: "Non autorisé" }, 401);
        }
        user = auth.user;
        if (
          user &&
          opts.roles &&
          opts.roles.length &&
          !opts.roles.includes(user.role)
        ) {
          return json({ success: false, error: "Accès refusé" }, 403);
        }
      }
      const data = await opts.handler({ req, prisma, user });
      // si le handler retourne déjà une Response on la laisse passer
      if (data instanceof Response) return data;
      return json({ success: true, data });
    } catch (e) {
      return json({ success: false, error: (e as Error).message }, 500);
    }
  };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
