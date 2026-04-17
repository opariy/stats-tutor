@AGENTS.md

## UI Changes - MANDATORY
Before asking the user to verify any UI changes:
1. Kill all node/next processes: `pkill -9 -f "next" 2>/dev/null`
2. Delete .next cache: `rm -rf .next`
3. Restart dev server: `npm run dev`
4. Wait for server to be ready
5. THEN ask user to refresh (preferably in incognito)

Never ask "refresh to see changes" without doing the above first.

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Don't guess, verify

When asked to list something (skills, files, options, features, etc.):
1. Check the actual source (tool definitions, codebase, docs) - don't type from memory
2. If unsure the list is complete, say so and verify before answering
3. Never give partial lists when complete information is available

## TypeScript errors

When running typecheck and errors appear:
1. Fix errors in files you touched - don't just report them
2. For pre-existing errors in other files, ask "want me to fix these too?" or fix if they're blocking
3. Never claim "all checks pass" when there are errors - be precise: "no errors in files I modified"

## Efficient edits

Avoid wasteful token usage when editing:
1. Read the file structure BEFORE editing - place new code in the correct location the first time
2. When moving code, do it in ONE edit if the old and new locations are close enough to fit in a single old_string
3. If moving code requires two edits (locations too far apart), state "moving this in two steps" - don't pretend they're unrelated changes
4. Never remove code then re-add the same code elsewhere as two separate "fixes"
