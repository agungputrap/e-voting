import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { extractTokenFromRequest, verifyToken } from "@/app/lib/auth";

const prisma = new PrismaClient();

// GET /api/events/[id] - Get event by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params since it's a Promise in Next.js 15+
    const params = await context.params;
    const { id } = params;

    // Validate that id exists and is a valid number
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Event ID is required",
        },
        { status: 400 }
      );
    }

    const eventId = Number(id);
    if (isNaN(eventId) || eventId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid event ID format",
        },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        candidates: true,
        votes: {
          include: {
            voter: true,
            candidate: true,
          },
        },
      },
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

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch event",
      },
      { status: 500 }
    );
  }
}

// PUT /api/events/[id] - Update event by ID
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user first
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

    // Await the params since it's a Promise in Next.js 15+
    const params = await context.params;
    const { id } = params;

    // Validate that id exists
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Event ID is required",
        },
        { status: 400 }
      );
    }

    // Validate event ID
    const eventId = Number(id);
    if (isNaN(eventId) || eventId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid event ID format",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      startTime,
      endTime,
      createdBy,
      blockAddress,
      isActive,
    } = body;

    // check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if the authenticated user is the creator of the event
    if (existingEvent.createdBy !== user.walletId) {
      return NextResponse.json(
        {
          success: false,
          error: "Only the event creator can update this event",
        },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (createdBy !== undefined) updateData.createdBy = createdBy;
    if (blockAddress !== undefined) updateData.blockAddress = blockAddress;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle datetime fields with validation
    if (startTime !== undefined) {
      const startDateTime = new Date(startTime);
      if (isNaN(startDateTime.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid datetime format for startTime",
          },
          { status: 400 }
        );
      }
      updateData.startTime = startDateTime;
    }
    if (endTime !== undefined) {
      const endDateTime = new Date(endTime);
      if (isNaN(endDateTime.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid datetime format for endTime",
          },
          { status: 400 }
        );
      }
      updateData.endTime = endDateTime;
    }

    // Validate endTime is after startTime
    const finalStartTime = updateData.startTime || existingEvent.startTime;
    const finalEndTime = updateData.endTime || existingEvent.endTime;
    if (finalEndTime <= finalStartTime) {
      return NextResponse.json(
        { success: false, error: "endTime must be after startTime" },
        { status: 400 }
      );
    }

    // Perform update
    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update event",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id] - Delete event by ID
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user first
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

    // Await the params since it's a Promise in Next.js 15+
    const params = await context.params;
    const { id } = params;

    // Validate that id exists
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Event ID is required",
        },
        { status: 400 }
      );
    }

    // Validate event ID
    const eventId = Number(id);
    if (isNaN(eventId) || eventId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid event ID format",
        },
        { status: 400 }
      );
    }

    // Check if event exists and validate creator
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 }
      );
    }

    // Check if the authenticated user is the creator of the event
    if (existingEvent.createdBy !== user.walletId) {
      return NextResponse.json(
        {
          success: false,
          error: "Only the event creator can delete this event",
        },
        { status: 403 }
      );
    }

    await prisma.event.delete({
      where: { id: eventId },
    });

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete event",
      },
      { status: 500 }
    );
  }
}
