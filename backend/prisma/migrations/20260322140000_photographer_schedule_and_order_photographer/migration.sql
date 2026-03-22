-- AlterTable photographers: 档期
ALTER TABLE `photographers` ADD COLUMN `scheduleNote` TEXT NULL;
ALTER TABLE `photographers` ADD COLUMN `availableDates` JSON NOT NULL DEFAULT ('[]');

-- AlterTable booking_orders: 关联摄影师
ALTER TABLE `booking_orders` ADD COLUMN `photographerId` INTEGER UNSIGNED NULL;
ALTER TABLE `booking_orders` ADD COLUMN `photographerName` VARCHAR(100) NULL;
