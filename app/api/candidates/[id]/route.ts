import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { extractTokenFromRequest, verifyToken } from "@/app/lib/auth";

const prisma = new PrismaClient();

// GET /api/candidates/[id] - Get candidate by ID
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        // Await the params since it's a Promise in Next.js 15+
        const params = await context.params;
        const { id } = params;

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'Candidate ID is required'
            }, { status: 400 });
        }

        const candidateId = Number(id);
        if (isNaN(candidateId) || candidateId <= 0) {
            return NextResponse.json({
                success: false,
                error: 'Invalid candidate ID format'
            }, { status: 400 });
        }

        const candidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        createdBy: true
                    }
                },
                votes: {
                    include: {
                        voter: {
                            select: {
                                id: true,
                                name: true,
                                walletId: true
                            }
                        }
                    }
                }
            }
        });

        if (!candidate) {
            return NextResponse.json({
                success: false,
                error: 'Candidate not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: candidate
        });

    } catch (error) {
        console.error('Error fetching candidate:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch candidate'
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

// PUT /api/candidates/[id] - Update candidate
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        // Authenticate user
        const token = extractTokenFromRequest(request);
        if (!token) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        const user = await verifyToken(token);

        // Await the params since it's a Promise in Next.js 15+
        const params = await context.params;
        const { id } = params;

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'Candidate ID is required'
            }, { status: 400 });
        }

        const candidateId = Number(id);
        if (isNaN(candidateId) || candidateId <= 0) {
            return NextResponse.json({
                success: false,
                error: 'Invalid candidate ID format'
            }, { status: 400 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Candidate name is required'
            }, { status: 400 });
        }

        // Check if candidate exists and get event info
        const existingCandidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: {
                event: true
            }
        });

        if (!existingCandidate) {
            return NextResponse.json({
                success: false,
                error: 'Candidate not found'
            }, { status: 404 });
        }

        // Only event creator can update candidates
        if (existingCandidate.event.createdBy !== user.walletId) {
            return NextResponse.json({
                success: false,
                error: 'Only the event creator can update candidates'
            }, { status: 403 });
        }

        // Check if new name conflicts with other candidates in the same event
        const nameConflict = await prisma.candidate.findFirst({
            where: {
                name: name.trim(),
                eventId: existingCandidate.eventId,
                id: { not: candidateId } // Exclude current candidate
            }
        });

        if (nameConflict) {
            return NextResponse.json({
                success: false,
                error: 'Another candidate with this name already exists in this event'
            }, { status: 409 });
        }

        // Update candidate
        const updatedCandidate = await prisma.candidate.update({
            where: { id: candidateId },
            data: {
                name: name.trim()
            },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        createdBy: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedCandidate,
            message: 'Candidate updated successfully'
        });

    } catch (error) {
        console.error('Error updating candidate:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to update candidate'
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

// DELETE /api/candidates/[id] - Delete candidate
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        // Authenticate user
        const token = extractTokenFromRequest(request);
        if (!token) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        const user = await verifyToken(token);

        // Await the params since it's a Promise in Next.js 15+
        const params = await context.params;
        const { id } = params;

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'Candidate ID is required'
            }, { status: 400 });
        }

        const candidateId = Number(id);
        if (isNaN(candidateId) || candidateId <= 0) {
            return NextResponse.json({
                success: false,
                error: 'Invalid candidate ID format'
            }, { status: 400 });
        }

        // Check if candidate exists and get event info
        const existingCandidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: {
                event: true,
                votes: true
            }
        });

        if (!existingCandidate) {
            return NextResponse.json({
                success: false,
                error: 'Candidate not found'
            }, { status: 404 });
        }

        // Only event creator can delete candidates
        if (existingCandidate.event.createdBy !== user.walletId) {
            return NextResponse.json({
                success: false,
                error: 'Only the event creator can delete candidates'
            }, { status: 403 });
        }

        // Check if candidate has votes (optional: you might want to prevent deletion if votes exist)
        if (existingCandidate.votes.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Cannot delete candidate with existing votes'
            }, { status: 409 });
        }

        // Delete candidate
        await prisma.candidate.delete({
            where: { id: candidateId }
        });

        return NextResponse.json({
            success: true,
            message: 'Candidate deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting candidate:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to delete candidate'
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}