CREATE TYPE "public"."ai_package" AS ENUM('EXECUTIVE_BRIEFING', 'ONE_DAY_INTENSIVE');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('CONFIRMED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."expert_plan" AS ENUM('STARTER', 'PROFESSIONAL', 'PREMIER');--> statement-breakpoint
CREATE TYPE "public"."expert_role" AS ENUM('TRAINER', 'FACILITATOR', 'COACH', 'CONSULTANT');--> statement-breakpoint
CREATE TYPE "public"."delivery_format" AS ENUM('ONLINE', 'ONSITE', 'EITHER');--> statement-breakpoint
CREATE TYPE "public"."need_status" AS ENUM('OPEN', 'BOOKED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."order_kind" AS ENUM('TICKET', 'BOOKING', 'EXPERT_PLAN', 'BOOST', 'ORG_PLAN', 'CERTIFICATE');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'NEEDS_REFUND');--> statement-breakpoint
CREATE TYPE "public"."org_plan" AS ENUM('PAYG', 'PARTNER', 'ENTERPRISE');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('SENT', 'ACCEPTED', 'DECLINED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('EXPERT', 'ORG', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."speaker_tier" AS ENUM('ICON', 'EXECUTIVE', 'EXPERT');--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage" AS ENUM('REQUESTED', 'QUOTED', 'CONFIRMED', 'PAID', 'DECLINED');--> statement-breakpoint
CREATE TYPE "public"."stream" AS ENUM('BOOKING_COMMISSION', 'WORKSHOP_TICKETS', 'SPEAKER_FEES', 'AI_FOR_LEADERS', 'CERTIFICATES', 'EXPERT_SUBSCRIPTIONS', 'FEATURED_LISTINGS', 'ORGANIZATION_PLANS', 'SPONSORSHIP');--> statement-breakpoint
CREATE TYPE "public"."workshop_status" AS ENUM('PENDING_REVIEW', 'PUBLISHED', 'REJECTED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"need_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"org_id" text NOT NULL,
	"expert_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"status" "booking_status" DEFAULT 'CONFIRMED' NOT NULL,
	"order_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_need_id_unique" UNIQUE("need_id"),
	CONSTRAINT "bookings_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "bookings_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"holder_name" text NOT NULL,
	"program" text NOT NULL,
	"org_name" text,
	"issued_by_id" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"order_id" text,
	CONSTRAINT "certificates_code_unique" UNIQUE("code"),
	CONSTRAINT "certificates_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "experts" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"role" "expert_role" NOT NULL,
	"headline" text NOT NULL,
	"bio" text NOT NULL,
	"city" text NOT NULL,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"formats" "delivery_format"[] DEFAULT '{}' NOT NULL,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"years_experience" integer DEFAULT 0 NOT NULL,
	"plan" "expert_plan" DEFAULT 'STARTER' NOT NULL,
	"plan_renews_at" timestamp with time zone,
	"status" "profile_status" DEFAULT 'PENDING' NOT NULL,
	"consent_to_list" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone,
	"featured_until" timestamp with time zone,
	"rating" real DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "experts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"stream" "stream" NOT NULL,
	"description" text NOT NULL,
	"gross_minor" integer NOT NULL,
	"payout_minor" integer NOT NULL,
	"platform_minor" integer NOT NULL,
	"operator_minor" integer NOT NULL,
	"tech_partner_minor" integer NOT NULL,
	"expert_id" text,
	"org_id" text,
	"order_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_needs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"participants" integer NOT NULL,
	"budget_minor" integer NOT NULL,
	"format" "delivery_format" NOT NULL,
	"status" "need_status" DEFAULT 'OPEN' NOT NULL,
	"target_expert_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"tran_id" text NOT NULL,
	"kind" "order_kind" NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"email" text NOT NULL,
	"user_id" text,
	"meta" jsonb NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"fail_reason" text,
	"result" jsonb,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_tran_id_unique" UNIQUE("tran_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"plan" "org_plan" DEFAULT 'PAYG' NOT NULL,
	"plan_renews_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "packages" (
	"id" text PRIMARY KEY NOT NULL,
	"expert_id" text NOT NULL,
	"title" text NOT NULL,
	"price_minor" integer NOT NULL,
	"unit" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"expert_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"reference" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"org_name" text NOT NULL,
	"email" text NOT NULL,
	"package" "ai_package" NOT NULL,
	"leaders" integer NOT NULL,
	"stage" "pipeline_stage" DEFAULT 'REQUESTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"need_id" text NOT NULL,
	"expert_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"message" text NOT NULL,
	"status" "quote_status" DEFAULT 'SENT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"starter_fee_minor" integer DEFAULT 0 NOT NULL,
	"professional_fee_minor" integer DEFAULT 150000 NOT NULL,
	"premier_fee_minor" integer DEFAULT 400000 NOT NULL,
	"starter_commission_bps" integer DEFAULT 2000 NOT NULL,
	"professional_commission_bps" integer DEFAULT 1500 NOT NULL,
	"premier_commission_bps" integer DEFAULT 1000 NOT NULL,
	"workshop_fee_bps" integer DEFAULT 1500 NOT NULL,
	"speaker_fee_bps" integer DEFAULT 2000 NOT NULL,
	"ai_facilitator_bps" integer DEFAULT 6000 NOT NULL,
	"certificate_fee_minor" integer DEFAULT 50000 NOT NULL,
	"boost_fee_minor" integer DEFAULT 200000 NOT NULL,
	"partner_plan_fee_minor" integer DEFAULT 15000000 NOT NULL,
	"enterprise_plan_fee_minor" integer DEFAULT 40000000 NOT NULL,
	"partner_discount_bps" integer DEFAULT 1000 NOT NULL,
	"ai_briefing_price_minor" integer DEFAULT 8000000 NOT NULL,
	"ai_one_day_price_minor" integer DEFAULT 25000000 NOT NULL,
	"tech_partner_bps" integer DEFAULT 3000 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "speaker_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"speaker_id" text NOT NULL,
	"org_name" text NOT NULL,
	"email" text NOT NULL,
	"event_type" text NOT NULL,
	"audience" integer NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"stage" "pipeline_stage" DEFAULT 'REQUESTED' NOT NULL,
	"quote_minor" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "speakers" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"tier" "speaker_tier" NOT NULL,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"fee_from_minor" integer,
	"consent_to_list" boolean DEFAULT false NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "speakers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sponsorships" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price_minor" integer NOT NULL,
	"sold_to" text,
	"sold_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"workshop_id" text NOT NULL,
	"order_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"seats" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_code_unique" UNIQUE("code"),
	CONSTRAINT "tickets_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"org_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workshops" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"expert_id" text NOT NULL,
	"format" "delivery_format" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration" text NOT NULL,
	"venue" text NOT NULL,
	"price_minor" integer NOT NULL,
	"seats" integer NOT NULL,
	"seats_sold" integer DEFAULT 0 NOT NULL,
	"status" "workshop_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_need_id_training_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."training_needs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_id_experts_id_fk" FOREIGN KEY ("issued_by_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificates" ADD CONSTRAINT "certificates_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experts" ADD CONSTRAINT "experts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_needs" ADD CONSTRAINT "training_needs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_needs" ADD CONSTRAINT "training_needs_target_expert_id_experts_id_fk" FOREIGN KEY ("target_expert_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "packages" ADD CONSTRAINT "packages_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payouts" ADD CONSTRAINT "payouts_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotes" ADD CONSTRAINT "quotes_need_id_training_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."training_needs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotes" ADD CONSTRAINT "quotes_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "speaker_requests" ADD CONSTRAINT "speaker_requests_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workshops" ADD CONSTRAINT "workshops_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experts_listing_idx" ON "experts" USING btree ("status","consent_to_list");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_stream_idx" ON "ledger_entries" USING btree ("stream","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "needs_status_idx" ON "training_needs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_need_expert_uq" ON "quotes" USING btree ("need_id","expert_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshops_listing_idx" ON "workshops" USING btree ("status","starts_at");