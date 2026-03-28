-- AlterTable photographers: 休息日（与摄影师端「休息」同步）
ALTER TABLE `photographers` ADD COLUMN `restDates` JSON NOT NULL DEFAULT ('[]');
