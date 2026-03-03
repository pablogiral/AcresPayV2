import test from "node:test";
import assert from "node:assert/strict";
import { withUserIdOnSession, withUserIdOnToken } from "@/lib/auth/session-helpers";

test("withUserIdOnToken stores the user id in token.sub", () => {
  const token = withUserIdOnToken({}, { id: "usr_123" });
  assert.equal(token.sub, "usr_123");
});

test("withUserIdOnToken leaves token untouched when user has no id", () => {
  const token = withUserIdOnToken({ sub: "existing" }, {});
  assert.equal(token.sub, "existing");
});

test("withUserIdOnSession copies token.sub into session.user.id", () => {
  const session = withUserIdOnSession({ user: {} }, { sub: "usr_456" });
  assert.equal(session.user?.id, "usr_456");
});

test("withUserIdOnSession does not throw when session has no user", () => {
  const session = withUserIdOnSession({}, { sub: "usr_789" });
  assert.deepEqual(session, {});
});
