import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/events - Get all events
export async function GET() {
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
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: "Failed to fetch events",
        }, { status: 500 }
        );
    }
}

// POST /api/events - Create new event
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description, startTime, endTime, createdBy, blockAddress, isActive = true } = body;


        // Validate required fields
        if (!name || !description || !startTime || !endTime || !createdBy || !blockAddress) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields, name, startTime, endTime, createdBy',
            }, { status: 400 });
        }

        // Validate datetime format
        const startDateTime = new Date(startTime);
        const endDateTime = new Date(endTime);
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            return NextResponse.json({
                success: false,
                error: 'Invalid datetime format to startTime or endTime',
            }, { status: 400 });
        }
        if (endDateTime <= startDateTime) {
            return NextResponse.json({
                success: false,
                error: 'endTime must be after startTime',
            }, { status: 400 });
        }

        const event = await prisma.event.create({
            data: {
                name,
                description,
                startTime: startDateTime,
                endTime: endDateTime,
                createdBy,
                blockAddress,
                isActive,
            },
        });

        return NextResponse.json({
            success: true,
            data: event,
        }, { status: 201 });
    } catch (error) {
        console.log('Error creating event:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to create event',
        }, { status: 500 });
    }
}