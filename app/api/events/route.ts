import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/app/lib/middleware";
import { JWTPayload } from "@/app/lib/auth";
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient();

// GET /api/events - Get all events (Protected)
async function getEvents(request: NextRequest, user: JWTPayload) {
  try {
    const events = await prisma.event.findMany({
      include: {
        candidates: true,
        votes: true,
      },
    });
    return NextResponse.json({
      success: true,
      data: events,
      user: {
        id: user.userId,
        walletId: user.walletId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch events",
      },
      { status: 500 }
    );
  }
}

// POST /api/events - Create new event (Protected)
async function createEvent(request: NextRequest, user: JWTPayload) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      startTime,
      endTime,
      blockAddress,
      chainEventId,
      isActive = true,
      imgUrl,
    } = body;

    // Validate required fields
    if (!name || !description || !startTime || !endTime) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: name, description, startTime, endTime",
        },
        { status: 400 }
      );
    }

    // Validate datetime format
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid datetime format for startTime or endTime",
        },
        { status: 400 }
      );
    }
    if (endDateTime <= startDateTime) {
      return NextResponse.json(
        {
          success: false,
          error: "endTime must be after startTime",
        },
        { status: 400 }
      );
    }

    if (chainEventId === undefined || chainEventId === null) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: chainEventId",
        },
        { status: 400 }
      );
    }

    const parsedChainEventId = Number(chainEventId);
    if (!Number.isInteger(parsedChainEventId) || parsedChainEventId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid chainEventId value",
        },
        { status: 400 }
      );
    }

    const existingChainEvent = await prisma.event.findFirst({
      where: { chainEventId: parsedChainEventId },
    });
    if (existingChainEvent) {
      return NextResponse.json(
        {
          success: false,
          error: "Event already registered on-chain",
        },
        { status: 409 }
      );
    }

    const normalizedBlockAddress =
      typeof blockAddress === "string" && blockAddress.length
        ? blockAddress
        : null;

    const event = await prisma.event.create({
      data: {
        name,
        description,
        startTime: startDateTime,
        endTime: endDateTime,
        createdBy: user.walletId, // Use authenticated user's walletId
        chainEventId: parsedChainEventId,
        blockAddress: normalizedBlockAddress,
        isActive,
        imgUrl: imgUrl,
        isCompleted: false,
        winner: null,
        timeLeft: null,
        totalVotes: 0,
        candidatesCount: 0,
        isOwner: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: event,
        createdBy: user.walletId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.log("Error creating event:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create event",
      },
      { status: 500 }
    );
  }
}

// Export protected routes
export const GET = withAuth(getEvents);
export const POST = withAuth(createEvent);
