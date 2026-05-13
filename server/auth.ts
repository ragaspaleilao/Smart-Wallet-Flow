import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, registerSchema, loginSchema, type AuthUser } from "@shared/schema";

const SALT_ROUNDS = 10;

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: sessionTtl,
    },
  });
}

function sanitizeUser(user: AuthUser) {
  const { passwordHash, ...rest } = user as any;
  return rest;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const [existing] = await db.select().from(users).where(eq(users.email, data.email));

      let user: AuthUser;
      const hash = await bcrypt.hash(data.password, SALT_ROUNDS);

      if (existing) {
        if (existing.passwordHash) {
          return res.status(409).json({ error: "Esse email já está cadastrado." });
        }
        // existing user without password (e.g., previously logged via OAuth) — set password.
        const [updated] = await db
          .update(users)
          .set({
            passwordHash: hash,
            firstName: data.name ?? existing.firstName,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id))
          .returning();
        user = updated;
      } else {
        const [created] = await db
          .insert(users)
          .values({
            email: data.email,
            passwordHash: hash,
            firstName: data.name ?? null,
          })
          .returning();
        user = created;
      }

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Erro ao iniciar sessão" });
        }
        res.json(sanitizeUser(user));
      });
    } catch (error: any) {
      if (error?.issues) {
        return res.status(400).json({ error: error.issues[0]?.message || "Dados inválidos" });
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "Erro no cadastro" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const [user] = await db.select().from(users).where(eq(users.email, data.email));

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Email ou senha incorretos." });
      }

      const ok = await bcrypt.compare(data.password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: "Email ou senha incorretos." });
      }

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Erro ao iniciar sessão" });
        }
        res.json(sanitizeUser(user));
      });
    } catch (error: any) {
      if (error?.issues) {
        return res.status(400).json({ error: error.issues[0]?.message || "Dados inválidos" });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro no login" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  // Backwards-compatible GET logout (redirects)
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};
