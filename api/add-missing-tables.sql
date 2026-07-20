-- Add missing report_cache table
CREATE TABLE IF NOT EXISTS `report_cache` (
  `id` varchar(36) NOT NULL,
  `reportType` varchar(100) NOT NULL,
  `parameters` json NULL,
  `data` json NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expiresAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;