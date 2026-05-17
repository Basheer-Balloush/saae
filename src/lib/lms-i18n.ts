import type { Lang } from "@/lib/translations";

export const lmsT: Record<Lang, {
  brand: string;
  tagline: string;
  // nav
  navHome: string;
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
  forgotPassword: string;
  forgotTitle: string;
  forgotSubtitle: string;
  sendResetLink: string;
  resetLinkSent: string;
  resetTitle: string;
  newPassword: string;
  updatePassword: string;
  passwordUpdated: string;
  menu: string;
}> = {
  ar: {
    brand: "منصة التعلم",
    tagline: "تعلّم بدون حدود",
    navHome: "الرئيسية",
    navCatalog: "الكورسات",
    navMyCourses: "كورساتي",
    navInstructor: "لوحة المدرس",
    navAdmin: "لوحة الأدمن",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    signOut: "تسجيل الخروج",
    heroTitle: "اكتشف آلاف الكورسات وطوّر مهاراتك",
    heroSubtitle: "منصة تعليمية متكاملة تجمع أفضل المدرّسين والمحتوى التعليمي بمكان واحد",
    heroBrowse: "تصفّح الكورسات",
    heroBecomeInstructor: "كن مدرّساً",
    statStudents: "طالب",
    statCourses: "كورس",
    statInstructors: "مدرّس",
    featuredCourses: "الكورسات المميّزة",
    categories: "الفئات",
    viewAll: "عرض الكل",
    catalogTitle: "جميع الكورسات",
    search: "بحث...",
    filterCategory: "الفئة",
    filterLevel: "المستوى",
    filterPrice: "السعر",
    all: "الكل",
    free: "مجاني",
    paid: "مدفوع",
    beginner: "مبتدئ",
    intermediate: "متوسط",
    advanced: "متقدم",
    noCourses: "ما في كورسات حالياً",
    byInstructor: "بواسطة",
    students: "طالب",
    enroll: "سجّل في الكورس",
    enrolling: "جاري التسجيل...",
    enrolled: "أنت مسجّل",
    goToCourse: "ابدأ التعلّم",
    syllabus: "الخطّة الدراسية",
    aboutCourse: "عن الكورس",
    requirements: "المتطلبات",
    lessons: "الدروس",
    myCourses: "كورساتي",
    noEnrollments: "ما سجّلت بأي كورس بعد",
    progress: "التقدّم",
    selectLesson: "اختر درس للبدء",
    markCompleted: "أنهيت الدرس",
    completed: "مكتمل",
    attachments: "المرفقات",
    qa: "الأسئلة والأجوبة",
    qaComingSoon: "ميزة الأسئلة قريباً",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    fullName: "الاسم الكامل",
    iAmStudent: "طالب",
    iAmInstructor: "مدرّس (يحتاج موافقة)",
    signInTitle: "أهلاً بعودتك",
    signInSubtitle: "سجّل دخول لمتابعة تعلّمك",
    signUpTitle: "ابدأ رحلتك التعليمية",
    signUpSubtitle: "أنشئ حسابك مجاناً",
    needAccount: "ما عندك حساب؟ سجّل الآن",
    haveAccount: "عندك حساب؟ سجّل دخول",
    authFailed: "فشل تسجيل الدخول",
    signedIn: "تم تسجيل الدخول",
    signedUp: "تم إنشاء الحساب بنجاح",
    invalidEmail: "بريد إلكتروني غير صالح",
    passwordMin: "كلمة المرور 6 أحرف على الأقل",
    welcomeBack: "أهلاً بعودتك",
    continueLesson: "تابع من حيث توقّفت",
    enrolledCourses: "الكورسات المسجّل بها",
    avgProgress: "متوسّط التقدّم",
    loading: "جاري التحميل...",
    copyright: "جميع الحقوق محفوظة",
    authRequired: "يجب تسجيل الدخول أولاً",
    enrollmentSuccess: "تم التسجيل بالكورس بنجاح",
    comingSoon: "قريباً",
    finalTest: "الاختبار النهائي",
    startTest: "ابدأ الاختبار",
    submitTest: "إرسال الإجابات",
    passScore: "علامة النجاح",
    yourScore: "علامتك",
    testPassed: "نجحت في الاختبار",
    testFailed: "لم تنجح، حاول مرة أخرى",
    retakeTest: "أعد الاختبار",
    noTestYet: "ما في اختبار بعد",
    certificate: "الشهادة",
    certificateIssued: "تم إصدار شهادتك",
    viewCertificate: "عرض الشهادة",
    certificateOf: "شهادة إتمام",
    hasCompleted: "أكمل بنجاح كورس",
    serial: "الرقم التسلسلي",
    issuedOn: "تاريخ الإصدار",
    printCertificate: "طباعة",
    question: "سؤال",
    addQuestion: "أضف سؤال",
    correctAnswer: "الإجابة الصحيحة",
    mustCompleteFirst: "أكمل كل الدروس أولاً للحصول على الشهادة",
    reviews: "التقييمات",
    writeReview: "أضف تقييمك",
    yourRating: "تقييمك",
    yourComment: "تعليقك",
    submitReview: "إرسال التقييم",
    noReviews: "ما في تقييمات بعد",
    verifyCertificate: "تحقّق من شهادة",
    verifyTitle: "التحقّق من الشهادات",
    verifySubtitle: "أدخل الرقم التسلسلي للتأكّد من صحة الشهادة",
    enterSerial: "الرقم التسلسلي",
    verify: "تحقّق",
    verifyValid: "الشهادة صحيحة",
    verifyInvalid: "لم نجد شهادة بهذا الرقم",
    forgotPassword: "نسيت كلمة المرور؟",
    forgotTitle: "استعادة كلمة المرور",
    forgotSubtitle: "أدخل بريدك وسنرسل رابط لإعادة التعيين",
    sendResetLink: "أرسل الرابط",
    resetLinkSent: "تم إرسال الرابط، تفقّد بريدك",
    resetTitle: "تعيين كلمة مرور جديدة",
    newPassword: "كلمة المرور الجديدة",
    updatePassword: "تحديث كلمة المرور",
    passwordUpdated: "تم تحديث كلمة المرور",
    menu: "القائمة",
  },
  en: {
    brand: "Learning Platform",
    tagline: "Learn without limits",
    navHome: "Home",
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
    enroll: "Enroll now",
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
    signedUp: "Account created successfully",
    invalidEmail: "Invalid email",
    passwordMin: "Password must be at least 6 characters",
    welcomeBack: "Welcome back",
    continueLesson: "Continue where you left off",
    enrolledCourses: "Enrolled courses",
    avgProgress: "Average progress",
    loading: "Loading...",
    copyright: "All rights reserved",
    authRequired: "You must sign in first",
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
  },
};
