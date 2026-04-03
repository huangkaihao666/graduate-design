-- AlterTable
ALTER TABLE `style_tags`
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `icon` VARCHAR(20) NULL,
    ADD COLUMN `sampleImages` JSON NULL;

-- 六种标准风格：补充默认描述与图标（与前端 TRAVEL_STYLE_CARD_DESCRIPTIONS / 虚拍一致）
UPDATE `style_tags` SET
  `description` = '3:4竖版，浅灰/米白极简背景，新郎黑西装+领结，新娘缎面婚纱+轻纱；漫射光、低饱和、依偎互动，韩式画报胶片感',
  `icon` = COALESCE(NULLIF(TRIM(`icon`), ''), '⬜')
WHERE `key` = 'minimalist';

UPDATE `style_tags` SET
  `description` = '新中式：室内纯色正红背景，3:4竖版，正红与暖棕为基底；自然微笑，避免僵硬',
  `icon` = COALESCE(NULLIF(TRIM(`icon`), ''), '👑')
WHERE `key` = 'classical';

UPDATE `style_tags` SET
  `description` = '阳光沙滩、轻盈纱裙，偏海岛度假与松弛氛围',
  `icon` = COALESCE(NULLIF(TRIM(`icon`), ''), '🌻')
WHERE `key` = 'bohemian';

UPDATE `style_tags` SET
  `description` = '自然光、草坪与绿植，清新柔美、森系婚礼感',
  `icon` = COALESCE(NULLIF(TRIM(`icon`), ''), '✨')
WHERE `key` = 'romantic';

UPDATE `style_tags` SET
  `description` = '公路、山野、雪山雪景与开阔天际，动感与旅拍大片感',
  `icon` = COALESCE(NULLIF(TRIM(`icon`), ''), '⛰️')
WHERE `key` = 'adventure';

UPDATE `style_tags` SET
  `description` = '古镇街巷与人文旅拍，强调情绪、构图与故事感',
  `icon` = COALESCE(NULLIF(TRIM(`icon`), ''), '🎨')
WHERE `key` = 'artistic';
