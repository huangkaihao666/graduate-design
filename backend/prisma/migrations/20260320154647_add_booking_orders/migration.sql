-- AlterTable
ALTER TABLE `users` ADD COLUMN `avatar` LONGTEXT NULL;

-- CreateTable
CREATE TABLE `booking_orders` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `orderNo` VARCHAR(64) NOT NULL,
    `packageId` INTEGER UNSIGNED NOT NULL,
    `packageName` VARCHAR(255) NOT NULL,
    `location` VARCHAR(100) NOT NULL,
    `style` VARCHAR(100) NOT NULL,
    `duration` INTEGER UNSIGNED NOT NULL,
    `unitPrice` INTEGER UNSIGNED NOT NULL,
    `numberOfPeople` INTEGER UNSIGNED NOT NULL,
    `shootingDate` VARCHAR(40) NOT NULL,
    `contactName` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(40) NOT NULL,
    `email` VARCHAR(255) NULL,
    `paymentMethod` VARCHAR(30) NOT NULL,
    `remark` TEXT NULL,
    `totalAmount` INTEGER UNSIGNED NOT NULL,
    `paymentStatus` VARCHAR(30) NOT NULL,
    `paymentNo` VARCHAR(64) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `booking_orders_orderNo_key`(`orderNo`),
    INDEX `booking_orders_location_idx`(`location`),
    INDEX `booking_orders_createdAt_idx`(`createdAt`),
    INDEX `booking_orders_paymentStatus_idx`(`paymentStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
