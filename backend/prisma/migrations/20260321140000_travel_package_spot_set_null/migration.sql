-- 删除景点时：下架/草稿套餐解除关联（SET NULL）；仅「已上架」套餐阻止删景点
ALTER TABLE `travel_packages` DROP FOREIGN KEY `travel_packages_spotId_fkey`;

ALTER TABLE `travel_packages` MODIFY `spotId` INTEGER UNSIGNED NULL;

ALTER TABLE `travel_packages` ADD CONSTRAINT `travel_packages_spotId_fkey` FOREIGN KEY (`spotId`) REFERENCES `spots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
