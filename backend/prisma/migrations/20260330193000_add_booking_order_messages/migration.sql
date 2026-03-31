CREATE TABLE `booking_order_messages` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `orderId` INTEGER UNSIGNED NOT NULL,
  `senderUserId` INTEGER UNSIGNED NOT NULL,
  `senderRole` VARCHAR(20) NOT NULL,
  `contentType` VARCHAR(20) NOT NULL DEFAULT 'text',
  `content` LONGTEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `booking_order_messages_orderId_createdAt_idx`(`orderId`, `createdAt`),
  INDEX `booking_order_messages_senderUserId_createdAt_idx`(`senderUserId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `booking_order_messages`
  ADD CONSTRAINT `booking_order_messages_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `booking_orders`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `booking_order_messages`
  ADD CONSTRAINT `booking_order_messages_senderUserId_fkey`
  FOREIGN KEY (`senderUserId`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
