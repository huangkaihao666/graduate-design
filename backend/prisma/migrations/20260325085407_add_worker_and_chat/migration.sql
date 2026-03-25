-- AlterTable
ALTER TABLE `booking_orders` ADD COLUMN `workerName` VARCHAR(100) NULL,
    ADD COLUMN `workerTakenAt` DATETIME(3) NULL,
    ADD COLUMN `workerType` VARCHAR(30) NULL,
    ADD COLUMN `workerUserId` INTEGER UNSIGNED NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE `worker_profiles` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` INTEGER UNSIGNED NOT NULL,
    `workerType` VARCHAR(30) NOT NULL,
    `reviewStatus` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `reviewNote` VARCHAR(255) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `title` VARCHAR(100) NULL,
    `avatar` LONGTEXT NULL,
    `bio` TEXT NULL,
    `skills` TEXT NULL,
    `portfolioImages` JSON NOT NULL,
    `phone` VARCHAR(40) NULL,
    `wechat` VARCHAR(60) NULL,
    `city` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `worker_profiles_userId_key`(`userId`),
    INDEX `worker_profiles_workerType_reviewStatus_idx`(`workerType`, `reviewStatus`),
    INDEX `worker_profiles_reviewStatus_idx`(`reviewStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` INTEGER UNSIGNED NOT NULL,
    `workerUserId` INTEGER UNSIGNED NOT NULL,
    `lastMessageAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `conversations_userId_lastMessageAt_idx`(`userId`, `lastMessageAt`),
    INDEX `conversations_workerUserId_lastMessageAt_idx`(`workerUserId`, `lastMessageAt`),
    UNIQUE INDEX `conversations_userId_workerUserId_key`(`userId`, `workerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_messages` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `conversationId` INTEGER UNSIGNED NOT NULL,
    `senderUserId` INTEGER UNSIGNED NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conversation_messages_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    INDEX `conversation_messages_senderUserId_createdAt_idx`(`senderUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `booking_orders_workerUserId_createdAt_idx` ON `booking_orders`(`workerUserId`, `createdAt`);

-- CreateIndex
CREATE INDEX `users_role_idx` ON `users`(`role`);

-- AddForeignKey
ALTER TABLE `worker_profiles` ADD CONSTRAINT `worker_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_workerUserId_fkey` FOREIGN KEY (`workerUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_senderUserId_fkey` FOREIGN KEY (`senderUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
