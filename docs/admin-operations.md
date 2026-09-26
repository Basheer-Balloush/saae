# SAAE admin console: plan and full list of operations

Branch `admin-redesign`, built from `upstream/main`.

**What changes:** every admin screen, menu and flow is redesigned from scratch
around the jobs people do. Nothing is copied from the old pages.
**What stays:** the database. Every page calls the same tables, RPCs and server
functions as before, so no data, rule or permission changes. Nothing here needs a
migration.

**Look:** the console sits on the same ground as the public site (the deep
teal grade, soft glow, grain and tree), with glass cards, the brand teal,
asparagus and orange, and Cairo. Dialogs and side panels use the same palette.
The sign-in page and the attendance phone app use it too.

**Fewer sub-tabs:** screens that used to hide work behind tabs are now one page
(Initiative, Internship editor, Application, Contact) or use big cards with
counts that tell you where the work is (Chatbot, Internship pipeline).

Use the checkboxes to confirm each operation works in the new console.

---

## 1. Roles

| Role | Database roles today | Sees |
|---|---|---|
| **Admin** | `admin`, `lms_admin` | Admin home and all three systems |
| **Instructor** | `lms_instructor` | Instructor workspace: own courses, their students, attendance, profile |
| **Student** | `lms_student`, `user` | The learning site (not part of this rebuild) |

`attendance_user` and `attendance_admin` exist in the database but no code uses them.
Merging the database roles into three needs a migration; it is left for a separate decision.

---

## 2. The structure

```
/admin  ADMIN HOME
        ├─ "Needs you": every waiting item, across all three systems
        └─ three cards → WEBSITE · LEARNING · ATTENDANCE
```

One sign-in (`/admin/login`), one design, and one sidebar. The sidebar has a
switcher for the three systems. Every system has its own **overview dashboard**
and a short menu, grouped by job.

### WEBSITE: what the public site shows, and what comes in from it
| Menu | Page | Jobs |
|---|---|---|
| Overview | `/admin/website` | New messages, new leads, latest form responses, latest news, shortcuts |
| **Inbox** | | |
| Messages | `/admin/messages` | **New.** Contact-form messages (they had no screen): read, filter, mark as read, replied or archived; reply by email or WhatsApp |
| Leads | `/admin/leads` | People and companies from the chatbot and forms: pipeline status, notes, conversation, export, add |
| **Content** | | |
| News | `/admin/news` | Articles: write in AR/EN, cover, photos, videos, category, date, show on homepage |
| Team | `/admin/members` | Board and executive members, their order and photos |
| Partners | `/admin/partners` | Logos (light and dark), size, order, show on homepage |
| **Engagement** | | |
| Forms | `/admin/forms` | Build forms, publish/hide/archive, read and export responses, surveys |
| Sign-up links | `/admin/crm/registration-links` | Event sign-up links: create, copy, stop, see sign-ups |
| Initiative | `/admin/initiative` | One screen: seat flow (funded → given → free → waiting), donations beside the waiting list; "Record a donation" and "Settings" open side panels |
| Chatbot | `/admin/chatbot` | Four cards with counts (feedback, visitor profiles, conversations, knowledge); conversations read side by side with the list |

### LEARNING: courses, people, decisions
| Menu | Page | Jobs |
|---|---|---|
| Overview | `/learning-management-system/admin` | Numbers, what's waiting, most enrolled courses, latest payments |
| **Requests** | `/…/admin/requests` | **Every approve/reject in one place**, as tabs: courses to publish · enrollments · instructor accreditation · reviews · internship applications |
| Courses | `/…/admin/courses` | All courses; create; open one to manage **everything** about it (below) |
| People | `/…/admin/people` | Instructors (approve, edit, revoke), students (progress, export), team & roles |
| Internships | `/…/admin/internships` | Cards per opportunity; a 3-field "New" dialog; one editor page (one language at a time, numbered sections, status panel); applications as a pipeline (New → Under review → Shortlisted → Interview → Accepted); external sign-up link |
| Settings | `/…/admin/settings` | Categories, system health and maintenance tools |

### ATTENDANCE: sessions and who came
| Menu | Page | Jobs |
|---|---|---|
| Courses | `/admin/attendance` | Cards per course (people, sessions, last session); filter platform / stand-alone; open one for the register |
| Phone app | `/attendance-management-system` | The same screens; on a phone the register shows one session at a time with big buttons |

There is now **one register** (people down, sessions across, one click per
cell, "all present", totals, add person, add session, Excel). The admin
console, the phone app and the course page's Attendance tab all use it.

LMS courses that are delivered in person take attendance inside the course
itself (the course's Attendance tab). Nothing needs linking by hand.

### INSTRUCTOR WORKSPACE
**My courses** (create, manage) · **Attendance** · **My profile** (with a live
preview of what students see). Assignments, grading and quiz results are the
course's **Grading** tab.

---

## 3. The course page (admin and instructor)

A short "New course" dialog (the four required fields, plus the instructor for
admins), then one page with seven tabs, a status card and a readiness checklist:

| Tab | Contents | Saving |
|---|---|---|
| Details | Names and descriptions AR/EN, cover, categories, level, price and discount, more options (custom link, co-instructors), delete | Save bar |
| Schedule | Online / In person (two clear choices), dates, days, times, hours, location AR/EN | Save bar; the delivery choice saves at once after a confirm |
| Content | Sections → lessons; each lesson opens in a side panel (titles, video upload, text AR/EN, attachments, free preview); quizzes; assignments | At once |
| Students | Enrollment open/closed, deadline, capacity; requests (admins decide, with email or WhatsApp); enrolled students and progress; registration form | Save bar / at once |
| Attendance | In-person courses only: the shared register; admin can stop tracking | At once |
| Grading | **New.** "To grade" count; assignments (create, brief file, delete) with each student's hand-in, grade and feedback inline; quiz results with pass rate | At once |
| Completion | How completion works; certificate preview and on/off | Save bar |

Header: the one next step for the role. Instructors: Submit for review. Admins:
Approve & publish, Reject with a reason (a real dialog, not the browser's
`prompt()`), Publish now, or Unpublish.

---

## 4. Every operation

✅ = checked in the new console.

### 4.1 Website
| ✓ | Operation | Where now |
|---|---|---|
| [ ] | Contact messages: list, filter by status, search, open, mark read/replied/archived, reply by email/WhatsApp | Messages (**new**) |
| [ ] | Leads (individual/company): list, search, filter status, export, add, open (details, status, notes add/edit, conversation) | Leads |
| [ ] | News: list, search, show on home on/off, delete | News |
| [ ] | News: create/edit: title, excerpt, content (AR/EN), category, categories, date, cover, photos, videos, show on home | News → editor |
| [ ] | Team: list by group, add/edit (names, position, bio AR/EN, photo, board/executive, order), delete | Team |
| [ ] | Partners: list, add/edit (name, logo, light logo, size, order, show on home), delete, show on home on/off | Partners |
| [ ] | Forms: list, search, create, edit fields, preview, publish/hide/archive/restore, delete | Forms |
| [ ] | Form responses: per form, search, date range, view, export | Forms → form |
| [ ] | Surveys (initiative, event): list, search, open one answer in full, export | Forms → Built-in surveys |
| [ ] | Sign-up links: create, copy, activate/stop, see sign-ups | Sign-up links |
| [ ] | Initiative: stats, settings (price, rate, goal, course, page text AR/EN), donations (list, filter, confirm, record with logo, delete), waiting list (filter, export) | Initiative |
| [ ] | Chatbot: stats, conversations (read, delete), visitor profiles (read, open their chat, delete), knowledge (add text, delete) | Chatbot |
| [ ] | Chat feedback: list, filter, mark handled / new, reply by email, open the chat, delete | Chatbot → Feedback card |
| [ ] | Contact record (from a lead): stage, details edit, notes add/delete, full history incl. form answers | Leads → contact |
| [ ] | Website overview: what came in, latest answers, latest news, where everything lives | Website → Overview |

### 4.2 Learning: admin
| ✓ | Operation | Where now |
|---|---|---|
| [ ] | Waiting items and platform numbers | Overview |
| [ ] | Publish or reject (with reason) a course sent for review | Requests → Courses, the course page, the Courses list |
| [ ] | Enrollment requests: approve + email / approve + WhatsApp / reject, notes, form answers, warnings (deadline, full), resend WhatsApp, confirmation messages, Excel export | Requests → Enrollments, course → Students |
| [ ] | Instructor accreditation (the only way in): list, open, answers, files, stage changes, scoring, evaluators, **Approve & activate** (gives the role, emails them), history | Requests → Instructor accreditation |
| [ ] | Signed up as instructor but no form yet: copy / email the form link, remove, or "activate anyway" (a confirmed shortcut that skips accreditation) | Requests → Instructor accreditation |
| [ ] | Reviews: approve, reject, delete | Requests → Reviews |
| [ ] | Courses: list, search, filter (status, delivery), create for an instructor, open | Courses |
| [ ] | Everything inside a course (section 3), delete a course | Course page |
| [ ] | Instructors: edit profile, revoke | People → Instructors |
| [ ] | Students: list, search, progress, export | People → Students |
| [ ] | Roles: give a role by email, change to student | People → Team & roles |
| [ ] | Internships: list, create, edit (incl. questions, cover), publish/hide/close/archive/restore, delete | Internships |
| [ ] | Internship applicants: pipeline counts, filter by stage / owner, search, export, open (answers, CV preview, courses, certificates, notes, owner, move stage, reject or move back with a reason, history) | Internships → Applications |
| [ ] | Internship sign-up link: create, copy, on/off, sign-ups, export, delete | Internships → opportunity |
| [ ] | Categories: add, delete | Settings |
| [ ] | System health + maintenance tools | Settings |

### 4.3 Learning: instructor
| ✓ | Operation | Where now |
|---|---|---|
| [ ] | My courses (owned and co-taught), filter, search, numbers | My courses |
| [ ] | Create a course, edit it, submit for review | My courses → course |
| [ ] | See requests + form answers, enrolled students | Course → Students |
| [ ] | Build quizzes, registration form | Course → Content / Students |
| [ ] | Assignments, grading, quiz results | Course → Grading |
| [ ] | Take attendance | Course → Attendance, or the phone app |
| [ ] | Edit my profile | My profile |

### 4.4 Attendance
| ✓ | Operation | Where now |
|---|---|---|
| [ ] | Courses: list, filter, search, add stand-alone (AR/EN), delete | Attendance |
| [ ] | People: add (payment status; LMS-linked courses create the account and email it), reuse earlier details, view, remove | Attendance → course |
| [ ] | Sessions: add, delete (LMS-linked courses mirror the course sections) | Attendance → course |
| [ ] | Mark attendance, "all present" (completes the enrollment and emails the certificate when earned) | Attendance → course, phone app, LMS course page |
| [ ] | Export the register to Excel | Attendance → course |

---

## 5. Gaps found and fixed
| Gap in the old admin | Fix |
|---|---|
| Contact-form messages were stored but never shown | Website → Messages |
| Three entrances, three logins, three looks | One console |
| Decisions scattered over 6 pages | Learning → Requests |
| Attendance: a link page, auto-link on publish, delivery mode, and a separate app | Delivery mode only; register inside the course |
| One 1,750-line course page with mixed save rules | Six tabs, one save bar, readiness checklist |
| Course rejection used the browser's `prompt()`, and an empty reason was accepted | A proper dialog; a reason is required |
| Maintenance tools mixed into daily work | Settings → System health |
| "Chatbot" twice in the menu; LMS students inside the CMS | Chatbot once (with feedback); students under Learning → People |
| Assignments and quiz results were separate pages outside the course | The course's Grading tab |
| Three copies of the attendance screen (AMS app, course tab, console) | One shared register |
| Internship editor showed every field twice (AR and EN side by side) | One language at a time, missing text marked |
| Rejecting an applicant or moving them back needed a hidden "reason" field | A reason dialog opens when it's needed |
| Coupons page (switched off, read-only) | Removed from the console; the records stay in the database |
| Signed-in non-admins saw a silent sign-in form | The sign-in page says the account isn't an admin |
| Two separate ways to become an instructor (a one-click approval and the 4-stage accreditation) | Accreditation only; the one-click approval is gone from Requests and People, kept only as a confirmed "activate anyway" shortcut |

## 6. Still open (need your decision)
1. Merge the database roles into three (a migration).
2. Are there attendance courses that are not LMS courses? If not, Attendance can live entirely inside Learning.
3. ~~Two instructor approvals~~ decided: accreditation is the only path.
4. Only admins can approve enrollments (the database enforces it). Should instructors be allowed to?
