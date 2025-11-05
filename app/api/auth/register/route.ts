import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/app/generated/prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const { walletId, name } = await request.json();

        if (!walletId) {
            return NextResponse.json(
                { error: 'Wallet ID is required' },
                { status: 400 }
            );
        }

        // Check if voter already exists
        const existingVoter = await prisma.voter.findUnique({
            where: { walletId: walletId.toLowerCase() }
        });

        if (existingVoter) {
            return NextResponse.json(
                { error: 'Wallet ID already registered' },
                { status: 409 }
            );
        }

        // Create new voter
        const voter = await prisma.voter.create({
            data: {
                walletId: walletId.toLowerCase(),
                name: name || '',
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Voter registered successfully',
            user: {
                id: voter.id,
                walletId: voter.walletId,
                name: voter.name,
            }
        });

    } catch (error) {
        console.error('Error during registration:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}