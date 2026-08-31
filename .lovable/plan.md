# Enable quizzes for in-person (حضوري) courses

## What I found

- Delivery mode lives on `lms_courses.delivery_mode` (enum: `online`, `onsite`). Helper `src/lib/lms-course-destination.ts` treats anything not `online` as onsite, so a future hybrid mode needs no new special case.
- The online-only restriction exists in exactly **two frontend places** — there is no database or permission gate:
  - Instructor/admin course editor hides the quiz builder for onsite courses.
  - The student quiz page redirects onsite students away to the course page.
- Quiz builder: `src/components/lms/QuizBuilder.tsx` — one quiz per course, multiple-choice questions, pass score, max attempts, cooldown, automatic versioning so past attempts stay graded on the version taken.
- Student quiz flow and grading run through database functions that check enrolment and instructor rights only, never delivery mode.
- Certificates: the evaluation function branches by mode — onsite requires full attendance, online requires all lessons plus a quiz pass.

## Decisions confirmed

- No attendance or date gating on quiz access — enrolled students can take it any time.
- Certificates for onsite courses stay attendance-only; the quiz is a score/assessment record, not a certificate condition. Online logic untouched.
- No new question types or quiz settings; onsite gets exactly the existing toolset.

## What will change

1. **Instructor/admin course editor** — show the Quizzes section for every course regardless of delivery mode, with the same layout and behaviour.
2. **Student quiz page** — remove the onsite redirect so enrolled onsite students can open and submit the quiz.
3. **Onsite course page (student view)** — for enrolled students, add a "Final test" card linking to the quiz, shown only when the course actually has a quiz. This is the missing entry point, since onsite students never see the online lesson player.
4. **Quiz results / gradebook** — add a delivery-mode badge (أونلاين / حضوري) to the results header so trainers can tell in-person cohorts apart at a glance.
5. **Bilingual strings** — every new label added to the existing LMS translation file in Arabic and English, using existing components and tokens.

## Technical notes

- Files: `src/routes/learning-management-system.instructor.courses.$id.tsx`, `src/routes/learning-management-system.student.quiz.$courseId.tsx`, `src/routes/learning-management-system.courses.$id.tsx`, `src/routes/learning-management-system.instructor.quiz-results.$courseId.tsx`, `src/lib/lms-i18n.ts`.
- No migration required: quiz tables, policies and the submit/grade functions are already delivery-mode agnostic.
- Switching a course's mode after a quiz exists keeps the quiz attached and working, because nothing keys off the mode.
- Non-regression: online quiz behaviour, data, and UI are unchanged; `delivery_mode` keeps its role in scheduling, catalogue filters and certificate rules.

## Assumptions flagged

- The "available only after session end" toggle is dropped, per your "no gating" answer. Say the word and I'll add it as an optional per-quiz setting later.
- The related validation case ("publishing a quiz before session dates are set") no longer applies without date gating.
