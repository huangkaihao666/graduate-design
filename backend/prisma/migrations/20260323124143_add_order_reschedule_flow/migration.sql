-- AlterTable
ALTER TABLE `booking_orders` ADD COLUMN `rescheduleCount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN `rescheduleRequestReason` VARCHAR(255) NULL,
    ADD COLUMN `rescheduleRequestStatus` VARCHAR(30) NULL,
    ADD COLUMN `rescheduleRequestedAt` DATETIME(3) NULL,
    ADD COLUMN `rescheduleRequestedDate` VARCHAR(40) NULL,
    ADD COLUMN `rescheduleReviewNote` VARCHAR(255) NULL,
    ADD COLUMN `rescheduleReviewedAt` DATETIME(3) NULL;
