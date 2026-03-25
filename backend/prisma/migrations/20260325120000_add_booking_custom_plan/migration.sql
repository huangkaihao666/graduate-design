-- Add custom plan JSON field for booking orders.
ALTER TABLE `booking_orders` ADD COLUMN `customPlan` JSON NULL;

