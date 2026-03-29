-- CreateTable
CREATE TABLE `package_browse_logs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` INTEGER UNSIGNED NULL,
    `packageId` INTEGER UNSIGNED NOT NULL,
    `context` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `package_browse_logs_packageId_createdAt_idx`(`packageId`, `createdAt`),
    INDEX `package_browse_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `package_browse_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `package_browse_logs` ADD CONSTRAINT `package_browse_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
