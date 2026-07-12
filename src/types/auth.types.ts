/**
 * JWT token payload shape.
 */
export interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Return shape for successful authentication.
 */
export interface LoginResult {
  token: string;
  user: {
    email: string;
    role: string;
  };
}
