import type { Bi } from "./texpo-shared";

/* The Texpo questions: the same 10 for every player, easy to hard, about
   everyday AI and generative AI tools, for anyone with a phone. Server only:
   `answer` must never reach the browser bundle. Options are listed with the
   right one first; each player sees them in a shuffled order. */

export type BankQuestion = {
  difficulty: "easy" | "medium" | "hard";
  text: Bi;
  options: { ar: [string, string, string, string]; en: [string, string, string, string] };
  /** Index of the right option in `options`. */
  answer: number;
  hint: Bi;
  explanation: Bi;
};

export const TEXPO_QUESTIONS: BankQuestion[] = [
  {
    difficulty: "easy",
    text: {
      ar: "ماذا تستطيع أدوات الذكاء الاصطناعي التوليدي مثل ChatGPT أو Gemini أن تفعل؟",
      en: "What can generative AI tools like ChatGPT or Gemini do?",
    },
    options: {
      ar: [
        "تكتب النصوص وتلخّصها وتترجمها",
        "تبحث عن المواقع فقط مثل غوغل",
        "تجيب عن أسئلة «نعم أو لا» فقط",
        "تصحّح الأخطاء الإملائية فقط",
      ],
      en: [
        "Write, summarise and translate text",
        "Only search for websites, like Google",
        "Only answer yes-or-no questions",
        "Only fix spelling mistakes",
      ],
    },
    answer: 0,
    hint: {
      ar: "فكّر فيما يمكن أن تطلب منه كتابته لك.",
      en: "Think of what you could ask it to write for you.",
    },
    explanation: {
      ar: "الأدوات التوليدية تُنشئ نصاً جديداً: تكتب وتلخّص وتترجم خلال ثوانٍ.",
      en: "Generative tools create new text: they write, summarise and translate in seconds.",
    },
  },
  {
    difficulty: "easy",
    text: { ar: "أيّ مما يلي يستخدم الذكاء الاصطناعي؟", en: "Which of these uses AI?" },
    options: {
      ar: [
        "يوتيوب حين يقترح مقاطع قد تعجبك",
        "منبّه الهاتف حين يرنّ الساعة 7 صباحاً",
        "آلة حاسبة تجمع رقمين",
        "مؤقّت يعدّ تنازلياً",
      ],
      en: [
        "YouTube suggesting videos you might like",
        "A phone alarm ringing at 7 am",
        "A calculator adding two numbers",
        "A timer counting down",
      ],
    },
    answer: 0,
    hint: { ar: "أيّها يتعلّم ما تحبّه؟", en: "Which one learns what you like?" },
    explanation: {
      ar: "الاقتراحات تتعلّم مما تشاهده، أما المنبّه والآلة الحاسبة والمؤقّت فتتبع قواعد ثابتة.",
      en: "Suggestions learn from what you watch. An alarm, a calculator and a timer just follow fixed rules.",
    },
  },
  {
    difficulty: "easy",
    text: {
      ar: "ما الذي يجب ألّا تشاركه أبداً مع روبوت محادثة؟",
      en: "Which of these should you never share with an AI chatbot?",
    },
    options: {
      ar: [
        "كلمات المرور وبيانات بطاقتك المصرفية",
        "وصفة طعام تريد تحسينها",
        "فقرة تريد ترجمتها",
        "موضوعاً تريد شرحه",
      ],
      en: [
        "Your passwords and bank card details",
        "A recipe you want to improve",
        "A paragraph you want translated",
        "A topic you want explained",
      ],
    },
    answer: 0,
    hint: { ar: "ما الذي لا تخبر به غريباً أبداً؟", en: "What would you never tell a stranger?" },
    explanation: {
      ar: "لا تضع كلمات المرور أو بيانات البطاقة في روبوت محادثة أبداً. أما الوصفات والنصوص والأسئلة فلا بأس بها.",
      en: "Never paste passwords or card details into a chatbot. Recipes, texts and questions are fine.",
    },
  },
  {
    difficulty: "medium",
    text: {
      ar: "يذكر روبوت المحادثة معلومة بثقة، لكنها مختلَقة. ماذا يسمّى ذلك؟",
      en: "A chatbot states something confidently, but it is made up. What is this called?",
    },
    options: {
      ar: ["هلوسة", "خلل في هاتفك", "بطء في الاتصال", "تحديث للبرنامج"],
      en: ["A hallucination", "A bug in your phone", "A slow connection", "A software update"],
    },
    answer: 0,
    hint: {
      ar: "الكلمة نفسها تُقال لمن يرى أشياء غير موجودة.",
      en: "The same word is used for seeing things that aren't there.",
    },
    explanation: {
      ar: "قد «يهلوس» روبوت المحادثة فيختلق معلومات تبدو صحيحة. تحقّق من كل معلومة مهمة.",
      en: 'Chatbots can "hallucinate": they invent facts that sound right. Check anything important.',
    },
  },
  {
    difficulty: "medium",
    text: {
      ar: "أيّ طلب يعطيك غالباً أفضل إجابة من روبوت المحادثة؟",
      en: "Which request usually gets the best answer from a chatbot?",
    },
    options: {
      ar: [
        "«اكتب دعوة من 3 أسطر لحفل تخرّج أختي يوم الجمعة الساعة 6 مساءً»",
        "«اكتب دعوة جيدة جداً من فضلك، الأمر مهم»",
        "«اكتب لي شيئاً جميلاً لمناسبة هذا الأسبوع»",
        "«دعوة تخرّج. اجعلها جميلة.»",
      ],
      en: [
        '"Write a 3-line invite to my sister\'s graduation on Friday at 6 pm"',
        '"Write a really good invitation, please, it\'s important"',
        '"Write me something nice for an event this week"',
        '"Graduation invitation. Make it good."',
      ],
    },
    answer: 0,
    hint: {
      ar: "كلما أعطيته تفاصيل أكثر، كانت الإجابة أفضل.",
      en: "The more details you give, the better.",
    },
    explanation: {
      ar: "اذكر لمن الطلب وماذا تريد وبأي شكل. اللطف والاستعجال لا يضيفان معلومات.",
      en: "Say who it's for, what you want and the format. Politeness and urgency add no information.",
    },
  },
  {
    difficulty: "medium",
    text: {
      ar: "ما أفضل طريقة لتحصل على الصورة التي تريدها من أداة توليد الصور؟",
      en: "What's the best way to get the picture you want from an AI image tool?",
    },
    options: {
      ar: [
        "أصف الموضوع والأسلوب والألوان والمكان",
        "أستخدم أقل عدد ممكن من الكلمات",
        "أكتب «جودة عالية 4K» فقط",
        "أكرّر الطلب نفسه عدة مرات",
      ],
      en: [
        "Describe the subject, style, colours and setting",
        "Use as few words as possible",
        'Write "high quality, 4K" and nothing else',
        "Repeat the same request several times",
      ],
    },
    answer: 0,
    hint: {
      ar: "تخيّل أنك تصف الصورة لرسّام.",
      en: "Imagine describing the picture to a painter.",
    },
    explanation: {
      ar: "أدوات الصور ترسم ما تصفه: الموضوع والأسلوب والألوان والمكان.",
      en: "Image tools draw what you describe: subject, style, colours and setting.",
    },
  },
  {
    difficulty: "medium",
    text: { ar: "ما «التزييف العميق» (ديب فيك)؟", en: 'What is a "deepfake"?' },
    options: {
      ar: [
        "فيديو أو صورة أو صوت مزيّف لشخص حقيقي، مصنوع بالذكاء الاصطناعي",
        "صورة عُدّلت بفلاتر التجميل",
        "حساب وهمي يرسل رسائل مزعجة",
        "فيديو قُصّ وأُعيد مونتاجه",
      ],
      en: [
        "An AI-made fake video, photo or voice of a real person",
        "A photo touched up with beauty filters",
        "A fake account that sends spam messages",
        "A video that was cut and re-edited",
      ],
    },
    answer: 0,
    hint: {
      ar: "يبدو حقيقياً، لكن الشخص لم يفعله أو يقله قط.",
      en: "It looks real, but the person never did or said it.",
    },
    explanation: {
      ar: "التزييف العميق يقلّد وجه شخص حقيقي أو صوته بالذكاء الاصطناعي. انتبه لما تصدّقه وتشاركه.",
      en: "Deepfakes use AI to fake a real person's face or voice. Be careful what you believe and share.",
    },
  },
  {
    difficulty: "hard",
    text: {
      ar: "تصلك رسالة صوتية من قريب يطلب مالاً بشكل عاجل، وصوته يشبه صوته تماماً. ما التصرّف الأذكى؟",
      en: "A voice message from a relative urgently asks for money, and it sounds exactly like them. What's the smartest move?",
    },
    options: {
      ar: [
        "أتصل به على رقمه المعتاد لأتأكد",
        "أرسل المال، فالصوت صوته بالتأكيد",
        "أردّ برسالة صوتية وأسأله سؤالاً",
        "أرسل مبلغاً صغيراً أولاً للتجربة",
      ],
      en: [
        "Call them back on their usual number to check",
        "Send it: the voice is definitely theirs",
        "Reply with a voice note asking them a question",
        "Send a small amount first as a test",
      ],
    },
    answer: 0,
    hint: {
      ar: "صار تقليد الأصوات ممكناً. كيف تتأكد بطريقة أخرى؟",
      en: "Voices can be copied now. How else can you be sure?",
    },
    explanation: {
      ar: "يستطيع الذكاء الاصطناعي تقليد صوت من ثوانٍ قليلة من التسجيل. اتصل على رقم تعرفه مسبقاً.",
      en: "AI can copy a voice from a few seconds of audio. Call back on a number you already know.",
    },
  },
  {
    difficulty: "hard",
    text: {
      ar: "من دون البحث على الإنترنت، لماذا قد يخطئ روبوت المحادثة في أخبار الأمس؟",
      en: "Without searching the web, why might a chatbot get yesterday's news wrong?",
    },
    options: {
      ar: [
        "يعرف فقط ما كان في البيانات التي تدرّب عليها",
        "يحدّث نفسه مرة واحدة في الأسبوع فقط",
        "غير مسموح له بالحديث عن الأخبار",
        "يقرأ موقعاً إخبارياً واحداً فقط",
      ],
      en: [
        "It only knows what was in its training data",
        "It updates itself only once a week",
        "It isn't allowed to discuss the news",
        "It reads only one news website",
      ],
    },
    answer: 0,
    hint: { ar: "من أين تعلّم كل ما يعرفه؟", en: "Where did it learn everything it knows?" },
    explanation: {
      ar: "النموذج يعرف فقط بيانات تدريبه، وللأخبار الحديثة عليه أن يبحث على الإنترنت.",
      en: "A model knows only its training data. For recent news it has to search the web.",
    },
  },
  {
    difficulty: "hard",
    text: {
      ar: "أيّ مما يلي علامة شائعة على أن الصورة ربما صُنعت بالذكاء الاصطناعي؟",
      en: "Which is a common clue that a picture may be AI-made?",
    },
    options: {
      ar: [
        "أيدٍ غريبة أو كتابة مشوّهة أو خلفية غير منطقية",
        "حجم الملف كبير",
        "لا تحمل علامة مائية",
        "نُشرت على مواقع التواصل",
      ],
      en: [
        "Odd hands, warped text or a strange background",
        "The file size is large",
        "It has no watermark",
        "It was shared on social media",
      ],
    },
    answer: 0,
    hint: {
      ar: "دقّق في التفاصيل التي ما زال الذكاء الاصطناعي يتعثّر في رسمها.",
      en: "Look closely at the details AI still struggles to draw.",
    },
    explanation: {
      ar: "الأيدي والكتابة والخلفيات أكثر ما تخطئ فيه صور الذكاء الاصطناعي. حجم الملف والعلامة المائية لا يثبتان شيئاً.",
      en: "Hands, writing and backgrounds are where AI images often slip. File size and watermarks prove nothing.",
    },
  },
];
