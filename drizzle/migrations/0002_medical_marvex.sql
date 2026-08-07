CREATE TABLE IF NOT EXISTS "signal_capture_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"platform_version" text,
	"provenance_kind" text NOT NULL,
	"named_interval" text,
	"subjects" jsonb NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signal_captures" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"user_id" text NOT NULL,
	"coin_ticker" text NOT NULL,
	"interval" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL,
	"failure_reason" text,
	"current_price" double precision,
	"price_change_percent" double precision,
	"dominant_bias" text,
	"aggregate_score_percent" double precision,
	"has_conflicting_signals" boolean,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signal_readings" (
	"id" text PRIMARY KEY NOT NULL,
	"capture_id" text NOT NULL,
	"user_id" text NOT NULL,
	"signal_id" text NOT NULL,
	"module" text,
	"triggered" boolean NOT NULL,
	"bias" text,
	"direction" text,
	"score" double precision,
	"score_percent" double precision,
	"effective_allocation" double precision,
	"is_primary" boolean NOT NULL,
	"required" boolean NOT NULL,
	"details" text,
	"indicator_values" jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal_captures" ADD CONSTRAINT "signal_captures_run_id_signal_capture_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."signal_capture_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal_readings" ADD CONSTRAINT "signal_readings_capture_id_signal_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."signal_captures"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_capture_runs_user_id_started_at_idx" ON "signal_capture_runs" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_captures_user_series_idx" ON "signal_captures" USING btree ("user_id","coin_ticker","interval","captured_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_captures_run_id_idx" ON "signal_captures" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_readings_capture_id_idx" ON "signal_readings" USING btree ("capture_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_readings_user_signal_idx" ON "signal_readings" USING btree ("user_id","signal_id");