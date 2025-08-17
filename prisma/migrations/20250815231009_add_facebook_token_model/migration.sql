-- CreateTable
CREATE TABLE "public"."facebook_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'PAGE_ACCESS_TOKEN',
    "pageId" TEXT,
    "pageName" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facebook_tokens_token_key" ON "public"."facebook_tokens"("token");

-- CreateIndex
CREATE INDEX "facebook_tokens_isActive_idx" ON "public"."facebook_tokens"("isActive");

-- CreateIndex
CREATE INDEX "facebook_tokens_tokenType_idx" ON "public"."facebook_tokens"("tokenType");
