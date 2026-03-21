-- AlterTable: 套餐关联景点，目的地与景点 city 强一致
ALTER TABLE `travel_packages` ADD COLUMN `spotId` INTEGER UNSIGNED NULL;

CREATE INDEX `travel_packages_spotId_idx` ON `travel_packages`(`spotId`);

-- 为现有套餐的 location 补齐景点（每个城市一条代表记录）
INSERT INTO `spots` (`name`, `city`, `category`, `recommended`, `createdAt`, `updatedAt`)
SELECT DISTINCT
  CONCAT(`tp`.`location`, '旅拍目的地'),
  `tp`.`location`,
  '综合',
  0,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `travel_packages` `tp`
WHERE NOT EXISTS (
  SELECT 1 FROM `spots` `s` WHERE `s`.`city` = `tp`.`location`
);

-- 回填 spotId（同一城市取 id 最小的一条景点）
UPDATE `travel_packages` `tp`
INNER JOIN (
  SELECT `city`, MIN(`id`) AS `sid` FROM `spots` GROUP BY `city`
) `m` ON `m`.`city` = `tp`.`location`
SET `tp`.`spotId` = `m`.`sid`
WHERE `tp`.`spotId` IS NULL;

-- 若仍有 NULL（不应发生），删除无景点套餐或人工处理后再迁移
ALTER TABLE `travel_packages` MODIFY `spotId` INTEGER UNSIGNED NOT NULL;

ALTER TABLE `travel_packages` ADD CONSTRAINT `travel_packages_spotId_fkey` FOREIGN KEY (`spotId`) REFERENCES `spots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
