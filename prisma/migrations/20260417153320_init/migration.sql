-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "monthly_income" REAL NOT NULL DEFAULT 0,
    "risk_appetite" INTEGER NOT NULL DEFAULT 3,
    "phone" TEXT,
    "password_hash" TEXT,
    "avatar_url" TEXT,
    "auth_provider" TEXT NOT NULL DEFAULT 'credentials',
    "google_id" TEXT,
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "merchant" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target_amount" REAL NOT NULL,
    "current_savings" REAL NOT NULL DEFAULT 0,
    "deadline_months" INTEGER NOT NULL,
    "daily_save_required" REAL,
    "narrative" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "portfolio_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "risk_score" INTEGER,
    "allocation" TEXT,
    "instruments" TEXT,
    "sip_amount" REAL,
    "reasoning" TEXT,
    "macro_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolio_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "nudge_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "merchant" TEXT,
    "amount" REAL,
    "category" TEXT,
    "nudge_message" TEXT,
    "user_action" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nudge_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "spending_patterns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "pattern_type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "frequency" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "detected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "behavioral_insights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "insight_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_profiles_user_id_key" ON "portfolio_profiles"("user_id");

-- CreateIndex
CREATE INDEX "portfolio_profiles_user_id_idx" ON "portfolio_profiles"("user_id");

-- CreateIndex
CREATE INDEX "nudge_log_user_id_idx" ON "nudge_log"("user_id");

-- CreateIndex
CREATE INDEX "spending_patterns_user_id_idx" ON "spending_patterns"("user_id");

-- CreateIndex
CREATE INDEX "behavioral_insights_user_id_idx" ON "behavioral_insights"("user_id");
