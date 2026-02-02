import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export interface DecodedToken extends JwtPayload, TokenPayload {}

/**
 * Generate an access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn,
  };
  return jwt.sign(payload, config.jwt.secret, options);
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn,
  };
  return jwt.sign(payload, config.jwt.refreshSecret, options);
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): DecodedToken {
  return jwt.verify(token, config.jwt.secret) as DecodedToken;
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): DecodedToken {
  return jwt.verify(token, config.jwt.refreshSecret) as DecodedToken;
}

/**
 * Decode a token without verification (for debugging)
 */
export function decodeToken(token: string): DecodedToken | null {
  return jwt.decode(token) as DecodedToken | null;
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(expiresIn: string): Date {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(`Invalid expiration format: ${expiresIn}`);
  }

  const [, value, unit] = match;
  const amount = parseInt(value, 10);

  switch (unit) {
    case 's':
      now.setSeconds(now.getSeconds() + amount);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + amount);
      break;
    case 'h':
      now.setHours(now.getHours() + amount);
      break;
    case 'd':
      now.setDate(now.getDate() + amount);
      break;
  }

  return now;
}
