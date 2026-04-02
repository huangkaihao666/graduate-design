-- CreateTable
CREATE TABLE `cities` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cities_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 从现有 spots.city 生成城市行
INSERT INTO `cities` (`name`, `createdAt`, `updatedAt`)
SELECT DISTINCT `city`, NOW(3), NOW(3) FROM `spots` WHERE `city` IS NOT NULL AND TRIM(`city`) <> '';

-- AlterTable: 新增列（先允许 NULL，便于回填）
ALTER TABLE `spots` ADD COLUMN `cityId` INTEGER UNSIGNED NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `images` JSON NULL;

-- 回填 cityId
UPDATE `spots` s
INNER JOIN `cities` c ON c.`name` = s.`city`
SET s.`cityId` = c.`id`;

-- 若有孤立数据，挂到「未分类」城市
INSERT INTO `cities` (`name`, `createdAt`, `updatedAt`)
SELECT '未分类', NOW(3), NOW(3)
FROM (SELECT 1 AS x) AS t
WHERE NOT EXISTS (SELECT 1 FROM `cities` WHERE `name` = '未分类' LIMIT 1);

UPDATE `spots` s
INNER JOIN `cities` c ON c.`name` = '未分类'
SET s.`cityId` = c.`id`
WHERE s.`cityId` IS NULL;

ALTER TABLE `spots` MODIFY `cityId` INTEGER UNSIGNED NOT NULL;

-- Drop old column
ALTER TABLE `spots` DROP COLUMN `city`;

-- AddForeignKey
ALTER TABLE `spots` ADD CONSTRAINT `spots_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index
CREATE INDEX `spots_cityId_idx` ON `spots`(`cityId`);
