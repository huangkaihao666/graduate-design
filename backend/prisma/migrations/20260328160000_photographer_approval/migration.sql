-- 摄影师入驻审核（存量数据默认已通过，避免影响现有演示账号）
ALTER TABLE `photographers` ADD COLUMN `approvalStatus` VARCHAR(32) NOT NULL DEFAULT 'approved';
ALTER TABLE `photographers` ADD COLUMN `approvalReviewNote` TEXT NULL;
CREATE INDEX `photographers_approvalStatus_idx` ON `photographers`(`approvalStatus`);
