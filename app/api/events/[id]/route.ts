import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/events/[id] - Get event by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const event = await prisma.event.findUnique({
            where: { id: Number(params.id) },
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
            return NextResponse.json({
                success: false,
                error: 'Event not found',
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: event,
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch event'
        }, { status: 500 });
    }
}

// PUT /api/events/[id] - Update event by ID
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const {
            name,
            description,
            startTime,
            endTime,
            createdBy,
            blockAddress,
            isActive
        } = body;

        // Validate event ID
        const eventId = Number(params.id);
        if (isNaN(eventId)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid event ID',
            }, { status: 400 });
        }

        // check if event exists
        const existingEvent = await prisma.event.findUnique({
            where: { id: eventId }
        });

        if (!existingEvent) {
            return NextResponse.json(
                { success: false, error: 'Event not found' },
                { status: 404 }
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
                return NextResponse.json({
                    success: false,
                    error: 'Invalid datetime format for startTime',
                }, { status: 400 });
            }
            updateData.startTime = startDateTime;
        }
        if (endTime !== undefined) {
            const endDateTime = new Date(endTime);
            if (isNaN(endDateTime.getTime())) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid datetime format for endTime',
                }, { status: 400 });
            }
            updateData.endTime = endDateTime;
        }

        // Validate endTime is after startTime
        const finalStartTime = updateData.startTime || existingEvent.startTime;
        const finalEndTime = updateData.endTime || existingEvent.endTime;
        if (finalEndTime <= finalStartTime) {
            return NextResponse.json(
                { success: false, error: 'endTime must be after startTime' },
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
        })
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to update event'
        }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await prisma.event.delete({
            where: { id: Number(params.id) },
        });

        return NextResponse.json({
            success: true,
            message: 'Event deleted successfully',
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to delete event'
        }, { status: 500 });
    }
}