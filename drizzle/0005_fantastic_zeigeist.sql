CREATE TABLE "course_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_course_chapter" UNIQUE("course_id","number")
);
--> statement-breakpoint
CREATE TABLE "course_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"blob_url" text,
	"text_content" text,
	"processed" boolean DEFAULT false,
	"extracted_topics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"name" text DEFAULT 'default' NOT NULL,
	"content" text,
	"teaching_style" text DEFAULT 'socratic',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_course_prompt" UNIQUE("course_id","name")
);
--> statement-breakpoint
CREATE TABLE "course_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"suggestions" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"source" text DEFAULT 'manual',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_course_topic_slug" UNIQUE("course_id","slug")
);
--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "professor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "curriculum_mode" text DEFAULT 'auto_generated';--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "subject_description" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "is_self_serve" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "owner_user_id" uuid;--> statement-breakpoint
ALTER TABLE "message_tags" ADD COLUMN "course_topic_id" uuid;--> statement-breakpoint
ALTER TABLE "topic_mastery" ADD COLUMN "course_topic_id" uuid;--> statement-breakpoint
ALTER TABLE "course_chapters" ADD CONSTRAINT "course_chapters_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_prompts" ADD CONSTRAINT "course_prompts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_topics" ADD CONSTRAINT "course_topics_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_topics" ADD CONSTRAINT "course_topics_chapter_id_course_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."course_chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_course_chapters_course" ON "course_chapters" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_materials_course" ON "course_materials" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_topics_course" ON "course_topics" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_topics_chapter" ON "course_topics" USING btree ("chapter_id");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;