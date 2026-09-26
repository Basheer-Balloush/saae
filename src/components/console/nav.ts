import {
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Globe,
  Mail,
  CalendarCheck,
  FileText,
  GraduationCap,
  Handshake,
  Home,
  Inbox,
  LayoutDashboard,
  Link2,
  Newspaper,
  Settings,
  Smartphone,
  Sparkles,
  UserCircle,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { CountKey } from "./useConsoleCounts";

export type ConsoleSystem = "home" | "cms" | "lms" | "ams" | "instructor";

export type NavItem = {
  to: string;
  ar: string;
  en: string;
  icon: LucideIcon;
  /** Badge: one count, or the sum of several. */
  count?: CountKey | CountKey[];
  /** Active only on this exact path (index pages). */
  exact?: boolean;
  /** Extra paths that also mark the item active. */
  also?: RegExp;
};

export type NavGroup = { ar?: string; en?: string; items: NavItem[] };

export const LMS_ADMIN = "/learning-management-system/admin";
export const LMS_INSTRUCTOR = "/learning-management-system/instructor";

const HOME_ITEM: NavItem = {
  to: "/admin",
  ar: "الرئيسية",
  en: "Admin home",
  icon: Home,
  exact: true,
};

export const SYSTEM_ENTRY: Record<
  "cms" | "lms" | "ams",
  { to: string; ar: string; en: string; icon: LucideIcon }
> = {
  cms: { to: "/admin/website", ar: "الموقع", en: "Website", icon: Globe },
  lms: { to: LMS_ADMIN, ar: "التعلّم", en: "Learning", icon: GraduationCap },
  ams: { to: "/admin/attendance", ar: "الحضور", en: "Attendance", icon: CalendarCheck },
};

export const LMS_ATTENTION: CountKey[] = [
  "coursesToReview",
  "enrollmentRequests",
  "reviewsToModerate",
  "trainerApplications",
  "internshipApplications",
];
export const CMS_ATTENTION: CountKey[] = ["newMessages", "chatFeedback", "newLeads"];

export const NAV: Record<ConsoleSystem, NavGroup[]> = {
  home: [
    {
      items: [
        { ...HOME_ITEM, icon: LayoutDashboard },
        {
          to: "/admin/website",
          ar: "إدارة الموقع",
          en: "Website",
          icon: Globe,
          count: CMS_ATTENTION,
        },
        {
          to: LMS_ADMIN,
          ar: "منصّة التعلّم",
          en: "Learning platform",
          icon: GraduationCap,
          count: LMS_ATTENTION,
        },
        { to: "/admin/attendance", ar: "نظام الحضور", en: "Attendance", icon: CalendarCheck },
      ],
    },
  ],
  cms: [
    {
      items: [
        HOME_ITEM,
        { to: "/admin/website", ar: "نظرة عامة", en: "Overview", icon: BarChart3, exact: true },
      ],
    },
    {
      ar: "الوارد",
      en: "Inbox",
      items: [
        {
          to: "/admin/messages",
          ar: "رسائل التواصل",
          en: "Messages",
          icon: Mail,
          count: "newMessages",
        },
        {
          to: "/admin/leads",
          ar: "العملاء المحتملون",
          en: "Leads",
          icon: UsersRound,
          count: "newLeads",
          also: /^\/admin\/crm\/(leads|contacts)/,
        },
      ],
    },
    {
      ar: "المحتوى",
      en: "Content",
      items: [
        { to: "/admin/news", ar: "الأخبار", en: "News", icon: Newspaper },
        { to: "/admin/members", ar: "الفريق", en: "Team", icon: Users },
        { to: "/admin/partners", ar: "الشركاء", en: "Partners", icon: Handshake },
      ],
    },
    {
      ar: "التفاعل",
      en: "Engagement",
      items: [
        {
          to: "/admin/forms",
          ar: "النماذج",
          en: "Forms",
          icon: FileText,
          also: /^\/admin\/crm\/forms/,
        },
        {
          to: "/admin/crm/registration-links",
          ar: "روابط التسجيل",
          en: "Sign-up links",
          icon: Link2,
        },
        { to: "/admin/initiative", ar: "مبادرة المليون", en: "Initiative", icon: Sparkles },
        {
          to: "/admin/chatbot",
          ar: "المساعد الذكي",
          en: "Chatbot",
          icon: Bot,
          count: "chatFeedback",
          also: /^\/admin\/crm\/feedback/,
        },
      ],
    },
  ],
  lms: [
    {
      items: [
        HOME_ITEM,
        { to: LMS_ADMIN, ar: "نظرة عامة", en: "Overview", icon: BarChart3, exact: true },
        {
          to: `${LMS_ADMIN}/requests`,
          ar: "الطلبات",
          en: "Requests",
          icon: Inbox,
          count: LMS_ATTENTION,
          also: /^\/learning-management-system\/admin\/(enrollment-requests|reviews|trainer-applications)/,
        },
      ],
    },
    {
      ar: "التدريس",
      en: "Teaching",
      items: [
        {
          to: `${LMS_ADMIN}/courses`,
          ar: "الدورات",
          en: "Courses",
          icon: BookOpen,
          also: /^\/learning-management-system\/instructor\/(courses|assignments|quiz-results)\//,
        },
        {
          to: `${LMS_ADMIN}/people`,
          ar: "الأشخاص",
          en: "People",
          icon: Users,
          also: /^\/learning-management-system\/admin\/users/,
        },
        { to: `${LMS_ADMIN}/internships`, ar: "فرص التدريب", en: "Internships", icon: Briefcase },
      ],
    },
    {
      ar: "الإعداد",
      en: "Setup",
      items: [{ to: `${LMS_ADMIN}/settings`, ar: "الإعدادات", en: "Settings", icon: Settings }],
    },
  ],
  ams: [
    { items: [HOME_ITEM] },
    {
      ar: "الحضور",
      en: "Attendance",
      items: [
        {
          to: "/admin/attendance",
          ar: "دورات الحضور",
          en: "Attendance courses",
          icon: CalendarCheck,
        },
        {
          to: "/attendance-management-system",
          ar: "تطبيق الهاتف",
          en: "Phone app",
          icon: Smartphone,
        },
      ],
    },
  ],
  instructor: [
    {
      items: [
        {
          to: LMS_INSTRUCTOR,
          ar: "دوراتي",
          en: "My courses",
          icon: BookOpen,
          exact: true,
          also: /^\/learning-management-system\/instructor\/(courses|assignments|quiz-results)\//,
        },
        {
          to: "/attendance-management-system",
          ar: "الحضور",
          en: "Attendance",
          icon: CalendarCheck,
        },
        { to: `${LMS_INSTRUCTOR}/profile`, ar: "ملفي الشخصي", en: "My profile", icon: UserCircle },
      ],
    },
  ],
};

export function systemForPath(pathname: string, isAdmin: boolean): ConsoleSystem {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/admin") return "home";
  if (p.startsWith("/admin/attendance")) return "ams";
  if (p.startsWith("/admin")) return "cms";
  if (p.startsWith(LMS_ADMIN)) return "lms";
  if (p.startsWith(LMS_INSTRUCTOR)) return isAdmin ? "lms" : "instructor";
  return "home";
}

export function isNavActive(item: NavItem, pathname: string) {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (item.also?.test(p)) return true;
  if (item.exact) return p === item.to;
  return p === item.to || p.startsWith(`${item.to}/`);
}
