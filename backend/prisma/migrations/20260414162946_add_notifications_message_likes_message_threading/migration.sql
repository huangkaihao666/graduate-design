-- AlterTable
ALTER TABLE `messages` ADD COLUMN `parentId` INTEGER UNSIGNED NULL,
    ADD COLUMN `reasoning` LONGTEXT NULL,
    ADD COLUMN `roundNumber` INTEGER UNSIGNED NULL;

-- AlterTable
ALTER TABLE `rooms` MODIFY `image` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `avatar` LONGTEXT NULL;

-- CreateTable
CREATE TABLE `message_likes` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` INTEGER UNSIGNED NOT NULL,
    `messageId` INTEGER UNSIGNED NOT NULL,

    INDEX `message_likes_messageId_idx`(`messageId`),
    UNIQUE INDEX `message_likes_userId_messageId_key`(`userId`, `messageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` INTEGER UNSIGNED NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `fromUserId` INTEGER UNSIGNED NOT NULL,
    `roomId` INTEGER UNSIGNED NOT NULL,
    `messageId` INTEGER UNSIGNED NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_userId_isRead_idx`(`userId`, `isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `messages_roundNumber_idx` ON `messages`(`roundNumber`);

-- CreateIndex
CREATE INDEX `messages_parentId_idx` ON `messages`(`parentId`);

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
