/*
  Warnings:

  - You are about to drop the `booking_order_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `conversation_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `conversations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `worker_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `booking_order_messages` DROP FOREIGN KEY `booking_order_messages_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `booking_order_messages` DROP FOREIGN KEY `booking_order_messages_senderUserId_fkey`;

-- DropForeignKey
ALTER TABLE `conversation_messages` DROP FOREIGN KEY `conversation_messages_conversationId_fkey`;

-- DropForeignKey
ALTER TABLE `conversation_messages` DROP FOREIGN KEY `conversation_messages_senderUserId_fkey`;

-- DropForeignKey
ALTER TABLE `conversations` DROP FOREIGN KEY `conversations_userId_fkey`;

-- DropForeignKey
ALTER TABLE `conversations` DROP FOREIGN KEY `conversations_workerUserId_fkey`;

-- DropForeignKey
ALTER TABLE `worker_profiles` DROP FOREIGN KEY `worker_profiles_userId_fkey`;

-- DropIndex
DROP INDEX `users_role_idx` ON `users`;

-- DropTable
DROP TABLE `booking_order_messages`;

-- DropTable
DROP TABLE `conversation_messages`;

-- DropTable
DROP TABLE `conversations`;

-- DropTable
DROP TABLE `worker_profiles`;

-- CreateIndex
CREATE INDEX `booking_orders_photographerId_idx` ON `booking_orders`(`photographerId`);
