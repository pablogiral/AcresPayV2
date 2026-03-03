type SessionLike = {
  user?: {
    id?: string;
  } | null;
};

type TokenLike = {
  sub?: string | null;
};

type UserLike = {
  id?: string | null;
};

export function withUserIdOnToken<T extends TokenLike>(token: T, user?: UserLike | null) {
  if (user?.id) {
    token.sub = user.id;
  }

  return token;
}

export function withUserIdOnSession<T extends SessionLike, U extends TokenLike>(session: T, token: U) {
  if (session.user) {
    session.user.id = token.sub ?? "";
  }

  return session;
}
