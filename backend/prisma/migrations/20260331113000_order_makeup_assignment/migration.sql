-- Photographer: fixed cooperative makeup artist
ALTER TABLE `photographers`
  ADD COLUMN `fixedMakeupArtistId` INT UNSIGNED NULL;

CREATE INDEX `photographers_fixedMakeupArtistId_idx`
  ON `photographers`(`fixedMakeupArtistId`);

ALTER TABLE `photographers`
  ADD CONSTRAINT `photographers_fixedMakeupArtistId_fkey`
  FOREIGN KEY (`fixedMakeupArtistId`) REFERENCES `photographers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Booking order: makeup assignment lifecycle
ALTER TABLE `booking_orders`
  ADD COLUMN `requestedMakeupArtistId` INT UNSIGNED NULL,
  ADD COLUMN `requestedMakeupArtistName` VARCHAR(100) NULL,
  ADD COLUMN `assignedMakeupArtistId` INT UNSIGNED NULL,
  ADD COLUMN `assignedMakeupArtistName` VARCHAR(100) NULL,
  ADD COLUMN `makeupScheduleStatus` VARCHAR(30) NULL,
  ADD COLUMN `makeupScheduleConfirmedAt` DATETIME(3) NULL;

CREATE INDEX `booking_orders_assignedMakeupArtistId_shootingDate_idx`
  ON `booking_orders`(`assignedMakeupArtistId`, `shootingDate`);
