import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/votes/[id] - Get specific vote by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const voteId = parseInt(id);

    if (isNaN(voteId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid vote ID'
      }, { status: 400 });
    }

    // Get the vote with all related data
    const vote = await prisma.vote.findUnique({
      where: { id: voteId },
      include: {
        voter: {
          select: {
            id: true,
            name: true,
            walletId: true,
            createdAt: true
          }
        },
        candidate: {
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        },
        event: {
          select: {
            id: true,
            name: true,
            description: true,
            startTime: true,
            endTime: true,
            createdBy: true,
            isActive: true
          }
        }
      }
    });

    if (!vote) {
      return NextResponse.json({
        success: false,
        error: 'Vote not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: vote
    });

  } catch (error) {
    console.error('Error fetching vote:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}