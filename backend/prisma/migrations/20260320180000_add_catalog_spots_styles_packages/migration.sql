-- CreateTable
CREATE TABLE `travel_packages` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `price` INTEGER UNSIGNED NOT NULL,
    `originalPrice` INTEGER UNSIGNED NULL,
    `duration` INTEGER UNSIGNED NOT NULL,
    `location` VARCHAR(100) NOT NULL,
    `style` VARCHAR(50) NOT NULL,
    `coverImage` LONGTEXT NULL,
    `images` JSON NULL,
    `features` JSON NULL,
    `includes` JSON NULL,
    `excludes` JSON NULL,
    `maxPeople` INTEGER UNSIGNED NOT NULL DEFAULT 2,
    `isPopular` BOOLEAN NOT NULL DEFAULT false,
    `isHot` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `travel_packages_status_idx`(`status`),
    INDEX `travel_packages_location_idx`(`location`),
    INDEX `travel_packages_style_idx`(`style`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spots` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `recommended` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `style_tags` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `style_tags_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 清空收藏：原 packageId 未指向真实套餐表，建立外键前需清理
DELETE FROM `favorites`;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `travel_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
