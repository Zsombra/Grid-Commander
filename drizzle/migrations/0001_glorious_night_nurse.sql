CREATE TABLE IF NOT EXISTS "proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"operation" text NOT NULL,
	"target" text NOT NULL,
	"proposed_values" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposals" ADD CONSTRAINT "proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposals_user_id_recorded_at_idx" ON "proposals" USING btree ("user_id","recorded_at");