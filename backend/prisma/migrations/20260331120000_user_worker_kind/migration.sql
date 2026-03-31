-- 注册身份：摄影师 / 化妆师（工作人员子类型）
ALTER TABLE `users`
  ADD COLUMN `workerKind` VARCHAR(20) NULL;
