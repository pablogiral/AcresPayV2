CREATE TABLE IF NOT EXISTS "gang_members" (
	"gang_id" text NOT NULL,
	"friend_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gang_members_gang_id_friend_id_pk" PRIMARY KEY("gang_id","friend_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gangs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gang_members" ADD CONSTRAINT "gang_members_gang_id_gangs_id_fk" FOREIGN KEY ("gang_id") REFERENCES "public"."gangs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gang_members" ADD CONSTRAINT "gang_members_friend_id_friends_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."friends"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gangs" ADD CONSTRAINT "gangs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gang_members_gang_idx" ON "gang_members" USING btree ("gang_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gang_members_friend_idx" ON "gang_members" USING btree ("friend_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gangs_user_idx" ON "gangs" USING btree ("user_id");