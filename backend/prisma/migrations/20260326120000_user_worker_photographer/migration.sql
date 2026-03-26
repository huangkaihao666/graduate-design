-- 工作人员账号可选绑定本店摄影师，用于订单过滤
ALTER TABLE `users` ADD COLUMN `workerPhotographerId` INTEGER UNSIGNED NULL;

CREATE INDEX `users_workerPhotographerId_idx` ON `users`(`workerPhotographerId`);

ALTER TABLE `users`
ADD CONSTRAINT `users_workerPhotographerId_fkey` FOREIGN KEY (`workerPhotographerId`) REFERENCES `photographers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 本店摄影师「林摄影师」（若已存在同名则跳过插入）
INSERT INTO `photographers` (
    `name`,
    `title`,
    `shootingStyle`,
    `yearsExperience`,
    `portfolioImages`,
    `availableDates`,
    `sortOrder`,
    `enabled`,
    `createdAt`,
    `updatedAt`
)
SELECT
    '林摄影师',
    '本店摄影师',
    '纪实与唯美结合，擅长旅拍人像与海景、古镇情绪片。',
    8,
    '[]',
    '[]',
    99,
    1,
    NOW(3),
    NOW(3)
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM `photographers` WHERE `name` = '林摄影师' LIMIT 1
);

-- 工作人员账号 lin@qq.com / 123456（密码 bcrypt，与项目内其他账号一致）
INSERT INTO `users` (
    `email`,
    `name`,
    `password`,
    `avatar`,
    `isActive`,
    `role`,
    `workerPhotographerId`,
    `createdAt`,
    `updatedAt`
)
SELECT
    'lin@qq.com',
    '林摄影师',
    '$2b$10$5oKn1u15cWLt9et3QcTUp.e1TF5a.sgHgmBVx/9f2uhBzglFr0sTi',
    NULL,
    1,
    'worker',
    (SELECT `id` FROM `photographers` WHERE `name` = '林摄影师' LIMIT 1),
    NOW(3),
    NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'lin@qq.com' LIMIT 1);

-- 若邮箱已存在，补齐绑定与角色
UPDATE `users` u
INNER JOIN `photographers` p ON p.`name` = '林摄影师'
SET
    u.`workerPhotographerId` = p.`id`,
    u.`role` = 'worker',
    u.`name` = '林摄影师'
WHERE u.`email` = 'lin@qq.com';

-- 演示账号 worker：不绑定摄影师，用于查看全部订单（演示）
UPDATE `users` SET `workerPhotographerId` = NULL WHERE `email` = 'worker';
