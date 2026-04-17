# Evidence-Based Teaching Pedagogy Implementation Plan

## Research Summary

Based on comprehensive research into effective teaching methodologies, this plan integrates:

### 1. Gradual Release of Responsibility (GRR) - "I Do, We Do, You Do"
**Source:** [Old Dominion University](https://www.odu.edu/facultydevelopment/teaching-toolkit/gradual-release-responsibility-framework)

The model shifts cognitive load from teacher to student through three phases:
- **"I Do" (Focused Instruction)**: Teacher demonstrates with think-alouds
- **"We Do" (Guided Instruction)**: Teacher and student work together
- **"You Do" (Independent Learning)**: Student works independently

### 2. Cognitive Load Theory (CLT)
**Source:** [NSW Department of Education](https://education.nsw.gov.au/content/dam/main-education/about-us/educational-data/cese/2017-cognitive-load-theory-practice-guide.pdf)

Load Reduction Instruction (LRI) Framework:
1. Reduce difficulty during initial stages
2. Provide instructional support and scaffolding
3. Provide ample time for structured practice
4. Provide instructional feedback-feedforward
5. Independent practice and guided autonomy

### 3. Mastery Learning
**Source:** [Research.com](https://research.com/education/what-is-mastery-learning)

Key principles:
- Students must demonstrate mastery before advancing
- Regular formative assessments inform instruction
- Corrective instruction addresses learning gaps
- Reassessment gives second chance for success
- 90% effectiveness in 279 studies with 22,373+ students

### 4. Zone of Proximal Development (ZPD)
**Source:** [Cogn-IQ](https://www.cogn-iq.org/learn/theory/vygotsky-zone-proximal-development/)

AI as "More Knowledgeable Other":
- Personalization of learning
- Instant feedback
- Data-driven reflection and goal setting
- Tasks just beyond current ability with support

### 5. Bloom's Taxonomy (Updated for AI)
**Source:** [Medium - UX of EdTech](https://medium.com/ux-of-edtech/using-blooms-taxonomy-to-design-an-ai-learning-assistant-46f10ff58d68)

Cognitive levels for AI tutoring:
1. **Remember** - Define terms, recall facts
2. **Understand** - Explain concepts, summarize
3. **Apply** - Use knowledge in new situations
4. **Analyze** - Break down, compare, identify patterns
5. **Evaluate** - Judge, critique, justify decisions
6. **Create** - Design, construct, propose solutions

---

## Implementation Plan

### Phase 1: Pedagogical Framework Restructure

#### 1.1 Teaching Flow: "Explain → Demonstrate → Practice → Verify"

Replace current ad-hoc questioning with structured pedagogy:

```
Message 1: EXPLAIN (Theory - "I Do")
├── What is the concept?
├── Why does it matter?
├── When is it used?
└── NO questions yet

Message 2: DEMONSTRATE (Worked Example - "I Do" continued)
├── Walk through a complete example step-by-step
├── Show the calculation/reasoning
├── Highlight key decision points
└── Optionally ask "Does this make sense?" (comprehension check)

Message 3: GUIDED PRACTICE ("We Do")
├── Give a similar problem
├── Provide hints/scaffolding as needed
├── If they struggle, provide partial solution
└── Build confidence before independence

Message 4: INDEPENDENT PRACTICE ("You Do")
├── Give a problem WITHOUT hints
├── Must involve COMPUTATION or APPLICATION
├── Real-world context preferred
└── This is where objectives are verified

Message 5+: VERIFICATION & PROGRESSION
├── If correct → Mark objective passed, move on
├── If incorrect → Provide corrective feedback
├── Reassess with different problem
└── Never pass without demonstrated mastery
```

#### 1.2 Question Quality Matrix

Replace trivial yes/no questions with Bloom's-aligned questions:

| Level | BAD (Never Ask) | GOOD (Always Ask) |
|-------|-----------------|-------------------|
| Remember | "Is this statistics?" | "What is the formula for standard deviation?" |
| Understand | "Does that make sense?" | "In your own words, why do we divide by n-1?" |
| Apply | "Is 5 > 3?" | "Calculate the mean of [12, 15, 18, 21]" |
| Analyze | "Is A different from B?" | "Why does this dataset have more variance than that one?" |
| Evaluate | "Is this good?" | "Given p=0.04 and α=0.05, should we reject H₀? Why?" |
| Create | N/A | "Design a study to test if caffeine affects reaction time" |

#### 1.3 Objective Verification Rules

Current problem: Students can say "next" and pass without learning.

New rules:
1. **THEORY phase** → No objective progress possible
2. **EXAMPLE phase** → No objective progress possible
3. **GUIDED practice** → Can mark "attempted"
4. **INDEPENDENT practice** → Only here can "passed" be assigned
5. **Correct answer required** → Not "I understand" or "makes sense"
6. **Skip requests** → Give quick practice problem first

```
Student: "skip" / "next" / "I already know this"
Tutor: "Quick check: [relevant practice problem]"
If correct → Pass, move on
If wrong → "Let me fill in a gap..." [teach it]
```

---

### Phase 2: Prompt Engineering Updates

#### 2.1 System Prompt Structure

```typescript
// src/lib/agents/tutor.ts

const TEACHING_FLOW = `
## TEACHING METHODOLOGY: Gradual Release of Responsibility

You follow a research-backed pedagogical framework. NEVER deviate from this flow.

### Phase 1: EXPLAIN (Focused Instruction)
- Introduce the concept in 2-4 sentences
- Explain WHAT it is and WHY it matters
- Use analogies when helpful
- DO NOT ask questions yet

### Phase 2: DEMONSTRATE (Worked Example)
- Show a COMPLETE worked example
- Write out EVERY step of the calculation
- Use real numbers and concrete scenarios
- Narrate your thinking ("First I... then I...")

### Phase 3: GUIDED PRACTICE (Collaborative)
- Present a SIMILAR problem
- Offer scaffolding: "Hint: Start by..."
- If they struggle, work through it together
- Celebrate partial progress

### Phase 4: INDEPENDENT PRACTICE (Verification)
- Present a problem WITHOUT hints
- Must require COMPUTATION or APPLICATION
- Use realistic contexts (business, health, sports)
- THIS is where objectives can be marked PASSED

### Phase 5: FEEDBACK & PROGRESSION
- Correct answer → Mark passed, briefly reinforce, move on
- Incorrect answer → Identify the error, correct gently, give new problem
- Never move on without demonstrated competence
`;

const QUESTION_RULES = `
## QUESTION QUALITY STANDARDS

### NEVER ASK:
- Yes/no questions ("Is this an example of X?")
- Rhetorical questions ("Isn't that interesting?")
- Comprehension-only ("Does that make sense?")
- Leading questions ("So we reject H₀, right?")

### ALWAYS ASK:
- Calculation questions ("What is the mean of [data]?")
- Application questions ("A store has sales [data]. What's the average?")
- Decision questions ("p=0.03, α=0.05. Do we reject? Why?")
- Interpretation questions ("The CI is [48, 56]. What does this tell us about μ=50?")

### QUESTION FORMULA:
[Context] + [Data/Values] + [Specific Task] + [Expected Output Type]

Example: "A coffee shop tracked daily customers: [45, 52, 38, 65, 55].
Calculate the sample mean and standard deviation."
`;

const SKIP_HANDLING = `
## HANDLING SKIP REQUESTS

When student says "next", "skip", "move on", "I know this":

1. If you haven't given a practice problem yet:
   "Quick check: [relevant practice problem]"

2. If they failed a practice problem:
   "One more try: [easier version of problem]"

3. If they claim prior knowledge:
   "Great, this will be fast then. [immediate practice problem]"
   If correct → Mark passed, accelerate pace
   If wrong → "Let me fill in a gap here..." [teach it]

NEVER mark an objective as passed without a correct practice response.
`;

const OBJECTIVE_TAGGING = `
## OBJECTIVE COMPLETION

Use this tag ONLY after a CORRECT practice answer:
<!-- OBJECTIVE_UPDATE: {"objective_id": "xxx", "status": "passed"} -->

DO NOT use this tag:
- After explaining a concept
- After showing an example
- After student says "I understand"
- After student agrees with you
- After student restates your explanation
`;
```

---

### Phase 3: UI/UX Changes

#### 3.1 Move Progress to Left Sidebar (User Request)

Currently: ObjectiveProgress appears ABOVE messages
New: ObjectiveProgress appears in LEFT sidebar below curriculum

```tsx
// src/app/study/chat-sidebar.tsx - Add progress section

<div className="p-4 border-t">
  {activeTopicProgress && (
    <ObjectiveProgress
      topicName={activeTopicProgress.topicName}
      objectives={activeTopicProgress.objectives}
      compact={true}  // New prop for sidebar layout
      onStartQuiz={...}
    />
  )}
</div>
```

#### 3.2 Objective Progress Component Updates

```tsx
// src/app/study/objective-progress.tsx

interface ObjectiveProgressProps {
  topicName: string;
  objectives: ObjectiveData[];
  compact?: boolean;  // For sidebar vs header layout
  onStartQuiz?: () => void;
}
```

---

### Phase 4: Files to Modify

1. **`src/lib/agents/tutor.ts`**
   - Complete rewrite of `buildSystemPrompt()`
   - Implement GRR teaching flow
   - Add question quality rules
   - Add skip handling
   - Stricter objective tagging

2. **`src/app/study/study-chat.tsx`**
   - Remove ObjectiveProgress from header
   - Pass activeTopicProgress to sidebar

3. **`src/app/study/chat-sidebar.tsx`**
   - Add ObjectiveProgress component
   - Compact layout for sidebar

4. **`src/app/study/objective-progress.tsx`**
   - Add `compact` prop
   - Adjust layout for sidebar

---

### Phase 5: Testing Scenarios

After implementation, verify:

1. **Theory → Example → Practice flow**
   - Start a topic, confirm tutor explains first
   - Confirm worked example follows
   - Confirm practice problem comes after

2. **No trivial questions**
   - Monitor for yes/no questions
   - All questions should require computation/application

3. **Skip protection**
   - Say "next" without answering → Should get practice problem
   - Say "I know this" → Should get immediate verification

4. **Objective integrity**
   - Cannot pass by just saying "I understand"
   - Must provide correct practice answer
   - Incorrect answers keep objective as "attempted"

5. **UI verification**
   - Progress shows in left sidebar
   - Not duplicated on top of chat

---

## Implementation Order

1. ✅ Research complete
2. [ ] Update tutor.ts with new pedagogy prompt
3. [ ] Update chat-sidebar.tsx to show progress
4. [ ] Update study-chat.tsx to remove top progress
5. [ ] Update objective-progress.tsx for compact mode
6. [ ] Test all scenarios
7. [ ] User acceptance testing

---

## Sources

- [Gradual Release of Responsibility - ODU](https://www.odu.edu/facultydevelopment/teaching-toolkit/gradual-release-responsibility-framework)
- [Cognitive Load Theory - NSW Education](https://education.nsw.gov.au/content/dam/main-education/about-us/educational-data/cese/2017-cognitive-load-theory-practice-guide.pdf)
- [Mastery Learning - Research.com](https://research.com/education/what-is-mastery-learning)
- [Zone of Proximal Development - Cogn-IQ](https://www.cogn-iq.org/learn/theory/vygotsky-zone-proximal-development/)
- [Bloom's Taxonomy for AI - Medium](https://medium.com/ux-of-edtech/using-blooms-taxonomy-to-design-an-ai-learning-assistant-46f10ff58d68)
- [Formative Assessment Guide 2026 - Wooclap](https://www.wooclap.com/en/blog/formative-assessment/)
