-- AlterTable
ALTER TABLE "Voter" ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "nonce" TEXT;
