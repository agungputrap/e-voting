import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '@/app/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const { walletId } = await request.json();

        if (!walletId) {
            return NextResponse.json(
                { error: 'Wallet ID is required' },
                { status: 400 }
            );
        }

        // Find voter with this wallet ID
        const voter = await prisma.voter.findUnique({
            where: { walletId: walletId.toLowerCase() }
        });

        if (!voter) {
            return NextResponse.json(
                { error: 'Wallet ID not found. Please register first.' },
                { status: 404 }
            );
        }

        // Update voter's last login
        await prisma.voter.update({
            where: { id: voter.id },
            data: {
                lastLogin: new Date(),
            },
        });

        // Generate JWT token
        const token = generateToken({
            userId: voter.id,
            walletId: voter.walletId
        });

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: voter.id,
                walletId: voter.walletId,
                name: voter.name,
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
