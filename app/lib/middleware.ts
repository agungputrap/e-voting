import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, verifyToken, JWTPayload } from "./auth";

export function withAuth (handler: (request: NextRequest, payload: JWTPayload) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
        try {
            const token = extractTokenFromRequest(request);

            if (!token) {
                return NextResponse.json(
                    { success: false, error: 'Access token required'},
                    { status: 401}
                );
            }

            const user = await verifyToken(token); // Now async
            return await handler(request, user);
        } catch (error) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired token' },
                { status: 401 }
            );
        }
    };
}