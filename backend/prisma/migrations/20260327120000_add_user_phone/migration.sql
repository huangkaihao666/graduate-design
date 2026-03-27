-- AlterTable
ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(20) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_phone_key` ON `users`(`phone`);
