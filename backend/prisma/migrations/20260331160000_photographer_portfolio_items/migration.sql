-- 为摄影师/妆造师作品新增明细字段（含分类与描述）
ALTER TABLE `photographers`
ADD COLUMN `portfolioItems` JSON NULL;
