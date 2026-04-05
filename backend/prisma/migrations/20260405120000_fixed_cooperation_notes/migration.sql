-- AlterTable
ALTER TABLE `photographers`
ADD COLUMN `pendingFixedMakeupNote` TEXT NULL,
ADD COLUMN `fixedCooperationRejectReason` TEXT NULL,
ADD COLUMN `fixedCooperationRejectAt` DATETIME(3) NULL;
