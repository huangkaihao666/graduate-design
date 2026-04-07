-- CreateTable
CREATE TABLE `travel_package_spots` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `packageId` INTEGER UNSIGNED NOT NULL,
    `spotId` INTEGER UNSIGNED NOT NULL,
    `order` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `travel_package_spots_packageId_idx`(`packageId`),
    INDEX `travel_package_spots_spotId_idx`(`spotId`),
    UNIQUE INDEX `travel_package_spots_packageId_spotId_key`(`packageId`, `spotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `travel_package_spots` ADD CONSTRAINT `travel_package_spots_packageId_fkey`
FOREIGN KEY (`packageId`) REFERENCES `travel_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `travel_package_spots` ADD CONSTRAINT `travel_package_spots_spotId_fkey`
FOREIGN KEY (`spotId`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill legacy spotId to join table
INSERT INTO `travel_package_spots` (`packageId`, `spotId`, `order`, `createdAt`)
SELECT `id`, `spotId`, 0, NOW()
FROM `travel_packages`
WHERE `spotId` IS NOT NULL;

