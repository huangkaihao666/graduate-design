-- AlterTable
ALTER TABLE `cities` ADD COLUMN `region` ENUM('domestic', 'international') NOT NULL DEFAULT 'domestic';
