-- AlterEnum
-- Add new cylinder types to the CylinderType enum
-- This migration adds CYLINDER_6KG and CYLINDER_30KG to support new cylinder sizes
ALTER TYPE "CylinderType" ADD VALUE IF NOT EXISTS 'CYLINDER_6KG';
ALTER TYPE "CylinderType" ADD VALUE IF NOT EXISTS 'CYLINDER_30KG';

