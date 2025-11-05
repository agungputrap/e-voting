import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromRequest, blacklistToken } from '@/app/lib/auth';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
    try {
        const token = extractTokenFromRequest(request);
        
        if (!token) {
            return NextResponse.json(
                { error: 'No token provided' },
                { status: 400 }
            );
        }

        // Decode token to get user info and expiration
        const decoded = jwt.decode(token) as any;
        
        if (!decoded || !decoded.userId || !decoded.exp) {
            return NextResponse.json(
                { error: 'Invalid token format' },
                { status: 400 }
            );
        }

        // Convert exp (seconds since epoch) to Date
        const expiresAt = new Date(decoded.exp * 1000);
        
        // Add token to blacklist
        await blacklistToken(token, decoded.userId, expiresAt);

        return NextResponse.json({
            success: true,
            message: 'Logged out successfully and token invalidated'
        });

    } catch (error) {
        console.error('Error during logout:', error);
        return NextResponse.json(
            { error: 'Internal server error during logout' },
            { status: 500 }
        );
    }
}