-- AlterTable
ALTER TABLE `photographers`
ADD COLUMN `pendingFixedMakeupArtistId` INT UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `photographers_pendingFixedMakeupArtistId_idx` ON `photographers`(`pendingFixedMakeupArtistId`);

-- AddForeignKey
ALTER TABLE `photographers`
ADD CONSTRAINT `photographers_pendingFixedMakeupArtistId_fkey`
  FOREIGN KEY (`pendingFixedMakeupArtistId`) REFERENCES `photographers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
