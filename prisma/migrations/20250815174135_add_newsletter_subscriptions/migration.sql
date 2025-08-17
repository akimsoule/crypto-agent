-- CreateTable
CREATE TABLE "public"."newsletter_subscriptions" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'web',
    "preferences" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "lastEmailSent" TIMESTAMP(3),
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "bounced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscriptions_email_key" ON "public"."newsletter_subscriptions"("email");

-- CreateIndex
CREATE INDEX "newsletter_subscriptions_email_idx" ON "public"."newsletter_subscriptions"("email");

-- CreateIndex
CREATE INDEX "newsletter_subscriptions_isActive_idx" ON "public"."newsletter_subscriptions"("isActive");

-- CreateIndex
CREATE INDEX "newsletter_subscriptions_createdAt_idx" ON "public"."newsletter_subscriptions"("createdAt");
