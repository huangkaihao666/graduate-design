/*
  Warnings:

  - You are about to drop the column `sentiment` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `sentimentType` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `likeCount` on the `user_opinions` table. All the data in the column will be lost.
  - You are about to drop the `user_emotion_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `user_emotion_profiles` DROP FOREIGN KEY `user_emotion_profiles_userId_fkey`;

-- AlterTable
ALTER TABLE `agents` ADD COLUMN `domains` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `counseling_sessions` ADD COLUMN `counselorBotId` VARCHAR(255) NULL,
    ADD COLUMN `counselorName` VARCHAR(100) NULL,
    ADD COLUMN `roomTitle` VARCHAR(255) NULL,
    ADD COLUMN `sentimentRecordId` INTEGER NULL;

-- AlterTable
ALTER TABLE `knowledge_documents` ADD COLUMN `content` MEDIUMTEXT NULL,
    ADD COLUMN `mimeType` VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    MODIFY `cozeDocId` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `messages` DROP COLUMN `sentiment`;

-- AlterTable
ALTER TABLE `notifications` DROP COLUMN `messageId`,
    ADD COLUMN `extra` TEXT NULL,
    MODIFY `roomId` INTEGER UNSIGNED NULL;

-- AlterTable
ALTER TABLE `rooms` DROP COLUMN `sentimentType`,
    ADD COLUMN `sourceRoomId` INTEGER UNSIGNED NULL;

-- AlterTable
ALTER TABLE `user_opinions` DROP COLUMN `likeCount`;

-- DropTable
DROP TABLE `user_emotion_profiles`;

-- CreateTable
CREATE TABLE `emotion_alerts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER UNSIGNED NOT NULL,
    `sessionId` INTEGER NOT NULL,
    `riskLevel` VARCHAR(20) NOT NULL,
    `summary` TEXT NOT NULL,
    `isHandled` BOOLEAN NOT NULL DEFAULT false,
    `handleNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `handledAt` DATETIME(3) NULL,

    INDEX `emotion_alerts_userId_idx`(`userId`),
    INDEX `emotion_alerts_isHandled_idx`(`isHandled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emotion_alerts` ADD CONSTRAINT `emotion_alerts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
