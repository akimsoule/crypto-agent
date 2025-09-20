/*
  Warnings:

  - The `size` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `baseVolume` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `fee` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `priceAvg` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `quoteVolume` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `marginSize` column on the `Position` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `available` column on the `Position` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `locked` column on the `Position` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `openPriceAvg` column on the `Position` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unrealizedPL` column on the `Position` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `markPrice` column on the `Position` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `leverage` column on the `Position` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "size",
ADD COLUMN     "size" DECIMAL(65,30) NOT NULL DEFAULT 0,
DROP COLUMN "baseVolume",
ADD COLUMN     "baseVolume" DECIMAL(65,30) NOT NULL DEFAULT 0,
DROP COLUMN "fee",
ADD COLUMN     "fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
DROP COLUMN "priceAvg",
ADD COLUMN     "priceAvg" DECIMAL(65,30) NOT NULL DEFAULT 0,
DROP COLUMN "quoteVolume",
ADD COLUMN     "quoteVolume" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Position" DROP COLUMN "marginSize",
ADD COLUMN     "marginSize" DECIMAL(65,30) NOT NULL DEFAULT 0,
DROP COLUMN "available",
ADD COLUMN     "available" DECIMAL(65,30) NOT NULL DEFAULT 0,
DROP COLUMN "locked",
ADD COLUMN     "locked" DECIMAL(65,30) NOT NULL DEFAULT 0,
DROP COLUMN "openPriceAvg",
ADD COLUMN     "openPriceAvg" DECIMAL(65,30) NOT NULL DEFAULT 0,
DROP COLUMN "unrealizedPL",
ADD COLUMN     "unrealizedPL" DECIMAL(65,30) NOT NULL DEFAULT 0,
DROP COLUMN "markPrice",
ADD COLUMN     "markPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
DROP COLUMN "leverage",
ADD COLUMN     "leverage" INTEGER NOT NULL DEFAULT 1;
