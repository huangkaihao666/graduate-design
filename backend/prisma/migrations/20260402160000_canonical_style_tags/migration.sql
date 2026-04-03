-- 与用户端六种旅拍风格一致；已存在的 key 则更新名称与排序
INSERT INTO `style_tags` (`key`, `name`, `enabled`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
('minimalist', '韩式简约', 1, 10, NOW(3), NOW(3)),
('classical', '国风典雅', 1, 20, NOW(3), NOW(3)),
('bohemian', '海岛松弛', 1, 30, NOW(3), NOW(3)),
('romantic', '森系草坪', 1, 40, NOW(3), NOW(3)),
('adventure', '旷野自由', 1, 50, NOW(3), NOW(3)),
('artistic', '纪实故事', 1, 60, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `sortOrder` = VALUES(`sortOrder`),
  `enabled` = 1,
  `updatedAt` = NOW(3);

UPDATE `style_tags`
SET `enabled` = 0, `updatedAt` = NOW(3)
WHERE `key` NOT IN ('minimalist', 'classical', 'bohemian', 'romantic', 'adventure', 'artistic');
