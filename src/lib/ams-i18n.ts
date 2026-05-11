import type { Lang } from "@/lib/translations";

export const amsT: Record<Lang, {
  title: string;
  subtitle: string;
  email: string;
  password: string;
  signIn: string;
  signingIn: string;
  signOut: string;
  invalidEmail: string;
  passwordMin: string;
  signedIn: string;
  authFailed: string;
  noAccess: string;
  install: string;
  installed: string;
  installing: string;
  installNotAvailable: string;
  iosInstallTitle: string;
  iosInstallSteps: string;
  dashboard: string;
  welcome: string;
  noSections: string;
  loading: string;
  copyright: string;
  courses: string;
  addCourse: string;
  courseNameAr: string;
  courseNameEn: string;
  noCourses: string;
  registrants: string;
  addRegistrant: string;
  fullName: string;
  emailField: string;
  phone: string;
  paymentStatus: string;
  paid: string;
  unpaid: string;
  partial: string;
  waived: string;
  noRegistrants: string;
  sessions: string;
  addSession: string;
  sessionTitle: string;
  sessionDate: string;
  noSessions: string;
  attendance: string;
  present: string;
  save: string;
  cancel: string;
  create: string;
  add: string;
  delete: string;
  confirmDelete: string;
  saved: string;
  required: string;
  back: string;
  open: string;
}> = {
  en: {
    title: "Attendance Management",
    subtitle: "Sign in with your attendance account.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    signOut: "Sign out",
    invalidEmail: "Invalid email",
    passwordMin: "At least 6 characters",
    signedIn: "Signed in",
    authFailed: "Authentication failed",
    noAccess: "This account does not have access to the Attendance system.",
    install: "Install app",
    installed: "App already installed",
    installing: "Installing…",
    installNotAvailable: "Install not available on this browser yet — open this page in Chrome/Edge or use your browser menu \"Add to Home Screen\".",
    iosInstallTitle: "Install on iPhone / iPad",
    iosInstallSteps: "Tap the Share button, then \"Add to Home Screen\".",
    dashboard: "Dashboard",
    welcome: "Welcome to the Attendance Management System. Sections will appear here soon.",
    noSections: "No sections configured yet.",
    loading: "Loading…",
    copyright: "© {year} Syrian Association for AI & Entrepreneurship. All rights reserved.",
    courses: "Courses",
    addCourse: "Add course",
    courseNameAr: "Course name (Arabic)",
    courseNameEn: "Course name (English)",
    noCourses: "No courses yet. Add your first course.",
    registrants: "Registrants",
    addRegistrant: "Add registrant",
    fullName: "Full name",
    emailField: "Email",
    phone: "Phone",
    paymentStatus: "Payment status",
    paid: "Paid",
    unpaid: "Unpaid",
    partial: "Partial",
    waived: "Waived",
    noRegistrants: "No registrants yet.",
    sessions: "Sessions",
    addSession: "Add session",
    sessionTitle: "Session title",
    sessionDate: "Session date",
    noSessions: "No sessions yet.",
    attendance: "Attendance",
    present: "Present",
    save: "Save",
    cancel: "Cancel",
    create: "Create",
    add: "Add",
    delete: "Delete",
    confirmDelete: "Are you sure?",
    saved: "Saved",
    required: "This field is required",
    back: "Back",
    open: "Open",
  },
  ar: {
    title: "نظام إدارة الحضور",
    subtitle: "سجّل الدخول باستخدام حساب الحضور الخاص بك.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    signingIn: "جاري تسجيل الدخول…",
    signOut: "تسجيل الخروج",
    invalidEmail: "بريد إلكتروني غير صالح",
    passwordMin: "٦ أحرف على الأقل",
    signedIn: "تم تسجيل الدخول",
    authFailed: "فشل تسجيل الدخول",
    noAccess: "هذا الحساب لا يملك صلاحية الوصول إلى نظام الحضور.",
    install: "تثبيت التطبيق",
    installed: "التطبيق مثبّت مسبقًا",
    installing: "جاري التثبيت…",
    installNotAvailable: "التثبيت غير متاح في هذا المتصفح — افتح الصفحة في Chrome/Edge أو استخدم خيار \"إضافة إلى الشاشة الرئيسية\" من قائمة المتصفح.",
    iosInstallTitle: "التثبيت على iPhone / iPad",
    iosInstallSteps: "اضغط زر المشاركة ثم \"إضافة إلى الشاشة الرئيسية\".",
    dashboard: "لوحة التحكم",
    welcome: "مرحبًا بك في نظام إدارة الحضور. ستظهر الأقسام هنا قريبًا.",
    noSections: "لا توجد أقسام مُهيّأة بعد.",
    loading: "جارٍ التحميل…",
    copyright: "© {year} الجمعية السورية للذكاء الاصطناعي وريادة الأعمال. جميع الحقوق محفوظة.",
    courses: "الدورات",
    addCourse: "إضافة دورة",
    courseNameAr: "اسم الدورة (عربي)",
    courseNameEn: "اسم الدورة (إنجليزي)",
    noCourses: "لا توجد دورات بعد. أضف أول دورة.",
    registrants: "المسجّلون",
    addRegistrant: "إضافة مسجَّل",
    fullName: "الاسم الثلاثي",
    emailField: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    paymentStatus: "حالة الدفع",
    paid: "مدفوع",
    unpaid: "غير مدفوع",
    partial: "جزئي",
    waived: "معفى",
    noRegistrants: "لا يوجد مسجّلون بعد.",
    sessions: "الجلسات",
    addSession: "إضافة جلسة",
    sessionTitle: "عنوان الجلسة",
    sessionDate: "تاريخ الجلسة",
    noSessions: "لا توجد جلسات بعد.",
    attendance: "الحضور",
    present: "حاضر",
    save: "حفظ",
    cancel: "إلغاء",
    create: "إنشاء",
    add: "إضافة",
    delete: "حذف",
    confirmDelete: "هل أنت متأكد؟",
    saved: "تم الحفظ",
    required: "هذا الحقل مطلوب",
    back: "رجوع",
    open: "فتح",
  },
};
