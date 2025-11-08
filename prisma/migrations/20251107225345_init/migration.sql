/*
  Warnings:

  - A unique constraint covering the columns `[chainEventId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "chainEventId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Event_chainEventId_key" ON "Event"("chainEventId");
