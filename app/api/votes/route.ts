import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken, extractTokenFromRequest } from '../../lib/auth';

const prisma = new PrismaClient();

// GET /api/votes - Get votes by eventId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({
        success: false,
        error: 'eventId parameter is required'
      }, { status: 400 });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) }
    });

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    // Get all votes for the event with related data
    const votes = await prisma.vote.findMany({
      where: { eventId: parseInt(eventId) },
      include: {
        voter: {
          select: {
            id: true,
            name: true,
            walletId: true
          }
        },
        candidate: {
          select: {
            id: true,
            name: true
          }
        },
        event: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get vote summary
    const voteSummary = await prisma.vote.groupBy({
      by: ['candidateId'],
      where: { eventId: parseInt(eventId) },
      _count: {
        candidateId: true
      }
    });

    // Get candidate details for summary
    const candidatesWithVotes = await Promise.all(
      voteSummary.map(async (summary) => {
        const candidate = await prisma.candidate.findUnique({
          where: { id: summary.candidateId }
        });
        return {
          candidateId: summary.candidateId,
          candidateName: candidate?.name,
          voteCount: summary._count.candidateId
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: votes,
      meta: {
        eventId: parseInt(eventId),
        eventName: event.name,
        totalVotes: votes.length,
        voteSummary: candidatesWithVotes
      }
    });

  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/votes - Cast a vote
export async function POST(request: NextRequest) {
  try {
    // Extract and verify authentication token
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    let user;
    try {
      user = await verifyToken(token);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token'
      }, { status: 401 });
    }
    const body = await request.json();
    const { eventId, candidateId } = body;

    // Validate required fields
    if (!eventId || !candidateId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: eventId, candidateId'
      }, { status: 400 });
    }

    // Check if user is a registered voter
    const voter = await prisma.voter.findUnique({
      where: { walletId: user.walletId }
    });

    if (!voter) {
      return NextResponse.json({
        success: false,
        error: 'You must be a registered voter to cast a vote'
      }, { status: 403 });
    }

    // Check if event exists and is active
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) }
    });

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    if (!event.isActive) {
      return NextResponse.json({
        success: false,
        error: 'This event is not active'
      }, { status: 400 });
    }

    // Check if voting period is active
    const now = new Date();
    if (now < event.startTime) {
      return NextResponse.json({
        success: false,
        error: 'Voting has not started yet'
      }, { status: 400 });
    }

    if (now > event.endTime) {
      return NextResponse.json({
        success: false,
        error: 'Voting has ended'
      }, { status: 400 });
    }

    // Check if candidate exists and belongs to the event
    const candidate = await prisma.candidate.findFirst({
      where: { 
        id: parseInt(candidateId),
        eventId: parseInt(eventId)
      }
    });

    if (!candidate) {
      return NextResponse.json({
        success: false,
        error: 'Candidate not found in this event'
      }, { status: 404 });
    }

    // Check if voter has already voted in this event
    const existingVote = await prisma.vote.findFirst({
      where: {
        voterId: voter.id,
        eventId: parseInt(eventId)
      }
    });

    if (existingVote) {
      return NextResponse.json({
        success: false,
        error: 'You have already voted in this event'
      }, { status: 409 });
    }

    // Generate hardcoded blockAddress (placeholder for NFT minting)
    const blockAddress = `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`;

    // Create the vote
    const vote = await prisma.vote.create({
      data: {
        voterId: voter.id,
        eventId: parseInt(eventId),
        candidateId: parseInt(candidateId),
        blockAddress: blockAddress
      },
      include: {
        voter: {
          select: {
            id: true,
            name: true,
            walletId: true
          }
        },
        candidate: {
          select: {
            id: true,
            name: true
          }
        },
        event: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: vote,
      message: 'Vote cast successfully',
      blockAddress: blockAddress
    }, { status: 201 });

  } catch (error) {
    console.error('Error casting vote:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}