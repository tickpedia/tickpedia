CREATE TABLE "disease_pathogens" (
	"id" serial PRIMARY KEY NOT NULL,
	"disease_id" integer NOT NULL,
	"pathogen_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tick_pathogens" (
	"id" serial PRIMARY KEY NOT NULL,
	"tick_id" integer NOT NULL,
	"pathogen_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "disease_pathogens" ADD CONSTRAINT "disease_pathogens_disease_id_diseases_id_fk" FOREIGN KEY ("disease_id") REFERENCES "public"."diseases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disease_pathogens" ADD CONSTRAINT "disease_pathogens_pathogen_id_pathogens_id_fk" FOREIGN KEY ("pathogen_id") REFERENCES "public"."pathogens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tick_pathogens" ADD CONSTRAINT "tick_pathogens_tick_id_ticks_id_fk" FOREIGN KEY ("tick_id") REFERENCES "public"."ticks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tick_pathogens" ADD CONSTRAINT "tick_pathogens_pathogen_id_pathogens_id_fk" FOREIGN KEY ("pathogen_id") REFERENCES "public"."pathogens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "disease_pathogens_natural_idx" ON "disease_pathogens" USING btree ("disease_id","pathogen_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tick_pathogens_natural_idx" ON "tick_pathogens" USING btree ("tick_id","pathogen_id");