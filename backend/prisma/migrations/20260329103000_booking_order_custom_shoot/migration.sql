-- 定制旅拍确认后关联订单：packageId 可空，并关联用户与定制需求
ALTER TABLE `booking_orders` MODIFY `packageId` INTEGER UNSIGNED NULL;

ALTER TABLE `booking_orders` ADD COLUMN `userId` INTEGER UNSIGNED NULL;
ALTER TABLE `booking_orders` ADD COLUMN `customShootRequestId` INTEGER UNSIGNED NULL;

CREATE UNIQUE INDEX `booking_orders_customShootRequestId_key` ON `booking_orders`(`customShootRequestId`);
CREATE INDEX `booking_orders_userId_idx` ON `booking_orders`(`userId`);

ALTER TABLE `booking_orders` ADD CONSTRAINT `booking_orders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `booking_orders` ADD CONSTRAINT `booking_orders_customShootRequestId_fkey` FOREIGN KEY (`customShootRequestId`) REFERENCES `custom_shoot_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
