CREATE TYPE "public"."pathogen_status" AS ENUM('present', 'no_records');--> statement-breakpoint
CREATE TABLE "pathogen_county" (
	"id" serial PRIMARY KEY NOT NULL,
	"pathogen_id" integer NOT NULL,
	"county_fips" text NOT NULL,
	"year" integer NOT NULL,
	"status" "pathogen_status" DEFAULT 'no_records' NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pathogens" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"scientific_name" text NOT NULL,
	"one_liner" text,
	"aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pathogen_county" ADD CONSTRAINT "pathogen_county_pathogen_id_pathogens_id_fk" FOREIGN KEY ("pathogen_id") REFERENCES "public"."pathogens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pathogen_county" ADD CONSTRAINT "pathogen_county_county_fips_counties_fips_fk" FOREIGN KEY ("county_fips") REFERENCES "public"."counties"("fips") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pathogen_county_natural_idx" ON "pathogen_county" USING btree ("pathogen_id","county_fips","year");--> statement-breakpoint
CREATE UNIQUE INDEX "pathogens_slug_idx" ON "pathogens" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "pathogens_scientific_idx" ON "pathogens" USING btree ("scientific_name");