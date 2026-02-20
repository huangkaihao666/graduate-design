-- CreateTable
CREATE TABLE `virtual_try_on_histories` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `imageUrl` LONGTEXT NOT NULL,
    `style` VARCHAR(50) NOT NULL,
    `preferences` JSON NULL,
    `modifiedImageUrl` LONGTEXT NULL,
    `virtualAdvice` TEXT NULL,
    `makeupAdvice` TEXT NULL,
    `hairstyleAdvice` TEXT NULL,
    `dressAdvice` TEXT NULL,
    `shootingTips` JSON NULL,
    `previewDescription` TEXT NULL,
    `userId` INTEGER UNSIGNED NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'success',
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `virtual_try_on_histories_userId_idx`(`userId`),
    INDEX `virtual_try_on_histories_style_idx`(`style`),
    INDEX `virtual_try_on_histories_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `style_recommendation_histories` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `preferences` TEXT NOT NULL,
    `budget` INTEGER UNSIGNED NULL,
    `occasions` JSON NULL,
    `recommendedStyles` JSON NULL,
    `personalizedAdvice` TEXT NULL,
    `userId` INTEGER UNSIGNED NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'success',
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `style_recommendation_histories_userId_idx`(`userId`),
    INDEX `style_recommendation_histories_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itinerary_planning_histories` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `destination` VARCHAR(255) NOT NULL,
    `duration` INTEGER UNSIGNED NOT NULL,
    `style` VARCHAR(50) NOT NULL,
    `interests` JSON NULL,
    `overview` TEXT NULL,
    `dailySchedule` JSON NULL,
    `packingList` JSON NULL,
    `localTips` TEXT NULL,
    `userId` INTEGER UNSIGNED NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'success',
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `itinerary_planning_histories_userId_idx`(`userId`),
    INDEX `itinerary_planning_histories_destination_idx`(`destination`),
    INDEX `itinerary_planning_histories_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `virtual_try_on_histories` ADD CONSTRAINT `virtual_try_on_histories_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `style_recommendation_histories` ADD CONSTRAINT `style_recommendation_histories_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itinerary_planning_histories` ADD CONSTRAINT `itinerary_planning_histories_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
