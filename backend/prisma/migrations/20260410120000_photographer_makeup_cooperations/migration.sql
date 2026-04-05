-- CreateTable
CREATE TABLE `photographer_makeup_cooperations` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `photographerId` INTEGER UNSIGNED NOT NULL,
    `makeupArtistId` INTEGER UNSIGNED NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `inviteNote` TEXT NULL,
    `cooperationRejectReason` TEXT NULL,
    `cooperationRejectAt` DATETIME(3) NULL,
    `dissolvePending` BOOLEAN NOT NULL DEFAULT false,
    `dissolveInitiator` VARCHAR(20) NULL,
    `dissolveRequestedAt` DATETIME(3) NULL,
    `dissolveNote` TEXT NULL,
    `dissolveRejectReason` TEXT NULL,
    `dissolveRejectAt` DATETIME(3) NULL,
    `sortOrder` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pm_coop_photo_makeup_uidx`(`photographerId`, `makeupArtistId`),
    INDEX `photographer_makeup_cooperations_makeupArtistId_status_idx`(`makeupArtistId`, `status`),
    INDEX `photographer_makeup_cooperations_photographerId_status_idx`(`photographerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `photographer_makeup_cooperations` ADD CONSTRAINT `photographer_makeup_cooperations_photographerId_fkey` FOREIGN KEY (`photographerId`) REFERENCES `photographers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photographer_makeup_cooperations` ADD CONSTRAINT `photographer_makeup_cooperations_makeupArtistId_fkey` FOREIGN KEY (`makeupArtistId`) REFERENCES `photographers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 从旧列迁移已确认绑定
INSERT INTO `photographer_makeup_cooperations`
(`photographerId`, `makeupArtistId`, `status`, `sortOrder`, `createdAt`, `updatedAt`)
SELECT `id`, `fixedMakeupArtistId`, 'confirmed', 0, NOW(3), NOW(3)
FROM `photographers`
WHERE `fixedMakeupArtistId` IS NOT NULL;

-- 待确认邀请（与已确认目标不同时另起一行）
INSERT INTO `photographer_makeup_cooperations`
(`photographerId`, `makeupArtistId`, `status`, `inviteNote`, `sortOrder`, `createdAt`, `updatedAt`)
SELECT `id`, `pendingFixedMakeupArtistId`, 'pending', `pendingFixedMakeupNote`, 1, NOW(3), NOW(3)
FROM `photographers`
WHERE `pendingFixedMakeupArtistId` IS NOT NULL
  AND (`fixedMakeupArtistId` IS NULL OR `pendingFixedMakeupArtistId` <> `fixedMakeupArtistId`);

-- 解除相关状态挂到对应「已确认」合作行
UPDATE `photographer_makeup_cooperations` c
INNER JOIN `photographers` p ON p.`id` = c.`photographerId`
SET
  c.`dissolvePending` = COALESCE(p.`fixedCooperationDissolvePending`, 0),
  c.`dissolveInitiator` = p.`fixedCooperationDissolveInitiator`,
  c.`dissolveRequestedAt` = p.`fixedCooperationDissolveRequestedAt`,
  c.`dissolveNote` = p.`fixedCooperationDissolveNote`,
  c.`dissolveRejectReason` = p.`fixedCooperationDissolveRejectReason`,
  c.`dissolveRejectAt` = p.`fixedCooperationDissolveRejectAt`
WHERE c.`status` = 'confirmed'
  AND p.`fixedMakeupArtistId` IS NOT NULL
  AND c.`makeupArtistId` = p.`fixedMakeupArtistId`;

-- DropForeignKey
ALTER TABLE `photographers` DROP FOREIGN KEY `photographers_fixedMakeupArtistId_fkey`;

-- DropForeignKey
ALTER TABLE `photographers` DROP FOREIGN KEY `photographers_pendingFixedMakeupArtistId_fkey`;

-- DropIndex
DROP INDEX `photographers_fixedMakeupArtistId_idx` ON `photographers`;

-- DropIndex
DROP INDEX `photographers_pendingFixedMakeupArtistId_idx` ON `photographers`;

-- AlterTable
ALTER TABLE `photographers` DROP COLUMN `fixedMakeupArtistId`,
    DROP COLUMN `pendingFixedMakeupArtistId`,
    DROP COLUMN `pendingFixedMakeupNote`,
    DROP COLUMN `fixedCooperationRejectReason`,
    DROP COLUMN `fixedCooperationRejectAt`,
    DROP COLUMN `fixedCooperationDissolvePending`,
    DROP COLUMN `fixedCooperationDissolveInitiator`,
    DROP COLUMN `fixedCooperationDissolveRequestedAt`,
    DROP COLUMN `fixedCooperationDissolveNote`,
    DROP COLUMN `fixedCooperationDissolveRejectReason`,
    DROP COLUMN `fixedCooperationDissolveRejectAt`;
