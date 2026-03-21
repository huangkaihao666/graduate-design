-- 头像存 Base64 data URL，远超 VARCHAR(1024)，保存时会触发 MySQL 错误导致 500
ALTER TABLE `photographers` MODIFY `avatar` LONGTEXT NULL;
