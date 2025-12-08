-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `academicPosition` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `academicRank` VARCHAR(191) NULL,
    `workStatus` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `curriculum` VARCHAR(191) NULL,
    `adminTitle` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'LECTURER', 'PROGRAM_CHAIR', 'VICE_DEAN') NOT NULL DEFAULT 'LECTURER',
    `userType` ENUM('ACADEMIC', 'SUPPORT') NOT NULL DEFAULT 'ACADEMIC',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Program` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name_th` VARCHAR(191) NOT NULL,
    `degree_level` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `programChairId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subject` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name_th` VARCHAR(191) NOT NULL,
    `name_en` VARCHAR(191) NULL,
    `credit` VARCHAR(191) NOT NULL,
    `program_full_name` VARCHAR(191) NULL,
    `programId` INTEGER NOT NULL,
    `responsibleUserId` INTEGER NULL,

    UNIQUE INDEX `Subject_code_programId_key`(`code`, `programId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeachingAssignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `academicYear` INTEGER NOT NULL,
    `semester` INTEGER NOT NULL,
    `section` VARCHAR(191) NULL,
    `lectureHours` DOUBLE NOT NULL DEFAULT 0.0,
    `labHours` DOUBLE NOT NULL DEFAULT 0.0,
    `headApprovalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'DRAFT') NOT NULL DEFAULT 'PENDING',
    `headApprovedAt` DATETIME(3) NULL,
    `headApproverId` INTEGER NULL,
    `deanApprovalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'DRAFT') NOT NULL DEFAULT 'PENDING',
    `deanApprovedAt` DATETIME(3) NULL,
    `deanApproverId` INTEGER NULL,
    `lecturerId` INTEGER NOT NULL,
    `subjectId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeachingAssignment_lecturerId_academicYear_semester_idx`(`lecturerId`, `academicYear`, `semester`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Program` ADD CONSTRAINT `Program_programChairId_fkey` FOREIGN KEY (`programChairId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subject` ADD CONSTRAINT `Subject_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subject` ADD CONSTRAINT `Subject_responsibleUserId_fkey` FOREIGN KEY (`responsibleUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeachingAssignment` ADD CONSTRAINT `TeachingAssignment_headApproverId_fkey` FOREIGN KEY (`headApproverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeachingAssignment` ADD CONSTRAINT `TeachingAssignment_deanApproverId_fkey` FOREIGN KEY (`deanApproverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeachingAssignment` ADD CONSTRAINT `TeachingAssignment_lecturerId_fkey` FOREIGN KEY (`lecturerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeachingAssignment` ADD CONSTRAINT `TeachingAssignment_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
