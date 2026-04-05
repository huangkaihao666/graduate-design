-- AlterTable
ALTER TABLE `photographers`
ADD COLUMN `fixedCooperationDissolvePending` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `fixedCooperationDissolveInitiator` VARCHAR(20) NULL,
ADD COLUMN `fixedCooperationDissolveRequestedAt` DATETIME(3) NULL,
ADD COLUMN `fixedCooperationDissolveNote` TEXT NULL,
ADD COLUMN `fixedCooperationDissolveRejectReason` TEXT NULL,
ADD COLUMN `fixedCooperationDissolveRejectAt` DATETIME(3) NULL;
