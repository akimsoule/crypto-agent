/*
  Warnings:

  - You are about to alter the column `initialBalance` on the `InvestorProfile` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `maxPositionSize` on the `InvestorProfile` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `riskTolerance` on the `InvestorProfile` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `riskMin` on the `InvestorProfile` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `riskMax` on the `InvestorProfile` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "public"."InvestorProfile" ALTER COLUMN "initialBalance" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "maxPositionSize" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "riskTolerance" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "riskMin" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "riskMax" SET DATA TYPE DECIMAL(65,30);
