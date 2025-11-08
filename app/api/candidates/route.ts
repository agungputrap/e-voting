import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { extractTokenFromRequest, verifyToken } from "@/app/lib/auth";

const prisma = new PrismaClient();

// GET /api/candidates?eventId=1 - Get all candidates by eventId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error: "Event ID is required as query parameter",
        },
        { status: 400 }
      );
    }

    const eventIdNum = Number(eventId);
    if (isNaN(eventIdNum) || eventIdNum <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid event ID format",
        },
        { status: 400 }
      );
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventIdNum },
    });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 }
      );
    }

    // Get all candidates for the event
    const candidates = await prisma.candidate.findMany({
      where: { eventId: eventIdNum },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        votes: {
          select: {
            id: true,
            voterId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: candidates,
      meta: {
        eventId: eventIdNum,
        eventName: event.name,
        totalCandidates: candidates.length,
      },
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch candidates",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/candidates - Create new candidate
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);

    const body = await request.json();
    const { name, eventId, avatar } = body;

    // Validate required fields
    // Only name and eventId are required; avatar is optional
    if (!name || !eventId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, eventId",
        },
        { status: 400 }
      );
    }

    const eventIdNum = Number(eventId);
    if (isNaN(eventIdNum) || eventIdNum <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid event ID format",
        },
        { status: 400 }
      );
    }

    // Check if event exists and user is the creator
    const event = await prisma.event.findUnique({
      where: { id: eventIdNum },
    });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 }
      );
    }

    // Only event creator can add candidates
    if (event.createdBy !== user.walletId) {
      return NextResponse.json(
        {
          success: false,
          error: "Only the event creator can add candidates",
        },
        { status: 403 }
      );
    }

    // Check if candidate name already exists in this event
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        name: name.trim(),
        eventId: eventIdNum,
      },
    });

    if (existingCandidate) {
      return NextResponse.json(
        {
          success: false,
          error: "Candidate with this name already exists in this event",
        },
        { status: 409 }
      );
    }

    // Create new candidate
    // Include optional avatar field if provided
    const candidate = await prisma.candidate.create({
      data: {
        name: name.trim(),
        eventId: eventIdNum,
        avatar: avatar?.trim() || null,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            createdBy: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: candidate,
        message: "Candidate created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating candidate:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create candidate",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
