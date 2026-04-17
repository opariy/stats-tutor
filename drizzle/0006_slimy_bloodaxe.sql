CREATE TABLE "learning_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_topic_id" uuid NOT NULL,
	"objective" text NOT NULL,
	"check_method" text NOT NULL,
	"difficulty" text DEFAULT 'core' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_objective_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"passed_at" timestamp,
	"conversation_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_objective" UNIQUE("user_id","objective_id")
);
--> statement-breakpoint
CREATE TABLE "student_topic_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_topic_id" uuid NOT NULL,
	"status" text DEFAULT 'locked' NOT NULL,
	"core_objectives_passed" integer DEFAULT 0 NOT NULL,
	"total_core_objectives" integer DEFAULT 0 NOT NULL,
	"unlocked_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_topic_status" UNIQUE("user_id","course_topic_id")
);
--> statement-breakpoint
CREATE TABLE "topic_quiz_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_topic_id" uuid NOT NULL,
	"quiz_type" text NOT NULL,
	"questions_json" jsonb NOT NULL,
	"answers_json" jsonb,
	"score" integer,
	"passed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_prompts" ALTER COLUMN "teaching_style" SET DEFAULT 'guided';--> statement-breakpoint
ALTER TABLE "learning_objectives" ADD CONSTRAINT "learning_objectives_course_topic_id_course_topics_id_fk" FOREIGN KEY ("course_topic_id") REFERENCES "public"."course_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_objective_progress" ADD CONSTRAINT "student_objective_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_objective_progress" ADD CONSTRAINT "student_objective_progress_objective_id_learning_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."learning_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_objective_progress" ADD CONSTRAINT "student_objective_progress_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_topic_status" ADD CONSTRAINT "student_topic_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_topic_status" ADD CONSTRAINT "student_topic_status_course_topic_id_course_topics_id_fk" FOREIGN KEY ("course_topic_id") REFERENCES "public"."course_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_quiz_results" ADD CONSTRAINT "topic_quiz_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_quiz_results" ADD CONSTRAINT "topic_quiz_results_course_topic_id_course_topics_id_fk" FOREIGN KEY ("course_topic_id") REFERENCES "public"."course_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_objectives_topic" ON "learning_objectives" USING btree ("course_topic_id");--> statement-breakpoint
CREATE INDEX "idx_progress_user" ON "student_objective_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_progress_objective" ON "student_objective_progress" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_status_user" ON "student_topic_status" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_status_topic" ON "student_topic_status" USING btree ("course_topic_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_user" ON "topic_quiz_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_topic" ON "topic_quiz_results" USING btree ("course_topic_id");