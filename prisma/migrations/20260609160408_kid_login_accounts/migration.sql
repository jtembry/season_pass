-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CHILD';

-- AlterTable
ALTER TABLE "ChildProfile" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChildProfile_username_key" ON "ChildProfile"("username");

