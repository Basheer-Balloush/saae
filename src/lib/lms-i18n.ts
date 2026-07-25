import type { Lang } from "@/lib/translations";

export const lmsT: Record<Lang, {
  brand: string;
  tagline: string;
  // nav
  navHome: string;
  navProfile: string;
  navCatalog: string;
  navMyCourses: string;
  navInstructor: string;
  navAdmin: string;
  signIn: string;
  signUp: string;
  signOut: string;
  // hero
  heroTitle: string;
  heroSubtitle: string;
  heroBrowse: string;
  heroBecomeInstructor: string;
  // stats
  statStudents: string;
  statCourses: string;
  statInstructors: string;
  // landing
  featuredCourses: string;
  categories: string;
  viewAll: string;
  // catalog
  catalogTitle: string;
  search: string;
  filterCategory: string;
  filterLevel: string;
  filterPrice: string;
  all: string;
  free: string;
  paid: string;
  beginner: string;
  intermediate: string;
  advanced: string;
  noCourses: string;
  // course card / details
  byInstructor: string;
  students: string;
  enroll: string;
  enrolling: string;
  enrolled: string;
  goToCourse: string;
  syllabus: string;
  aboutCourse: string;
  requirements: string;
  lessons: string;
  // player
  myCourses: string;
  noEnrollments: string;
  progress: string;
  selectLesson: string;
  markCompleted: string;
  completed: string;
  attachments: string;
  qa: string;
  qaComingSoon: string;
  // auth
  email: string;
  password: string;
  fullName: string;
  iAmStudent: string;
  iAmInstructor: string;
  signInTitle: string;
  signInSubtitle: string;
  signUpTitle: string;
  signUpSubtitle: string;
  needAccount: string;
  haveAccount: string;
  authFailed: string;
  signedIn: string;
  signedUp: string;
  invalidEmail: string;
  passwordMin: string;
  // student dashboard
  welcomeBack: string;
  continueLesson: string;
  enrolledCourses: string;
  avgProgress: string;
  // misc
  loading: string;
  copyright: string;
  authRequired: string;
  alreadyRequested: string;
  enrollmentSuccess: string;
  comingSoon: string;
  // quizzes & certificates
  finalTest: string;
  startTest: string;
  submitTest: string;
  passScore: string;
  yourScore: string;
  testPassed: string;
  testFailed: string;
  retakeTest: string;
  noTestYet: string;
  certificate: string;
  certificateIssued: string;
  viewCertificate: string;
  certificateOf: string;
  hasCompleted: string;
  serial: string;
  issuedOn: string;
  printCertificate: string;
  question: string;
  addQuestion: string;
  correctAnswer: string;
  mustCompleteFirst: string;
  reviews: string;
  writeReview: string;
  yourRating: string;
  yourComment: string;
  submitReview: string;
  noReviews: string;
  verifyCertificate: string;
  verifyTitle: string;
  verifySubtitle: string;
  enterSerial: string;
  verify: string;
  verifyValid: string;
  verifyInvalid: string;
  verifyError: string;
  verifyRetry: string;
  forgotPassword: string;
  forgotTitle: string;
  forgotSubtitle: string;
  sendResetLink: string;
  resetLinkSent: string;
  resetTitle: string;
  newPassword: string;
  updatePassword: string;
  passwordUpdated: string;
  passwordStrength: string;
  passwordWeak: string;
  passwordMedium: string;
  passwordStrong: string;
  menu: string;
  courseFinished: string;
}> = {
  ar: {
    brand: "منصّة التدريب والتعلّم",
    tagline: "تعلّمٌ بلا حدود",
    navHome: "الرئيسيّة",
    navProfile: "ملفّي",
    navCatalog: "الدورات",
    navMyCourses: "دوراتي",
    navInstructor: "لوحة المدرّب",
    navAdmin: "لوحة المشرف",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    signOut: "تسجيل الخروج",
    heroTitle: "اكتشف الدورات وطوّر مهاراتك",
    heroSubtitle: "منصّة تعليميّة متكاملة تجمع نخبة المدرّبين والمحتوى التعليميّ في مكانٍ واحد",
    heroBrowse: "تصفّح الدورات",
    heroBecomeInstructor: "كن مدرّباً",
    statStudents: "طالب",
    statCourses: "دورة",
    statInstructors: "مدرّب",
    featuredCourses: "الدورات المميّزة",
    categories: "الفئات",
    viewAll: "عرض الكل",
    catalogTitle: "جميع الدورات",
    search: "بحث...",
    filterCategory: "الفئة",
    filterLevel: "المستوى",
    filterPrice: "السعر",
    all: "الكل",
    free: "مجّاني",
    paid: "مدفوع",
    beginner: "مبتدئ",
    intermediate: "متوسّط",
    advanced: "متقدّم",
    noCourses: "لا توجد دورات حاليّاً",
    byInstructor: "بواسطة",
    students: "طالب",
    enroll: "تسجيل",
    enrolling: "جارٍ التسجيل...",
    enrolled: "أنت مسجَّل",
    goToCourse: "ابدأ التعلّم",
    syllabus: "الخطّة الدراسيّة",
    aboutCourse: "عن الدورة",
    requirements: "المتطلّبات",
    lessons: "الدروس",
    myCourses: "دوراتي",
    noEnrollments: "لم تسجّل في أيّ دورةٍ بعد",
    progress: "التقدّم",
    selectLesson: "اختر درساً للبدء",
    markCompleted: "إنهاء الدرس",
    completed: "مكتمل",
    attachments: "المرفقات",
    qa: "الأسئلة والأجوبة",
    qaComingSoon: "ميزة الأسئلة قريباً",
    email: "البريد الإلكترونيّ",
    password: "كلمة المرور",
    fullName: "الاسم الكامل",
    iAmStudent: "طالب",
    iAmInstructor: "مدرّب (يحتاج موافقة)",
    signInTitle: "مرحباً بعودتك",
    signInSubtitle: "سجّل الدخول لمتابعة تعلّمك",
    signUpTitle: "ابدأ رحلتك التعليميّة",
    signUpSubtitle: "أنشئ حسابك مجّاناً",
    needAccount: "ليس لديك حساب؟ سجّل الآن",
    haveAccount: "لديك حساب؟ سجّل الدخول",
    authFailed: "فشل تسجيل الدخول",
    signedIn: "تمّ تسجيل الدخول",
    signedUp: "أرسلنا لك إيميل تأكيد — راجع صندوق الوارد",
    invalidEmail: "بريد إلكترونيّ غير صالح",
    passwordMin: "يجب ألّا تقلّ كلمة المرور عن 6 أحرف",
    welcomeBack: "مرحباً بعودتك",
    continueLesson: "تابع من حيث توقّفت",
    enrolledCourses: "الدورات المسجَّل بها",
    avgProgress: "متوسّط التقدّم",
    loading: "جارٍ التحميل...",
    copyright: "جميع الحقوق محفوظة",
    authRequired: "يجب تسجيل الدخول أوّلاً",
    alreadyRequested: "لقد أرسلت طلباً سابقاً — قيد المراجعة من قبل الإدارة",
    enrollmentSuccess: "تمّ التسجيل في الدورة بنجاح",
    comingSoon: "قريباً",
    finalTest: "الاختبار النهائيّ",
    startTest: "ابدأ الاختبار",
    submitTest: "إرسال الإجابات",
    passScore: "درجة النجاح",
    yourScore: "درجتك",
    testPassed: "لقد نجحت في الاختبار",
    testFailed: "لم تنجح، حاول مرّةً أخرى",
    retakeTest: "أعد الاختبار",
    noTestYet: "لا يوجد اختبارٌ بعد",
    certificate: "الشهادة",
    certificateIssued: "تمّ إصدار شهادتك",
    viewCertificate: "عرض الشهادة",
    certificateOf: "شهادة إتمام",
    hasCompleted: "أتمّ بنجاح دورة",
    serial: "الرقم التسلسليّ",
    issuedOn: "تاريخ الإصدار",
    printCertificate: "طباعة",
    question: "سؤال",
    addQuestion: "أضف سؤالاً",
    correctAnswer: "الإجابة الصحيحة",
    mustCompleteFirst: "أكمل جميع الدروس أوّلاً للحصول على الشهادة",
    reviews: "التقييمات",
    writeReview: "أضف تقييمك",
    yourRating: "تقييمك",
    yourComment: "تعليقك",
    submitReview: "إرسال التقييم",
    noReviews: "لا توجد تقييماتٌ بعد",
    verifyCertificate: "التحقّق من شهادة",
    verifyTitle: "التحقّق من الشهادات",
    verifySubtitle: "أدخل الرقم التسلسليّ للتأكّد من صحّة الشهادة",
    enterSerial: "الرقم التسلسليّ",
    verify: "تحقّق",
    verifyValid: "الشهادة صحيحة",
    verifyInvalid: "لم نعثر على شهادةٍ بهذا الرقم",
    verifyError: "تعذّر إتمام عمليّة التحقّق. يرجى المحاولة مرّةً أخرى.",
    verifyRetry: "إعادة المحاولة",
    forgotPassword: "هل نسيت كلمة المرور؟",
    forgotTitle: "استعادة كلمة المرور",
    forgotSubtitle: "أدخل بريدك وسنرسل إليك رابطاً لإعادة التعيين",
    sendResetLink: "أرسل الرابط",
    resetLinkSent: "تمّ إرسال الرابط، يُرجى التحقّق من بريدك",
    resetTitle: "تعيين كلمة مرورٍ جديدة",
    newPassword: "كلمة المرور الجديدة",
    updatePassword: "تحديث كلمة المرور",
    passwordUpdated: "تمّ تحديث كلمة المرور",
    passwordStrength: "قوة كلمة المرور",
    passwordWeak: "ضعيفة",
    passwordMedium: "متوسطة",
    passwordStrong: "قوية",
    menu: "القائمة",
    courseFinished: "انتهت الدورة",
  },
  en: {
    brand: "Training and Learning Platform",
    tagline: "Learn without limits",
    navHome: "Home",
    navProfile: "My Profile",
    navCatalog: "Courses",
    navMyCourses: "My Courses",
    navInstructor: "Instructor",
    navAdmin: "Admin",
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    heroTitle: "Discover thousands of courses and grow your skills",
    heroSubtitle: "A complete learning platform bringing the best instructors and content together",
    heroBrowse: "Browse courses",
    heroBecomeInstructor: "Become an instructor",
    statStudents: "Students",
    statCourses: "Courses",
    statInstructors: "Instructors",
    featuredCourses: "Featured courses",
    categories: "Categories",
    viewAll: "View all",
    catalogTitle: "All courses",
    search: "Search...",
    filterCategory: "Category",
    filterLevel: "Level",
    filterPrice: "Price",
    all: "All",
    free: "Free",
    paid: "Paid",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    noCourses: "No courses yet",
    byInstructor: "By",
    students: "students",
    enroll: "Enroll",
    enrolling: "Enrolling...",
    enrolled: "Enrolled",
    goToCourse: "Start learning",
    syllabus: "Syllabus",
    aboutCourse: "About this course",
    requirements: "Requirements",
    lessons: "Lessons",
    myCourses: "My Courses",
    noEnrollments: "You haven't enrolled in any course yet",
    progress: "Progress",
    selectLesson: "Select a lesson to start",
    markCompleted: "Mark as completed",
    completed: "Completed",
    attachments: "Attachments",
    qa: "Q&A",
    qaComingSoon: "Q&A coming soon",
    email: "Email",
    password: "Password",
    fullName: "Full name",
    iAmStudent: "Student",
    iAmInstructor: "Instructor (needs approval)",
    signInTitle: "Welcome back",
    signInSubtitle: "Sign in to continue learning",
    signUpTitle: "Start your learning journey",
    signUpSubtitle: "Create your free account",
    needAccount: "Don't have an account? Sign up",
    haveAccount: "Already have an account? Sign in",
    authFailed: "Sign in failed",
    signedIn: "Signed in",
    signedUp: "Confirmation email sent — check your inbox",
    invalidEmail: "Invalid email",
    passwordMin: "Password must be at least 6 characters",
    welcomeBack: "Welcome back",
    continueLesson: "Continue where you left off",
    enrolledCourses: "Enrolled courses",
    avgProgress: "Average progress",
    loading: "Loading...‎",
    copyright: "All rights reserved",
    authRequired: "You must sign in first",
    alreadyRequested: "You have already submitted a request — it is under review",
    enrollmentSuccess: "Enrolled successfully",
    comingSoon: "Coming soon",
    finalTest: "Final test",
    startTest: "Start test",
    submitTest: "Submit answers",
    passScore: "Pass score",
    yourScore: "Your score",
    testPassed: "You passed!",
    testFailed: "Not passed, try again",
    retakeTest: "Retake test",
    noTestYet: "No test yet",
    certificate: "Certificate",
    certificateIssued: "Your certificate was issued",
    viewCertificate: "View certificate",
    certificateOf: "Certificate of Completion",
    hasCompleted: "has successfully completed",
    serial: "Serial",
    issuedOn: "Issued on",
    printCertificate: "Print",
    question: "Question",
    addQuestion: "Add question",
    correctAnswer: "Correct answer",
    mustCompleteFirst: "Complete all lessons first to earn the certificate",
    reviews: "Reviews",
    writeReview: "Write a review",
    yourRating: "Your rating",
    yourComment: "Your comment",
    submitReview: "Submit review",
    noReviews: "No reviews yet",
    verifyCertificate: "Verify a certificate",
    verifyTitle: "Certificate verification",
    verifySubtitle: "Enter the certificate serial to verify it is genuine",
    enterSerial: "Certificate serial",
    verify: "Verify",
    verifyValid: "Valid certificate",
    verifyInvalid: "No certificate found for that serial",
    verifyError: "We couldn't complete the verification. Please try again.",
    verifyRetry: "Try again",
    forgotPassword: "Forgot password?",
    forgotTitle: "Reset your password",
    forgotSubtitle: "Enter your email to receive a reset link",
    sendResetLink: "Send reset link",
    resetLinkSent: "Reset link sent — check your inbox",
    resetTitle: "Set a new password",
    newPassword: "New password",
    updatePassword: "Update password",
    passwordUpdated: "Password updated",
    passwordStrength: "Password strength",
    passwordWeak: "Weak",
    passwordMedium: "Medium",
    passwordStrong: "Strong",
    menu: "Menu",
    courseFinished: "Course finished",
  },
};
