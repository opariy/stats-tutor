CREATE TABLE "prerequisite_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"course_topic_id" uuid,
	"conversation_id" uuid,
	"concept" text NOT NULL,
	"evidence" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'detected' NOT NULL,
	"prerequisite_chapter_id" uuid,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "prerequisite_gaps" ADD CONSTRAINT "prerequisite_gaps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prerequisite_gaps" ADD CONSTRAINT "prerequisite_gaps_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prerequisite_gaps" ADD CONSTRAINT "prerequisite_gaps_course_topic_id_course_topics_id_fk" FOREIGN KEY ("course_topic_id") REFERENCES "public"."course_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prerequisite_gaps" ADD CONSTRAINT "prerequisite_gaps_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prerequisite_gaps" ADD CONSTRAINT "prerequisite_gaps_prerequisite_chapter_id_course_chapters_id_fk" FOREIGN KEY ("prerequisite_chapter_id") REFERENCES "public"."course_chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_gaps_user" ON "prerequisite_gaps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gaps_course" ON "prerequisite_gaps" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_gaps_status" ON "prerequisite_gaps" USING btree ("status");