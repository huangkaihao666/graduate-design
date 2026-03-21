-- 摄影师扩展信息：性别、年龄、擅长题材、资质获奖
ALTER TABLE `photographers`
  ADD COLUMN `gender` VARCHAR(20) NULL,
  ADD COLUMN `age` TINYINT UNSIGNED NULL,
  ADD COLUMN `specialtyTopics` TEXT NULL,
  ADD COLUMN `awards` TEXT NULL;
