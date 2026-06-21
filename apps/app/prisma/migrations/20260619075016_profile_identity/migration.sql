-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "email" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "links" TEXT[],
ADD COLUMN     "location" TEXT,
ADD COLUMN     "phone" TEXT;
