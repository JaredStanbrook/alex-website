import { Hono } from "hono";

import { globalRenderer } from "./middleware/renderer.middleware.tsx";
import { requireUser, requireRole } from "./middleware/guard.middleware.ts";

import { ProfilePage } from "./views/pages/Profile";
import type { SafeUser } from "./schema/auth.schema.ts";

import { apiAuth } from "./routes/api/auth";
import { webAuth } from "./routes/web/auth";
import { logsRoute } from "./routes/admin/logs";
import { seoRoute } from "./routes/seo";
import devRouter from "./routes/dev.tsx";

import { homeRoute } from "./routes/study/home.tsx";
import { publicRoute } from "./routes/study/public.tsx";
import { semestersRoute } from "./routes/study/semesters.tsx";
import { subjectsRoute } from "./routes/study/subjects.tsx";
import { assignmentsRoute } from "./routes/study/assignments.tsx";
import { examsRoute } from "./routes/study/exams.tsx";
import { plannerRoute } from "./routes/study/planner.tsx";
import { notesRoute } from "./routes/study/notes.tsx";
import { resourcesRoute } from "./routes/study/resources.tsx";
import { flashcardsRoute } from "./routes/study/flashcards.tsx";
import { gradesRoute } from "./routes/study/grades.tsx";

import type { AppEnv } from "./types";

// ==========================================
// 1. ADMIN SUB-APP (RBAC protected)
// ==========================================
// Everything mounted here is admin-only. Add feature routers below rather
// than re-declaring the role check on each one.
const admin = new Hono<AppEnv>();
admin.use("*", requireRole("admin"));
admin.route("/logs", logsRoute);

// ==========================================
// 2. MAIN APP
// ==========================================
const app = new Hono<AppEnv>()
  // robots.txt and sitemap.xml. Before the renderer, since neither is HTML.
  .route("/", seoRoute)

  // Database inspector. Dev-only — see routes/dev.tsx.
  .route("/dev", devRouter)

  // Global renderer (wraps SSR responses in Layout).
  .use("*", globalRenderer)

  // Sign-in, sign-up and sign-out. Before /admin, because /admin/login has to
  // be reachable by someone who is not signed in yet.
  .route("/", webAuth)

  .route("/admin", admin)

  // "/" — Today for the owner, the public front page for everyone else.
  .route("/", homeRoute)

  // Signed-out pages for content the owner made public.
  .route("/public", publicRoute)

  // The study hub itself. Each router guards itself with requireRole("admin").
  .route("/semesters", semestersRoute)
  .route("/subjects", subjectsRoute)
  .route("/assignments", assignmentsRoute)
  .route("/exams", examsRoute)
  .route("/planner", plannerRoute)
  .route("/notes", notesRoute)
  .route("/resources", resourcesRoute)
  .route("/flashcards", flashcardsRoute)
  .route("/grades", gradesRoute)

  // Any signed-in user can view their own profile.
  .get("/profile", requireUser, (c) => {
    const { auth } = c.var;

    // requireUser guarantees auth.user exists.
    const props = {
      user: auth.user as SafeUser,
      config: c.var.authConfig,
    };
    return c.render(<ProfilePage {...props} />, {
      title: "Profile",
    });
  })

  // ==========================================
  // 3. JSON API
  // ==========================================
  .basePath("/api")
  .route("/auth", apiAuth);

export type AppType = typeof app;
export default app;
