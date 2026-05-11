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
  },
};
