CREATE TABLE "api_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"status_code" integer NOT NULL,
	"error_message" text,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic_id" text NOT NULL,
	"conversation_id" uuid,
	"declared_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_topic" UNIQUE("user_id","topic_id")
);
--> statement-breakpoint
ALTER TABLE "api_errors" ADD CONSTRAINT "api_errors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_mastery" ADD CONSTRAINT "topic_mastery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_mastery" ADD CONSTRAINT "topic_mastery_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_errors_created" ON "api_errors" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_conv_user" ON "messages" USING btree ("conversation_id","user_id","created_at");