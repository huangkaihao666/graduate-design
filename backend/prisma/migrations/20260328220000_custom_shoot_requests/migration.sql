-- CreateTable
CREATE TABLE `custom_shoot_requests` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `requestNo` VARCHAR(64) NOT NULL,
    `userId` INTEGER UNSIGNED NOT NULL,
    `title` VARCHAR(200) NULL,
    `description` TEXT NULL,
    `location` VARCHAR(120) NOT NULL,
    `style` VARCHAR(100) NOT NULL,
    `shootingDate` VARCHAR(40) NOT NULL,
    `duration` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `numberOfPeople` INTEGER UNSIGNED NOT NULL DEFAULT 2,
    `budgetHint` INTEGER UNSIGNED NULL,
    `contactName` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(40) NOT NULL,
    `status` VARCHAR(40) NOT NULL DEFAULT 'open',
    `photographerId` INTEGER UNSIGNED NULL,
    `claimedWorkerUserId` INTEGER UNSIGNED NULL,
    `claimMessage` VARCHAR(500) NULL,
    `claimedAt` DATETIME(3) NULL,
    `userConfirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `custom_shoot_requests_requestNo_key`(`requestNo`),
    INDEX `custom_shoot_requests_userId_status_idx`(`userId`, `status`),
    INDEX `custom_shoot_requests_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `custom_shoot_requests_photographerId_idx`(`photographerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `custom_shoot_requests` ADD CONSTRAINT `custom_shoot_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_shoot_requests` ADD CONSTRAINT `custom_shoot_requests_photographerId_fkey` FOREIGN KEY (`photographerId`) REFERENCES `photographers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
