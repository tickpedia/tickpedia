CREATE TABLE "tick_diseases" (
	"id" serial PRIMARY KEY NOT NULL,
	"tick_id" integer NOT NULL,
	"disease_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tick_removal_techniques" (
	"id" serial PRIMARY KEY NOT NULL,
	"tick_id" integer NOT NULL,
	"removal_technique_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wild_fact_diseases" (
	"id" serial PRIMARY KEY NOT NULL,
	"wild_fact_id" integer NOT NULL,
	"disease_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wild_fact_removal_techniques" (
	"id" serial PRIMARY KEY NOT NULL,
	"wild_fact_id" integer NOT NULL,
	"removal_technique_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wild_fact_ticks" (
	"id" serial PRIMARY KEY NOT NULL,
	"wild_fact_id" integer NOT NULL,
	"tick_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wild_facts" DROP CONSTRAINT "wild_facts_tick_id_ticks_id_fk";
--> statement-breakpoint
ALTER TABLE "tick_diseases" ADD CONSTRAINT "tick_diseases_tick_id_ticks_id_fk" FOREIGN KEY ("tick_id") REFERENCES "public"."ticks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tick_diseases" ADD CONSTRAINT "tick_diseases_disease_id_diseases_id_fk" FOREIGN KEY ("disease_id") REFERENCES "public"."diseases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tick_removal_techniques" ADD CONSTRAINT "tick_removal_techniques_tick_id_ticks_id_fk" FOREIGN KEY ("tick_id") REFERENCES "public"."ticks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tick_removal_techniques" ADD CONSTRAINT "tick_removal_techniques_removal_technique_id_removal_techniques_id_fk" FOREIGN KEY ("removal_technique_id") REFERENCES "public"."removal_techniques"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wild_fact_diseases" ADD CONSTRAINT "wild_fact_diseases_wild_fact_id_wild_facts_id_fk" FOREIGN KEY ("wild_fact_id") REFERENCES "public"."wild_facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wild_fact_diseases" ADD CONSTRAINT "wild_fact_diseases_disease_id_diseases_id_fk" FOREIGN KEY ("disease_id") REFERENCES "public"."diseases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wild_fact_removal_techniques" ADD CONSTRAINT "wild_fact_removal_techniques_wild_fact_id_wild_facts_id_fk" FOREIGN KEY ("wild_fact_id") REFERENCES "public"."wild_facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wild_fact_removal_techniques" ADD CONSTRAINT "wild_fact_removal_techniques_removal_technique_id_removal_techniques_id_fk" FOREIGN KEY ("removal_technique_id") REFERENCES "public"."removal_techniques"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wild_fact_ticks" ADD CONSTRAINT "wild_fact_ticks_wild_fact_id_wild_facts_id_fk" FOREIGN KEY ("wild_fact_id") REFERENCES "public"."wild_facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wild_fact_ticks" ADD CONSTRAINT "wild_fact_ticks_tick_id_ticks_id_fk" FOREIGN KEY ("tick_id") REFERENCES "public"."ticks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tick_diseases_natural_idx" ON "tick_diseases" USING btree ("tick_id","disease_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tick_removal_techniques_natural_idx" ON "tick_removal_techniques" USING btree ("tick_id","removal_technique_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wild_fact_diseases_natural_idx" ON "wild_fact_diseases" USING btree ("wild_fact_id","disease_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wild_fact_removal_techniques_natural_idx" ON "wild_fact_removal_techniques" USING btree ("wild_fact_id","removal_technique_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wild_fact_ticks_natural_idx" ON "wild_fact_ticks" USING btree ("wild_fact_id","tick_id");--> statement-breakpoint

-- Backfill tick_diseases from the legacy ticks.diseases text[] column.
-- Match by display_name (case-insensitive) first, fall back to alias hits.
-- Anything that doesn't resolve is left behind — the admin can pick it up
-- in the per-tick edit form afterwards.
INSERT INTO "tick_diseases" ("tick_id", "disease_id")
SELECT DISTINCT t.id, d.id
FROM "ticks" t
CROSS JOIN LATERAL unnest(t."diseases") AS dn(name)
JOIN "diseases" d
  ON lower(d."display_name") = lower(trim(dn.name))
  OR lower(trim(dn.name)) = ANY (SELECT lower(a) FROM unnest(d."aliases") a)
ON CONFLICT ("tick_id", "disease_id") DO NOTHING;
--> statement-breakpoint

-- Backfill wild_fact_ticks from the legacy single-FK column.
INSERT INTO "wild_fact_ticks" ("wild_fact_id", "tick_id")
SELECT id, "tick_id" FROM "wild_facts" WHERE "tick_id" IS NOT NULL
ON CONFLICT ("wild_fact_id", "tick_id") DO NOTHING;
--> statement-breakpoint

ALTER TABLE "ticks" DROP COLUMN "diseases";--> statement-breakpoint
ALTER TABLE "wild_facts" DROP COLUMN "tick_id";