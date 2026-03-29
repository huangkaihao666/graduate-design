-- AlterTable
ALTER TABLE `customer_support_histories` ADD COLUMN `title` VARCHAR(400) NULL;
ALTER TABLE `customer_support_histories` ADD COLUMN `isPinned` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `customer_support_histories` ADD COLUMN `pinnedAt` DATETIME(3) NULL;

CREATE INDEX `customer_support_histories_userId_isPinned_idx` ON `customer_support_histories`(`userId`, `isPinned`);
