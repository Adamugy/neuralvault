-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('link', 'file');

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileUrl" TEXT,
    "tags" TEXT[],
    "notes" TEXT NOT NULL DEFAULT '',
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Folder_clerkUserId_idx" ON "Folder"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_clerkUserId_name_key" ON "Folder"("clerkUserId", "name");

-- CreateIndex
CREATE INDEX "Resource_clerkUserId_idx" ON "Resource"("clerkUserId");

-- CreateIndex
CREATE INDEX "Resource_clerkUserId_folderId_idx" ON "Resource"("clerkUserId", "folderId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
