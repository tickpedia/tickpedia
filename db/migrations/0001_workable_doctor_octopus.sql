CREATE TYPE "public"."tick_status" AS ENUM('established', 'reported', 'no_records');--> statement-breakpoint
CREATE TABLE "tick_county" (
	"id" serial PRIMARY KEY NOT NULL,
	"tick_id" integer NOT NULL,
	"county_fips" text NOT NULL,
	"year" integer NOT NULL,
	"status" "tick_status" DEFAULT 'no_records' NOT NULL,
	"source" text,
	"source_comments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "disease_county_year" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "disease_county_year" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "disease_month" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "disease_month" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "diseases" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "removal_techniques" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "removal_techniques" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tick_state" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tick_state" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ticks" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "wild_facts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tick_county" ADD CONSTRAINT "tick_county_tick_id_ticks_id_fk" FOREIGN KEY ("tick_id") REFERENCES "public"."ticks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tick_county" ADD CONSTRAINT "tick_county_county_fips_counties_fips_fk" FOREIGN KEY ("county_fips") REFERENCES "public"."counties"("fips") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tick_county_natural_idx" ON "tick_county" USING btree ("tick_id","county_fips","year");--> statement-breakpoint
CREATE UNIQUE INDEX "ticks_scientific_idx" ON "ticks" USING btree ("scientific_name");