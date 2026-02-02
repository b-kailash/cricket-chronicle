import { prisma } from '../config/database';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpiration,
  TokenPayload,
} from '../utils/jwt';
import { ApiError } from '../middleware/errorHandler';
import { config } from '../config';
import { UserRole } from '@prisma/client';

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
  };
}

class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { email, password, firstName, lastName, role = UserRole.PUBLIC } = input;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw ApiError.badRequest('Password does not meet requirements', 'WEAK_PASSWORD', {
        errors: passwordValidation.errors,
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw ApiError.conflict('Email already registered', 'EMAIL_EXISTS');
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role,
      },
    });

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw ApiError.unauthorized('Account is not active', 'ACCOUNT_INACTIVE');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify the refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Check if token exists in database and is not revoked
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!storedToken) {
      throw ApiError.unauthorized('Refresh token has been revoked or expired', 'TOKEN_REVOKED');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw ApiError.unauthorized('User not found or inactive', 'USER_INACTIVE');
    }

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Store new refresh token
    await this.storeRefreshToken(user.id, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        token: refreshToken,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(userId: number, token: string): Promise<void> {
    const expiresAt = getTokenExpiration(config.jwt.refreshExpiresIn);

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    // Clean up old tokens for this user (keep only last 5)
    const tokens = await prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 5,
    });

    if (tokens.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: {
          id: { in: tokens.map(t => t.id) },
        },
      });
    }
  }
}

export const authService = new AuthService();
