CREATE TYPE "public"."danger_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."prevalence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "counties" (
	"fips" text PRIMARY KEY NOT NULL,
	"state_fips" text NOT NULL,
	"county_name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disease_county_year" (
	"id" serial PRIMARY KEY NOT NULL,
	"county_fips" text NOT NULL,
	"disease_id" integer NOT NULL,
	"year" integer NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disease_month" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"disease_id" integer NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diseases" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "removal_techniques" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"steps" text NOT NULL,
	"source_url" text
);
--> statement-breakpoint
CREATE TABLE "states" (
	"fips" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tick_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"tick_id" integer NOT NULL,
	"state_fips" text NOT NULL,
	"prevalence" "prevalence" DEFAULT 'low' NOT NULL,
	"peak_months" integer[] DEFAULT ARRAY[]::integer[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticks" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"common_name" text NOT NULL,
	"scientific_name" text NOT NULL,
	"hero_photo_url" text,
	"danger_level" "danger_level" DEFAULT 'low' NOT NULL,
	"diseases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wild_facts" (
	"id" serial PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"citation_url" text,
	"tick_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "counties" ADD CONSTRAINT "counties_state_fips_states_fips_fk" FOREIGN KEY ("state_fips") REFERENCES "public"."states"("fips") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disease_county_year" ADD CONSTRAINT "disease_county_year_county_fips_counties_fips_fk" FOREIGN KEY ("county_fips") REFERENCES "public"."counties"("fips") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disease_county_year" ADD CONSTRAINT "disease_county_year_disease_id_diseases_id_fk" FOREIGN KEY ("disease_id") REFERENCES "public"."diseases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disease_month" ADD CONSTRAINT "disease_month_disease_id_diseases_id_fk" FOREIGN KEY ("disease_id") REFERENCES "public"."diseases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tick_state" ADD CONSTRAINT "tick_state_tick_id_ticks_id_fk" FOREIGN KEY ("tick_id") REFERENCES "public"."ticks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tick_state" ADD CONSTRAINT "tick_state_state_fips_states_fips_fk" FOREIGN KEY ("state_fips") REFERENCES "public"."states"("fips") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wild_facts" ADD CONSTRAINT "wild_facts_tick_id_ticks_id_fk" FOREIGN KEY ("tick_id") REFERENCES "public"."ticks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "counties_state_slug_idx" ON "counties" USING btree ("state_fips","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "disease_county_year_natural_idx" ON "disease_county_year" USING btree ("county_fips","disease_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "disease_month_natural_idx" ON "disease_month" USING btree ("year","month","disease_id");--> statement-breakpoint
CREATE UNIQUE INDEX "diseases_slug_idx" ON "diseases" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "removal_techniques_slug_idx" ON "removal_techniques" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "states_code_idx" ON "states" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "states_slug_idx" ON "states" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tick_state_natural_idx" ON "tick_state" USING btree ("tick_id","state_fips");--> statement-breakpoint
CREATE UNIQUE INDEX "ticks_slug_idx" ON "ticks" USING btree ("slug");