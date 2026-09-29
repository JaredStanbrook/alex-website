// worker/routes/web/auth.tsx
import { Hono } from "hono";

import { Login } from "@server/views/pages/Login";
import { Register } from "@server/views/pages/Register";
import type { AppEnv } from "../../types";
import { flashToast, htmxRedirect } from "@server/lib/htmx-helpers";

export const webAuth = new Hono<AppEnv>();

/**
 * Sign-in lives at /admin/login: this site has one owner and no public
 * accounts, so signing in is an admin door rather than a visitor feature.
 * It is mounted ahead of the admin sub-app's role guard, which would
 * otherwise redirect the sign-in page to itself.
 */
export const LOGIN_PATH = "/admin/login";

webAuth.get(LOGIN_PATH, async (c) => {
  const { auth, authConfig } = c.var;
  if (auth.user) return c.redirect("/");

  return c.render(
    <Login
      methods={Array.from(authConfig.methods)}
      registrationOpen={await auth.isRegistrationOpen()}
    />,
    { title: "Sign In" },
  );
});

// The old address, for bookmarks and the template's own links.
webAuth.get("/login", (c) => c.redirect(LOGIN_PATH, 301));

webAuth.get("/register", async (c) => {
  const { auth, authConfig } = c.var;
  if (auth.user) return c.redirect("/");

  // With SINGLE_ACCOUNT on, the form only exists until the owner has signed
  // up. The API refuses regardless; this just avoids offering a form that
  // cannot succeed.
  if (!(await auth.isRegistrationOpen())) return c.redirect(LOGIN_PATH);

  const props = {
    methods: Array.from(authConfig.methods),
    // A restricted role would only be refused on submit, so do not offer it.
    roles: (authConfig.roles?.available || ["user"]).filter(
      (role) => !(authConfig.roles?.restricted || []).includes(role),
    ),
    defaultRole: authConfig.roles?.default || "user",
    // The form should state the rule it will be judged by. Without this the
    // page advertised a minimum of 8 while the server enforced whatever
    // PASSWORD_MIN_LENGTH said, so the only way to learn the real rule was to
    // be rejected by it.
    passwordPolicy: authConfig.password,
  };
  return c.render(<Register {...props} />, {
    title: "Create Account",
  });
});

webAuth.post("/web/auth/logout", async (c) => {
  const { auth } = c.var;
  // Awaited: this revokes the session row, and an un-awaited promise can be
  // dropped when the response goes out — leaving a "logged out" user whose
  // token still works.
  await auth.destroySession();

  flashToast(c, "Signed out. See you next time!", {
    type: "success",
  });
  htmxRedirect(c, "/");
  return c.body(null);
});
