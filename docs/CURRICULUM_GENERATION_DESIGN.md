# Curriculum Generation Design

> Research-backed approach to personalized curriculum generation

## Problem Statement

Current curriculum generation asks only:
1. What do you want to learn?
2. Experience level (intro/intermediate/advanced)
3. Specific focus area

This misses critical information needed to generate truly personalized curricula.

---

## Research Findings

### 1. Diagnostic Assessment Before Curriculum

**Sources:** [Carnegie Mellon](https://www.cmu.edu/teaching/designteach/teach/priorknowledge.html) | [University at Buffalo](https://www.buffalo.edu/catt/teach/develop/design/designing-assessments/diagnostic-assessments.html)

**What to assess:**
- Existing knowledge of the target topic
- Misconceptions (incorrect beliefs that block learning)
- Prerequisite gaps (missing foundation skills)

**Why it matters:** "Since new knowledge is dependent on pre-existing knowledge, knowing what students know before they begin can help craft instructional activities that build off strengths and address weaknesses."

### 2. Knowledge Graphs with Prerequisites

**Sources:** [Educational Knowledge Graphs](https://jedm.educationaldatamining.org/index.php/JEDM/article/view/737) | [SmythOS](https://smythos.com/managers/education/knowledge-graphs-in-education/)

Educational Knowledge Graphs (EKGs) model:
- **Nodes** = concepts/skills
- **Edges** = prerequisite relationships
- **Paths** = valid learning sequences

LLMs can analyze these graphs to "construct personalized, prerequisite-aligned learning paths."

### 3. Zone of Proximal Development (ZPD)

**Sources:** [Simply Psychology](https://www.simplypsychology.org/zone-of-proximal-development.html) | [NWEA](https://www.nwea.org/blog/2025/7-ways-to-use-zpd-and-scaffolding-to-challenge-and-support-students/)

Content should be in the learner's ZPD — not too easy (boring), not too hard (frustrating).

**Three zones:**
| Zone | Description | Action |
|------|-------------|--------|
| Can do alone | Already mastered | Skip or quick review |
| Can do with guidance | Learning happens here (ZPD) | Focus curriculum here |
| Cannot do yet | Too advanced | Needs prerequisites first |

### 4. Bloom's Taxonomy for Progression

**Sources:** [University of Arkansas](https://tips.uark.edu/using-blooms-taxonomy/) | [UCF](https://fctl.ucf.edu/teaching-resources/course-design/blooms-taxonomy/)

Six levels (easiest → hardest):
1. Remember
2. Understand
3. Apply
4. Analyze
5. Evaluate
6. Create

"Students need to achieve at the level which came before to progress to the next."

### 5. Adaptive Learning Evidence

**Sources:** [ScienceDirect Study](https://www.sciencedirect.com/science/article/pii/S2405844024156617) | [KU Online](https://educationonline.ku.edu/community/personalized-learning-in-education)

- 59% of studies show improved academic performance with adaptive learning
- Key strategies: modular content, continuous micro-assessments, dynamic sequencing

---

## Proposed Onboarding Questions

### Required Information to Gather

| # | Question | Purpose | Example Answers |
|---|----------|---------|-----------------|
| 1 | **What do you want to learn?** | Define subject | "Statistics", "Python for data science" |
| 2 | **What do you already know about this topic?** | Find ZPD, skip known content | "Nothing" / "Basic concepts" / "I know X but not Y" |
| 3 | **What do you know about prerequisites?** | Identify foundation gaps | See prerequisite assessment below |
| 4 | **What do you want to be able to DO after?** | Define concrete learning goal | "Pass my stats exam" / "Analyze data at work" |
| 5 | **When do you need this by?** | Determine curriculum length | "2 weeks" / "End of semester" / "No deadline" |
| 6 | **How much time can you dedicate?** | Realistic pacing | "1 hour/day" / "5 hours/week" |
| 7 | **Why are you learning this?** (optional) | Personalize examples/context | "For work" / "Personal interest" / "School requirement" |

### Prerequisite Assessment Flow

When user says they want to learn topic X, the system should:

1. **Identify prerequisites** for topic X (AI-generated based on subject)
   - Example: Statistics requires → Basic algebra, Understanding of percentages
   - Example: Machine Learning requires → Python, Linear algebra, Statistics basics

2. **Ask about prerequisite knowledge:**
   ```
   "Statistics builds on a few foundational concepts.
   How comfortable are you with:
   - Basic algebra (solving equations)?
   - Percentages and ratios?
   - Reading graphs and charts?"
   ```

3. **Based on response:**
   - Confident in all → Skip prerequisites, start at topic
   - Gaps identified → Add prerequisite modules to curriculum
   - Uncertain → Include light prerequisite review

---

## Curriculum Output Changes

### Current Output
```json
{
  "courseName": "Introduction to Statistics",
  "chapters": [
    { "title": "Chapter 1", "topics": [...] }
  ]
}
```

### Proposed Output
```json
{
  "courseName": "Introduction to Statistics",
  "estimatedDuration": {
    "totalHours": 20,
    "weeksAtPace": 4,
    "hoursPerWeek": 5
  },
  "difficulty": "intermediate",
  "prerequisites": {
    "required": ["basic-algebra", "percentages"],
    "included": true,
    "reason": "Student indicated gaps in algebra"
  },
  "skipList": ["what-is-statistics", "types-of-data"],
  "chapters": [
    {
      "number": 0,
      "title": "Prerequisites Review",
      "isPrerequisite": true,
      "topics": [...]
    },
    {
      "number": 1,
      "title": "Measures of Central Tendency",
      "bloomLevel": "understand",
      "topics": [
        {
          "name": "Mean",
          "estimatedMinutes": 30,
          "bloomLevel": "apply",
          "prerequisites": ["basic-arithmetic"],
          "assessmentType": "calculation"
        }
      ]
    }
  ],
  "learningPath": {
    "type": "linear",
    "checkpoints": [
      { "afterChapter": 2, "type": "quiz" },
      { "afterChapter": 4, "type": "project" }
    ]
  },
  "personalization": {
    "exampleContext": "work",
    "goal": "analyze sales data",
    "deadline": "2025-05-01"
  }
}
```

---

## Chosen Approach: Assume & Adapt

Instead of asking about prerequisites upfront, we:
1. **Assume** prerequisites are fulfilled
2. **Detect** gaps during learning (when student struggles)
3. **Adapt** curriculum by inserting prerequisite modules

This reduces onboarding friction and learns from actual behavior.

---

## Implementation Plan

### Step 1: Gap Detection in Tutor

The tutor needs to recognize when a student is struggling due to missing prerequisites, not just topic difficulty.

**Detection signals:**
- Student fails same concept multiple times
- Student asks "what is X?" where X is a prerequisite concept
- Student's answers show fundamental misunderstanding (not just errors)

**Tutor output:**
```
<!-- PREREQUISITE_GAP: {"concept": "percentages", "evidence": "student doesn't understand ratio notation", "severity": "blocking"} -->
```

**Files to modify:**
- `src/lib/agents/tutor.ts` - Add gap detection to system prompt
- `src/lib/agents/teaching-planner.ts` - Add gap detection phase

### Step 2: Gap Storage

Store detected gaps in the database.

**New table or field:**
```sql
-- Option A: New table
CREATE TABLE prerequisite_gaps (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  course_id TEXT REFERENCES courses(id),
  concept TEXT NOT NULL,
  evidence TEXT,
  severity TEXT, -- 'blocking' | 'slowing' | 'minor'
  detected_at TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Option B: Add to existing student progress
-- Add gaps_detected JSON field to student_topic_status
```

**Files to modify:**
- `src/lib/db/schema.ts` - Add gap tracking
- `src/app/api/chat/route.ts` - Parse and store gap tags

### Step 3: Curriculum Regeneration

When a blocking gap is detected, offer to regenerate curriculum.

**Flow:**
```
1. Tutor detects gap: "You seem unfamiliar with percentages"
2. Tutor offers: "Want me to add a quick percentages refresher to your course?"
3. User accepts
4. System calls curriculum regeneration API
5. New prerequisite chapter inserted at current position
6. User continues with prerequisite module
7. Returns to original topic
```

**Files to modify:**
- `src/app/api/courses/[id]/add-prerequisite/route.ts` - New endpoint
- `src/lib/curriculum-generator.ts` - Add `generatePrerequisiteModule()` function

### Step 4: Seamless Insertion

Insert prerequisite without disrupting progress.

**Approach:**
- Don't regenerate entire curriculum
- Generate ONLY the prerequisite module
- Insert as "Chapter 0.5" or "Interlude: Percentages Review"
- Mark student's current position, return after completion

**Database changes:**
- Add `inserted_at` timestamp to chapters (to handle dynamic insertion)
- Add `is_prerequisite` flag to chapters
- Add `return_to_topic_id` field for navigation after prerequisite

---

## Simplified MVP

For fastest implementation, start with:

1. **Detection only** - Tutor flags gaps in chat, we log them
2. **Manual review** - We see gaps in admin dashboard
3. **No auto-regeneration yet** - Just data collection

Then iterate based on what gaps we actually see.

---

## Open Questions

1. **Gap detection accuracy:**
   - How reliably can AI distinguish "doesn't know prerequisite" from "made a mistake"?
   - Need multiple signals before flagging?

2. **User consent:**
   - Auto-insert prerequisite or ask first?
   - What if user says "I know this, just made an error"?

3. **Prerequisite scope:**
   - How deep to go? (percentages → fractions → basic arithmetic?)
   - Set a limit on prerequisite depth?

---

## References

- [Diagnostic Assessments - Carnegie Mellon](https://www.cmu.edu/teaching/designteach/teach/priorknowledge.html)
- [Educational Knowledge Graphs with Prerequisites](https://jedm.educationaldatamining.org/index.php/JEDM/article/view/737)
- [Zone of Proximal Development - Simply Psychology](https://www.simplypsychology.org/zone-of-proximal-development.html)
- [Bloom's Taxonomy - University of Arkansas](https://tips.uark.edu/using-blooms-taxonomy/)
- [Adaptive Learning Impact Study - ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2405844024156617)
- [Knowledge Graphs in Education - SmythOS](https://smythos.com/managers/education/knowledge-graphs-in-education/)
- [Scaffolding and ZPD - NWEA](https://www.nwea.org/blog/2025/7-ways-to-use-zpd-and-scaffolding-to-challenge-and-support-students/)
