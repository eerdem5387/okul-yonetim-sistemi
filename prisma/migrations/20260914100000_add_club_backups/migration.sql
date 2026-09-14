-- CreateTable
CREATE TABLE "club_backups" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "academicYearName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_backup_clubs" (
    "id" TEXT NOT NULL,
    "backupId" TEXT NOT NULL,
    "sourceClubId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "club_backup_clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_backup_members" (
    "id" TEXT NOT NULL,
    "backupClubId" TEXT NOT NULL,
    "studentId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "tcNumber" TEXT,
    "selectedAt" TIMESTAMP(3),

    CONSTRAINT "club_backup_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "club_backups_academicYearId_key" ON "club_backups"("academicYearId");

-- CreateIndex
CREATE INDEX "club_backup_clubs_backupId_idx" ON "club_backup_clubs"("backupId");

-- CreateIndex
CREATE INDEX "club_backup_members_backupClubId_idx" ON "club_backup_members"("backupClubId");

-- AddForeignKey
ALTER TABLE "club_backups" ADD CONSTRAINT "club_backups_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_backup_clubs" ADD CONSTRAINT "club_backup_clubs_backupId_fkey" FOREIGN KEY ("backupId") REFERENCES "club_backups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_backup_members" ADD CONSTRAINT "club_backup_members_backupClubId_fkey" FOREIGN KEY ("backupClubId") REFERENCES "club_backup_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
