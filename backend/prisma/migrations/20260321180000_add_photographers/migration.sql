-- CreateTable
CREATE TABLE `photographers` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `title` VARCHAR(100) NULL,
    `avatar` VARCHAR(1024) NULL,
    `shootingStyle` TEXT NOT NULL,
    `yearsExperience` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `bio` TEXT NULL,
    `portfolioImages` JSON NOT NULL,
    `sortOrder` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `photographers_enabled_sortOrder_idx`(`enabled`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
