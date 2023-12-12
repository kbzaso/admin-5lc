/*
  Warnings:

  - Added the required column `session_token` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signature_token` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "session_token" TEXT NOT NULL,
ADD COLUMN     "signature_token" TEXT NOT NULL;
