-- 回填工作人员子类型：历史上部分 worker 账号未写入 workerKind，导致后台只显示「工作人员」
-- 先处理妆造相关昵称，再处理「摄影师」，避免同一昵称规则冲突

UPDATE `users`
SET `workerKind` = 'makeup'
WHERE `role` = 'worker'
  AND (`workerKind` IS NULL OR TRIM(`workerKind`) = '')
  AND (`name` LIKE '%化妆师%' OR `name` LIKE '%妆造师%');

UPDATE `users`
SET `workerKind` = 'photographer'
WHERE `role` = 'worker'
  AND (`workerKind` IS NULL OR TRIM(`workerKind`) = '')
  AND `name` LIKE '%摄影师%';
