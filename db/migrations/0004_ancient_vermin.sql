-- Add wild_facts.slug for idempotent JSON imports.
-- Two-step so existing rows get a derived slug before NOT NULL kicks in.

ALTER TABLE "wild_facts" ADD COLUMN "slug" text;--> statement-breakpoint

UPDATE "wild_facts"
SET "slug" = 'fact-' || id
WHERE "slug" IS NULL;
--> statement-breakpoint

ALTER TABLE "wild_facts" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "wild_facts_slug_idx" ON "wild_facts" USING btree ("slug");
