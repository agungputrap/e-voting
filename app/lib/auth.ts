import jwt, { SignOptions } from "jsonwebtoken";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const envJwtSecret = process.env.JWT_SECRET;
if (!envJwtSecret) {
  throw new Error("JWT_SECRET is not configured");
}
const JWT_SECRET = envJwtSecret;

export interface JWTPayload {
  userId: number;
  walletId: string;
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for blacklist tracking
}

export function generateToken(payload: {
  userId: number;
  walletId: string;
}): string {
  // Generate a unique JWT ID for blacklist tracking
  const jti = `${payload.userId}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const signOptions: SignOptions = { expiresIn: 7 * 24 * 60 * 60 }; // 7 days

  return jwt.sign(
    {
      userId: payload.userId,
      walletId: payload.walletId,
      jti,
    },
    JWT_SECRET,
    signOptions
  );
export function generateToken(payload: { userId: number; walletId: string}): string {
    // Generate a unique JWT ID for blacklist tracking
    const jti = `${payload.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return jwt.sign(
        { 
            userId: payload.userId,
            walletId: payload.walletId,
            jti 
        },
        process.env.JWT_SECRET as string,
        { 
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        } as jwt.SignOptions
    );
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  // First verify the JWT signature and expiration
  const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

  // Check if token is blacklisted
  const blacklistedToken = await prisma.tokenBlacklist.findUnique({
    where: { token },
  });

  if (blacklistedToken) {
    throw new Error("Token has been revoked");
  }

  return payload;
}

export async function blacklistToken(
  token: string,
  userId: number,
  expiresAt: Date
): Promise<void> {
  try {
    const payload = jwt.decode(token) as JWTPayload;

    await prisma.tokenBlacklist.create({
      data: {
        token,
        jti: payload?.jti || null,
        userId,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Error blacklisting token:", error);
    throw error;
  }
}

export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

export function generateNonce(): string {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000000);
  return `Please sign this message to verify wallet ownership: ${timestamp} - ${randomNum}`;
}

export function createSignatureMessage(
  walletAddress: string,
  nonce: string
): string {
  return `Welcome to E-Voting System!\n\nWallet: ${walletAddress}\nNonce: ${nonce}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;
}
