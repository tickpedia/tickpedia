CREATE TYPE "public"."technique_kind" AS ENUM('removal', 'prevention', 'aftercare', 'diagnostic', 'myth');--> statement-breakpoint
ALTER TABLE "removal_techniques" ADD COLUMN "kind" "technique_kind" DEFAULT 'removal' NOT NULL;--> statement-breakpoint
ALTER TABLE "removal_techniques" ADD COLUMN "prevention_score" integer;--> statement-breakpoint
ALTER TABLE "removal_techniques" ADD COLUMN "citations" text[] DEFAULT ARRAY[]::text[] NOT NULL;