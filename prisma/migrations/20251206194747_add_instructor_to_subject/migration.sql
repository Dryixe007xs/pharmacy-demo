-- AlterTable
ALTER TABLE `subject` ADD COLUMN `instructor` TEXT NULL;

-- AlterTable
ALTER TABLE `teachingassignment` ADD COLUMN `lecturerActionAt` DATETIME(3) NULL,
    ADD COLUMN `lecturerFeedback` TEXT NULL,
    ADD COLUMN `lecturerStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'DRAFT') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `responsibleActionAt` DATETIME(3) NULL,
    ADD COLUMN `responsibleStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'DRAFT') NOT NULL DEFAULT 'PENDING';
