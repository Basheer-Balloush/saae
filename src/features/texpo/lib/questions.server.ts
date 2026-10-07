import type { Bi } from "./texpo-shared";

export { LEGACY_QUESTIONS } from "./legacy-questions.server";

/* The Texpo question bank: 50 short questions about everyday AI and
   generative AI tools, for anyone with a phone, across many fields. Each
   play draws 7 of them (drawDeck in engine.ts): 3 easy, 2 medium, 2 hard,
   never two on the same topic. Server only: `answer` must never reach the
   browser bundle. Options are listed with the right one first; each player
   sees them in a shuffled order. Reviewed with the team on 2026-10-07. */

export type Difficulty = "easy" | "medium" | "hard";

export type BankQuestion = {
  /** Stable id (E01, M01, H01…), stored with each play: never reuse one. */
  id: string;
  difficulty: Difficulty;
  /** One game never asks two questions on the same topic. */
  topic: string;
  text: Bi;
  options: { ar: [string, string, string, string]; en: [string, string, string, string] };
  /** Index of the right option in `options`. */
  answer: number;
  hint: Bi;
  explanation: Bi;
};

type Pair = [ar: string, en: string];

function q(
  id: string,
  difficulty: Difficulty,
  topic: string,
  text: Pair,
  right: Pair,
  wrong: [Pair, Pair, Pair],
  hint: Pair,
  explanation: Pair,
): BankQuestion {
  const all = [right, ...wrong];
  return {
    id,
    difficulty,
    topic,
    text: { ar: text[0], en: text[1] },
    options: {
      ar: all.map((o) => o[0]) as BankQuestion["options"]["ar"],
      en: all.map((o) => o[1]) as BankQuestion["options"]["en"],
    },
    answer: 0,
    hint: { ar: hint[0], en: hint[1] },
    explanation: { ar: explanation[0], en: explanation[1] },
  };
}

export const TEXPO_BANK: BankQuestion[] = [
  /* ---------- easy: anyone can get these ---------- */
  q(
    "E01",
    "easy",
    "facts",
    ["ماذا يعني اختصار AI؟", "What does “AI” stand for?"],
    ["الذكاء الاصطناعي", "Artificial Intelligence"],
    [
      ["خدمة الإنترنت الآلية", "Automatic Internet Access"],
      ["آيفون من أبل", "Apple iPhone"],
      ["إنستغرام المتطوّر", "Advanced Instagram"],
    ],
    ["حرف I يعني الذكاء.", "The I stands for Intelligence."],
    [
      "AI اختصار Artificial Intelligence، أي الذكاء الاصطناعي: برامج تتعلّم وتفهم وتساعد.",
      "AI is short for Artificial Intelligence: software that learns, understands and helps.",
    ],
  ),
  q(
    "E02",
    "easy",
    "chat",
    [
      "تكتب سؤالاً في ChatGPT. من يكتب لك الجواب؟",
      "You type a question into ChatGPT. Who writes the answer?",
    ],
    ["الذكاء الاصطناعي نفسه", "The AI itself"],
    [
      ["موظّف في الشركة يردّ بسرعة", "A company employee, typing fast"],
      ["مستخدم آخر مثلك", "Another user like you"],
      ["غوغل ينسخه من موقع", "Google copies it from a website"],
    ],
    ["لا أحد يجلس خلف الشاشة ليردّ عليك.", "Nobody is sitting behind the screen."],
    [
      "يكتب ChatGPT الجواب بنفسه كلمة بعد كلمة خلال ثوانٍ، ولا يردّ عليك أي إنسان.",
      "ChatGPT writes the answer itself, word by word, in seconds. No person is typing.",
    ],
  ),
  q(
    "E03",
    "easy",
    "phone",
    [
      "لوحة المفاتيح في هاتفك تقترح كلمتك التالية. كيف؟",
      "Your phone keyboard suggests your next word. How?",
    ],
    ["تتوقّعها من طريقة كتابتك", "It predicts it from how you type"],
    [
      ["تقرأ أفكارك", "It reads your mind"],
      ["تختارها عشوائياً", "It picks one at random"],
      ["صديق يكتبها لك من مكان بعيد", "A friend types it in from far away"],
    ],
    ["كلما كتبت أكثر، صارت اقتراحاتها أدقّ.", "The more you type, the better its guesses get."],
    [
      "لوحة المفاتيح تتعلّم الكلمات التي تكتبها كثيراً وتتوقّع التالية: ذكاء اصطناعي صغير في جيبك.",
      "Your keyboard learns the words you use and predicts the next one: a little AI in your pocket.",
    ],
  ),
  q(
    "E04",
    "easy",
    "phone",
    [
      "يُفتح هاتفك حين يرى وجهك. كيف يعرفك؟",
      "Your phone unlocks when it sees your face. How does it know you?",
    ],
    ["ذكاء اصطناعي يميّز الوجوه", "AI that recognises faces"],
    [
      ["حارس صغير يسكن داخل الهاتف", "A tiny guard living inside the phone"],
      ["يشمّ رائحتك", "It smells you"],
      ["يسمع صوت خطواتك", "It hears your footsteps"],
    ],
    ["هاتفك يحفظ ملامحك، لا رائحتك.", "Your phone remembers your features."],
    [
      "يحفظ الهاتف ملامح وجهك ويقارنها في كل مرة: هذا هو التعرّف على الوجوه بالذكاء الاصطناعي.",
      "The phone learns your features and compares them each time: that’s AI face recognition.",
    ],
  ),
  q(
    "E05",
    "easy",
    "travel",
    [
      "تطبيق الخرائط يقترح طريقاً أسرع لتتجنّب الزحمة. من يساعدك؟",
      "Your maps app suggests a faster road around the traffic. Who’s helping?",
    ],
    ["ذكاء اصطناعي يقرأ حركة السير", "AI reading the traffic"],
    [
      ["شرطي مرور صغير يجلس داخل التطبيق", "A traffic officer sitting inside the app"],
      ["راديو السيارة", "The car radio"],
      ["صديق يراسلك", "A friend texting you"],
    ],
    [
      "التطبيق يرى أين تتباطأ السيارات الآن.",
      "The app can see where cars are slowing down right now.",
    ],
    [
      "يجمع التطبيق سرعة آلاف الهواتف على الطريق ويتوقّع لك الطريق الأسرع.",
      "The app pools the speed of thousands of phones on the road and predicts the fastest way.",
    ],
  ),
  q(
    "E06",
    "easy",
    "lang",
    [
      "تريد قراءة قائمة طعام مكتوبة باليابانية. ماذا تستخدم؟",
      "You want to read a menu written in Japanese. What do you use?",
    ],
    ["كاميرا تطبيق الترجمة", "A translation app’s camera"],
    [
      ["الآلة الحاسبة", "The calculator"],
      ["البوصلة", "The compass"],
      ["تطبيق الطقس على الهاتف", "The weather app on your phone"],
    ],
    ["وجّه الكاميرا إلى الكلمات.", "Point your camera at the words."],
    [
      "تطبيقات الترجمة تقرأ النص بالكاميرا وتعرض الترجمة فوقه مباشرة.",
      "Translation apps read the text through the camera and show the translation right on top of it.",
    ],
  ),
  q(
    "E07",
    "easy",
    "safety",
    ["ما الذي لا تشاركه أبداً مع روبوت المحادثة؟", "What should you never share with a chatbot?"],
    ["كلمة المرور", "Your password"],
    [
      ["وصفة الكبّة", "A kibbeh recipe"],
      ["سؤالاً عن الطقس", "A question about the weather"],
      ["قصيدة كتبتها", "A poem you wrote"],
    ],
    ["ما الذي لا تخبر به غريباً أبداً؟", "What would you never tell a stranger?"],
    [
      "لا تكتب كلمات المرور أو أرقام البطاقات في روبوت محادثة. الوصفات والأسئلة لا بأس بها.",
      "Never type passwords or card numbers into a chatbot. Recipes and questions are fine.",
    ],
  ),
  q(
    "E08",
    "easy",
    "images",
    [
      "هل يرسم الذكاء الاصطناعي صورة من كلمات مثل «قطّة تشرب الشاي»؟",
      "Can AI make a picture from words like “a cat drinking tea”?",
    ],
    ["نعم، خلال ثوانٍ", "Yes, in seconds"],
    [
      ["لا، الرسم للبشر فقط", "No, only people can draw"],
      ["فقط إن كانت القطّة حقيقية", "Only if the cat is real"],
      ["فقط على الورق", "Only on paper"],
    ],
    ["أدوات الصور تحوّل الوصف إلى صورة.", "Image tools turn a description into a picture."],
    [
      "أدوات توليد الصور تحوّل وصفك إلى صورة جديدة خلال ثوانٍ.",
      "Image tools turn your description into a brand-new picture in seconds.",
    ],
  ),
  q(
    "E09",
    "easy",
    "apps",
    ["من يختار المقاطع التي يقترحها عليك يوتيوب؟", "Who picks the videos YouTube suggests to you?"],
    ["ذكاء اصطناعي يتعلّم مما تشاهده", "AI that learns from what you watch"],
    [
      ["موظّف في يوتيوب لكل مستخدم في العالم", "A YouTube employee for every single user"],
      ["جيرانك", "Your neighbours"],
      ["الحظ وحده", "Pure luck"],
    ],
    ["كلما شاهدت أكثر، صارت الاقتراحات أدقّ.", "The more you watch, the better the picks."],
    [
      "يتعلّم يوتيوب مما تشاهده وتحبّه، ويقترح عليك ما يشبهه.",
      "YouTube learns from what you watch and like, then suggests more of the same.",
    ],
  ),
  q(
    "E10",
    "easy",
    "school",
    [
      "معلّم يريد اختباراً قصيراً عن درس اليوم. بماذا يساعده الذكاء الاصطناعي؟",
      "A teacher wants a short quiz on today’s lesson. How can AI help?",
    ],
    ["يكتب الأسئلة في دقيقة", "It writes the questions in a minute"],
    [
      ["يُحضر الطلاب إلى الصف بنفسه", "It walks the students to class for you"],
      ["يمسح السبّورة", "It wipes the board"],
      ["يصحّح سلوك الطلاب", "It fixes the students’ behaviour"],
    ],
    ["أيّ هذه كتابة؟", "Which of these is writing?"],
    [
      "يكتب الذكاء الاصطناعي أسئلة وخيارات عن أي درس خلال دقيقة، ثم يراجعها المعلّم.",
      "AI can draft quiz questions on any lesson in a minute; the teacher then checks them.",
    ],
  ),
  q(
    "E11",
    "easy",
    "school",
    [
      "طالب لم يفهم درساً. بماذا يساعده الذكاء الاصطناعي؟",
      "A student didn’t understand a lesson. How can AI help?",
    ],
    ["يشرحه ببساطة خطوة بخطوة", "It explains it simply, step by step"],
    [
      ["يقدّم الامتحان عنه", "It sits the exam for them"],
      ["يتصل بالمعلّم", "It calls the teacher"],
      ["يلغي الواجب في المدرسة كلها", "It cancels homework for the whole school"],
    ],
    ["اطلب منه: «اشرح لي كأنني في العاشرة».", "Ask it: “Explain it like I’m ten.”"],
    [
      "يشرح الذكاء الاصطناعي الدرس بأمثلة بسيطة، ويعيد الشرح بطريقة أخرى إن طلبت.",
      "AI can explain a lesson with simple examples, and try another way if you ask.",
    ],
  ),
  q(
    "E12",
    "easy",
    "work",
    [
      "وصلك بريد إلكتروني طويل جداً. ماذا يفعل الذكاء الاصطناعي في ثوانٍ؟",
      "You got a very long email. What can AI do in seconds?",
    ],
    ["يلخّصه في 3 أسطر", "Sum it up in 3 lines"],
    [
      ["يطبعه على الورق", "Print it out"],
      ["يجعله أطول", "Make it even longer"],
      ["يرسله إلى كل أصدقائك", "Send it to all your friends"],
    ],
    ["تريد أن تعرف المهم بسرعة.", "You want the main points, fast."],
    [
      "التلخيص من أكثر ما يتقنه الذكاء الاصطناعي: ألصق النص واطلب أهم النقاط.",
      "Summing up is one of AI’s strengths: paste the text and ask for the key points.",
    ],
  ),
  q(
    "E13",
    "easy",
    "health",
    ["هل يغني روبوت المحادثة عن الطبيب؟", "Can a chatbot replace your doctor?"],
    ["لا، القرار للطبيب", "No, the doctor decides"],
    [
      ["نعم، دائماً", "Yes, always"],
      ["نعم، إن سألته بلطف شديد", "Yes, if you ask it nicely"],
      ["فقط في الكسور", "Only for broken bones"],
    ],
    ["من يفحصك فعلاً؟", "Who actually examines you?"],
    [
      "قد يساعدك روبوت المحادثة على فهم مصطلح، لكن التشخيص والعلاج للطبيب.",
      "A chatbot can help you understand a term, but diagnosis and treatment belong to your doctor.",
    ],
  ),
  q(
    "E14",
    "easy",
    "business",
    [
      "موقع متجر يجيب عن أسئلتك الساعة 3 فجراً. من يجيب؟",
      "A shop’s website answers you at 3 am. Who’s answering?",
    ],
    ["روبوت محادثة", "A chatbot"],
    [
      ["صاحب المتجر، فهو لا ينام", "The owner, who never sleeps"],
      ["مقطع فيديو مسجّل", "A recorded video"],
      ["هاتفك نفسه", "Your own phone"],
    ],
    ["من يعمل طوال الليل دون تعب؟", "Who can work all night without getting tired?"],
    [
      "روبوتات المحادثة تجيب الزبائن في أي ساعة، وتحوّل الأسئلة الصعبة إلى الموظفين.",
      "Chatbots answer customers at any hour and pass the hard questions to staff.",
    ],
  ),
  q(
    "E15",
    "easy",
    "images",
    [
      "بلمسة واحدة يزيل هاتفك شخصاً غريباً من صورتك. كيف؟",
      "One tap and your phone removes a stranger from your photo. How?",
    ],
    ["ذكاء اصطناعي يكمل الخلفية", "AI fills in the background"],
    [
      ["سحر حقيقي", "Real magic"],
      ["الغريب ابتعد وحده في الوقت المناسب", "The stranger walked off just in time"],
      ["الكاميرا أغمضت عينها", "The camera blinked"],
    ],
    ["ماذا يجب أن يظهر مكان الشخص المحذوف؟", "What has to appear where the person was?"],
    [
      "يحذف الذكاء الاصطناعي الشخص ويرسم ما كان خلفه من جديد.",
      "AI removes the person and paints in what was behind them.",
    ],
  ),
  q(
    "E16",
    "easy",
    "creative",
    ["هل يستطيع الذكاء الاصطناعي تأليف أغنية؟", "Can AI make a song?"],
    ["نعم، كلماتٍ ولحناً", "Yes, words and music"],
    [
      ["لا، أبداً", "No, never"],
      ["فقط النشيد الوطني", "Only the national anthem"],
      ["فقط إن كان معه عود يعزف عليه", "Only if it has an oud to play"],
    ],
    ["جرّب أن تطلب أغنية عن قطّتك.", "Try asking for a song about your cat."],
    [
      "أدوات الموسيقى بالذكاء الاصطناعي تكتب الكلمات واللحن، وتغنّي أيضاً، خلال دقيقة.",
      "AI music tools write the words and the tune, and even sing them, in about a minute.",
    ],
  ),
  q(
    "E17",
    "easy",
    "check",
    ["هل كل ما يقوله روبوت المحادثة صحيح؟", "Is everything a chatbot says true?"],
    ["لا، تحقّق من المهم", "No, check what matters"],
    [
      ["نعم، دائماً", "Yes, always"],
      ["نعم، إن بدا واثقاً من كلامه", "Yes, if it sounds very sure"],
      ["فقط يوم الاثنين", "Only on Mondays"],
    ],
    ["حتى الأذكياء يخطئون أحياناً.", "Even clever people get things wrong."],
    [
      "قد يخطئ روبوت المحادثة وهو واثق. تحقّق من الأرقام والأسماء وكل معلومة مهمة.",
      "A chatbot can be wrong and still sound sure. Check numbers, names and anything important.",
    ],
  ),
  q(
    "E18",
    "easy",
    "farm",
    [
      "مزارع يصوّر ورقة نبتة مريضة بتطبيق. ماذا يخبره الذكاء الاصطناعي؟",
      "A farmer photographs a sick leaf with an app. What can AI tell them?",
    ],
    ["المرض المحتمل وعلاجه", "The likely disease and the fix"],
    [
      ["نتيجة مباراة كرة القدم غداً", "The score of tomorrow’s big match"],
      ["سعر الذهب اليوم", "Today’s gold price"],
      ["عمر المزارع", "The farmer’s age"],
    ],
    ["التطبيق رأى آلاف الأوراق المريضة.", "The app has seen thousands of sick leaves."],
    [
      "تطبيقات الزراعة تقارن صورتك بآلاف الصور وتقترح المرض المحتمل وطريقة علاجه.",
      "Farming apps compare your photo with thousands of others and suggest the likely disease and a fix.",
    ],
  ),
  q(
    "E19",
    "easy",
    "home",
    [
      "عندك بيض وبندورة وخبز. ماذا يفعل روبوت المحادثة؟",
      "You’ve got eggs, tomatoes and bread. What can a chatbot do?",
    ],
    ["يقترح عليك وصفة", "Suggest a recipe"],
    [
      ["يطبخها عنك", "Cook it for you"],
      ["يغسل الصحون بعد الأكل", "Do the dishes after dinner"],
      ["يجعل البيض طازجاً", "Make the eggs fresh"],
    ],
    ["روبوت المحادثة يكتب، لا يطبخ.", "A chatbot writes; it doesn’t cook."],
    [
      "اكتب ما في مطبخك، وسيقترح عليك وصفات بخطوات واضحة.",
      "List what’s in your kitchen and it suggests recipes with clear steps.",
    ],
  ),
  q(
    "E20",
    "easy",
    "lang",
    ["هل يفهم روبوت المحادثة اللهجة الشامية؟", "Can a chatbot understand Syrian Arabic?"],
    ["نعم، ويكتب بها أيضاً", "Yes, and it can write it too"],
    [
      ["لا، الفصحى فقط", "No, only formal Arabic"],
      ["فقط إن كنت تتكلم من الشام", "Only if you’re standing in Damascus"],
      ["فقط في الأغاني", "Only in songs"],
    ],
    ["جرّب أن تكتب له «شو أخبارك؟».", "Try typing “shu akhbarak?” to it."],
    [
      "روبوتات المحادثة الحديثة تفهم اللهجات العربية وتردّ بها إن طلبت.",
      "Modern chatbots understand Arabic dialects and can reply in them if you ask.",
    ],
  ),

  /* ---------- medium: for people who have tried AI ---------- */
  q(
    "M01",
    "medium",
    "check",
    [
      "حين يختلق روبوت المحادثة معلومة ويقولها بثقة، ماذا نسمّي ذلك؟",
      "When a chatbot makes something up and says it confidently, what’s that called?",
    ],
    ["هلوسة", "A hallucination"],
    [
      ["فيروس", "A virus"],
      ["اختراق", "A hack"],
      ["تحديث تلقائي", "An automatic update"],
    ],
    [
      "الكلمة نفسها تُقال لمن يرى أشياء غير موجودة.",
      "Same word as seeing things that aren’t there.",
    ],
    [
      "«الهلوسة» أن يختلق الروبوت معلومة تبدو صحيحة. تحقّق من كل ما هو مهم.",
      "A “hallucination” is when the bot invents something that sounds right. Check anything important.",
    ],
  ),
  q(
    "M02",
    "medium",
    "ask",
    ["أيّ طلب يعطيك إجابة أفضل؟", "Which request gets you a better answer?"],
    ["«دعوة من 3 أسطر لحفلة الجمعة الساعة 6»", "“A 3-line invite to Friday’s party at 6”"],
    [
      ["«اكتب شيئاً»", "“Write something”"],
      ["«أنت تعرف ما أريد»", "“You know what I want”"],
      [
        "«اكتب لي شيئاً جميلاً ومميزاً جداً من فضلك»",
        "“Please write me something really nice and special”",
      ],
    ],
    ["الطول لا يهم، التفاصيل هي المهمة.", "Length doesn’t matter; details do."],
    [
      "قل له لمن الطلب، وماذا تريد، وبأي طول. الكلام الجميل وحده لا يضيف معلومات.",
      "Say who it’s for, what you want and how long. Nice words alone add no information.",
    ],
  ),
  q(
    "M03",
    "medium",
    "images",
    [
      "أيّ هذه قد يكون علامة على أن الصورة صنعها الذكاء الاصطناعي؟",
      "Which of these can be a sign that a photo was made by AI?",
    ],
    ["ستّ أصابع أو كتابة مشوّهة", "Six fingers or warped writing"],
    [
      ["الصورة ملوّنة", "It’s in colour"],
      ["منشورة على فيسبوك", "It’s on Facebook"],
      ["الصورة واضحة جداً وألوانها جميلة", "The picture is very sharp and clear"],
    ],
    ["دقّق في الأيدي والكتابة.", "Look at the hands and any writing."],
    [
      "الأيدي والكتابة والخلفيات أكثر ما تخطئ فيه صور الذكاء الاصطناعي، لكن الأدوات تتحسّن بسرعة.",
      "Hands, text and backgrounds are where AI images slip most, though the tools improve fast.",
    ],
  ),
  q(
    "M04",
    "medium",
    "scams",
    [
      "رسالة صوتية من قريبك يطلب مالاً بسرعة، والصوت صوته تماماً. ماذا تفعل؟",
      "A voice note from a relative asks for money fast, and it sounds just like them. What do you do?",
    ],
    ["أتصل به على رقمه لأتأكد", "Call them on their number to check"],
    [
      ["أرسل المال فوراً، فالصوت صوته", "Send it now: it’s clearly their voice"],
      ["أرسل نصف المبلغ", "Send half for now"],
      ["أردّ برسالة صوتية", "Reply with a voice note"],
    ],
    [
      "صار تقليد الأصوات ممكناً. كيف تتأكد بطريقة أخرى؟",
      "Voices can be copied now. How else can you be sure?",
    ],
    [
      "يقلّد الذكاء الاصطناعي الصوت من ثوانٍ من التسجيل. اتصل على رقم تعرفه قبل أن ترسل شيئاً.",
      "AI can copy a voice from a few seconds of audio. Call a number you know before sending anything.",
    ],
  ),
  q(
    "M05",
    "medium",
    "news",
    [
      "فيديو لشخص مشهور يقول كلاماً صادماً. ما التصرّف الذكي؟",
      "A video shows a famous person saying something shocking. What’s the smart move?",
    ],
    ["أتحقّق من مصدر موثوق", "Check a trusted source"],
    [
      ["أنشره فوراً", "Share it right away"],
      ["أصدّقه، فالفيديو لا يكذب", "Believe it: videos can’t lie"],
      ["أعلّق عليه بغضب", "Post an angry comment"],
    ],
    ["الفيديو قد يُصنع بالذكاء الاصطناعي اليوم.", "Videos can be made with AI now."],
    [
      "«التزييف العميق» يصنع فيديو لشخص يقول ما لم يقله. ابحث عن الخبر في مصدر موثوق قبل نشره.",
      "Deepfakes show people saying things they never said. Look for the story in a trusted source before sharing.",
    ],
  ),
  q(
    "M06",
    "medium",
    "how",
    [
      "لماذا قد لا يعرف روبوت المحادثة أخبار الأمس؟",
      "Why might a chatbot not know yesterday’s news?",
    ],
    ["معلوماته تقف عند تاريخ معيّن", "Its knowledge stops at a set date"],
    [
      ["لا يقرأ الصحف في عطلة نهاية الأسبوع", "It doesn’t read the papers at weekends"],
      ["بطاريته ضعيفة", "Its battery is low"],
      ["لا يحب الأخبار", "It doesn’t like the news"],
    ],
    ["تعلّم من نصوص جُمعت حتى يوم معيّن.", "It learned from text collected up to a certain day."],
    [
      "يتعلّم الروبوت من معلومات حتى تاريخ معيّن، وبعضه يبحث في الإنترنت ليعرف الجديد.",
      "A chatbot learns from information up to a cutoff date. Some can search the web for news.",
    ],
  ),
  q(
    "M07",
    "medium",
    "business",
    [
      "صاحب محل يريد منشوراً لإنستغرام بسرعة. بماذا يساعده الذكاء الاصطناعي؟",
      "A shop owner needs an Instagram post fast. How can AI help?",
    ],
    ["يكتب النص ويصمّم الصورة", "Write the text and make the picture"],
    [
      ["يُحضر الزبائن إلى المحل بنفسه", "Bring customers into the shop by itself"],
      ["يصلح باب المحل", "Fix the shop door"],
      ["يدفع الإيجار", "Pay the rent"],
    ],
    ["المنشور كلام وصورة.", "A post is words plus a picture."],
    [
      "يكتب الذكاء الاصطناعي نص المنشور ويصمّم صورته خلال دقائق، ويبقى القرار لصاحب المحل.",
      "AI can write the caption and make the image in minutes; the owner still decides.",
    ],
  ),
  q(
    "M08",
    "medium",
    "privacy",
    [
      "ترفع ملفاً فيه أرقام زبائنك إلى روبوت محادثة مجاني. ما الخطر؟",
      "You upload a file of your customers’ phone numbers to a free chatbot. What’s the risk?",
    ],
    ["بياناتهم تخرج من يدك", "Their data leaves your hands"],
    [
      ["الروبوت يتصل بهم جميعاً", "The bot phones every one of them"],
      ["يُحذف الملف", "The file gets deleted"],
      ["لا خطر، فهو مجاني", "None, it’s free"],
    ],
    ["أين تذهب الملفات التي ترفعها؟", "Where do uploaded files go?"],
    [
      "ما ترفعه قد يُحفظ على خوادم الشركة. لا ترفع بيانات زبائن أو أرقاماً خاصة.",
      "What you upload may be stored on the company’s servers. Keep customer data out.",
    ],
  ),
  q(
    "M09",
    "medium",
    "school",
    [
      "طالب يسلّم مقالاً كتبه الذكاء الاصطناعي على أنه من عمله. ما المشكلة؟",
      "A student hands in an AI-written essay as their own. What’s the problem?",
    ],
    ["هذا غش ولن يتعلّم شيئاً", "It’s cheating, and they learn nothing"],
    [
      ["سيكون المقال قصيراً", "The essay will be too short"],
      ["سيكون بالإنكليزية حتماً", "It will surely be in English"],
      ["لا مشكلة أبداً، فالكل يفعل ذلك", "No problem at all: everybody does it now"],
    ],
    ["من الذي تعلّم شيئاً هنا؟", "Who actually learned anything?"],
    [
      "الذكاء الاصطناعي مساعد للفهم والمراجعة، لكن تقديم عمله على أنه عملك غش.",
      "AI is great for understanding and checking, but handing in its work as yours is cheating.",
    ],
  ),
  q(
    "M10",
    "medium",
    "lang",
    [
      "بعض الهواتف تترجم صوتك مباشرة أثناء المكالمة. هذا…",
      "Some phones translate your voice live during a call. This is…",
    ],
    ["حقيقي ومتاح اليوم", "Real, and here today"],
    [
      ["في الأفلام فقط", "Only in films"],
      ["بعد عام 2050", "Coming after 2050"],
      ["لروّاد الفضاء في المحطة فقط", "Only for astronauts in space"],
    ],
    ["بعض الهواتف الحديثة تفعل ذلك الآن.", "Some new phones already do it."],
    [
      "بعض الهواتف والتطبيقات تترجم المكالمة مباشرة بين لغتين.",
      "Some phones and apps translate a call live between two languages.",
    ],
  ),
  q(
    "M11",
    "medium",
    "health",
    [
      "ما الاستخدام الجيد للذكاء الاصطناعي في صحتك؟",
      "What’s a good way to use AI for your health?",
    ],
    ["أجهّز أسئلة لطبيبي", "Prepare questions for my doctor"],
    [
      ["أوقف دوائي لأنه قال ذلك", "Stop my medicine because it said so"],
      ["أطلب منه تحليل دم", "Ask it for a blood test"],
      ["أستغني عن الطبيب", "Stop seeing the doctor"],
    ],
    ["من يتخذ القرار في النهاية؟", "Who makes the final call?"],
    [
      "استخدمه لتفهم وتستعد، ثم اسأل طبيبك. لا توقف دواءً ولا تبدأه دون طبيب.",
      "Use it to understand and prepare, then ask your doctor. Never stop or start a medicine without one.",
    ],
  ),
  q(
    "M12",
    "medium",
    "jobs",
    ["تبحث عن عمل. كيف يساعدك الذكاء الاصطناعي؟", "You’re looking for a job. How can AI help?"],
    ["يحسّن سيرتك الذاتية", "Polish your CV"],
    [
      ["يذهب إلى المقابلة عنك", "Go to the interview for you"],
      ["يضمن لك الوظيفة", "Guarantee you the job"],
      ["يرفع راتبك", "Raise your salary"],
    ],
    ["أول ما يراه صاحب العمل عنك.", "The first thing an employer sees."],
    [
      "يحسّن الذكاء الاصطناعي صياغة سيرتك ويدرّبك على أسئلة المقابلة، والوظيفة تبقى بجهدك.",
      "AI can polish your CV and help you practise interviews; landing the job is still on you.",
    ],
  ),
  q(
    "M13",
    "medium",
    "ask",
    [
      "لتحصل على صورة أجمل من الذكاء الاصطناعي، ماذا تضيف إلى طلبك؟",
      "For a better AI picture, what do you add to your request?",
    ],
    ["الأسلوب والألوان والمكان", "The style, colours and place"],
    [
      ["علامات تعجّب كثيرة جداً!!!", "Lots and lots of exclamation marks!!!"],
      ["«أرجوك أرجوك أرجوك»", "“Please please please”"],
      ["رقم هاتفك", "Your phone number"],
    ],
    ["صِف الصورة كأنك ترسمها بالكلام.", "Describe it as if painting with words."],
    [
      "اذكر الأسلوب والألوان والمكان والإضاءة. التفاصيل تصنع الفرق، لا علامات التعجب.",
      "Name the style, colours, place and light. Details make the difference, not exclamation marks.",
    ],
  ),
  q(
    "M14",
    "medium",
    "sports",
    [
      "في كرة القدم، ما الذي يساعد الحكّام على كشف التسلّل آلياً؟",
      "In football, what helps referees spot offside automatically?",
    ],
    ["كاميرات ذكية تتتبّع اللاعبين", "Smart cameras tracking players"],
    [
      ["صفّارة ذكية", "A smart whistle"],
      ["صراخ الجمهور", "The crowd shouting"],
      ["حدس الحكم وخبرته الطويلة في الملاعب", "The referee’s gut feeling and years of experience"],
    ],
    ["الكاميرات تحيط بالملعب كله.", "There are cameras all around the stadium."],
    [
      "كاميرات حول الملعب تتتبّع أطراف اللاعبين، والذكاء الاصطناعي ينبّه الحكم إلى التسلّل خلال ثوانٍ.",
      "Cameras around the stadium track players’ limbs, and AI flags offside to the referee in seconds.",
    ],
  ),
  q(
    "M15",
    "medium",
    "money",
    [
      "بنكك يوقف عملية دفع غريبة ببطاقتك. من لاحظها؟",
      "Your bank stops a strange payment on your card. Who spotted it?",
    ],
    ["ذكاء اصطناعي يرصد الغريب", "AI that spots unusual activity"],
    [
      ["موظّف يراقب كل بطاقة طوال اليوم", "A person watching every card all day"],
      ["البائع نفسه", "The seller"],
      ["الصدفة", "Chance"],
    ],
    ["البنك يعرف عاداتك في الدفع.", "Your bank knows your usual spending."],
    [
      "يتعلّم الذكاء الاصطناعي طريقة صرفك، وينبّه البنك فوراً إلى أي عملية غير معتادة.",
      "AI learns how you usually spend and flags anything unusual to the bank right away.",
    ],
  ),

  /* ---------- hard: for regular users, still no jargon ---------- */
  q(
    "H01",
    "hard",
    "facts",
    ["ماذا تعني GPT في اسم ChatGPT؟", "What does “GPT” in ChatGPT stand for?"],
    ["Generative Pre-trained Transformer", "Generative Pre-trained Transformer"],
    [
      ["General Purpose Technology Platform", "General Purpose Technology Platform"],
      ["Global Prediction Tool", "Global Prediction Tool"],
      ["Google Powered Text", "Google Powered Text"],
    ],
    ["G كما في «الذكاء الاصطناعي التوليدي».", "The G is the same as in “Generative AI”."],
    [
      "GPT تعني Generative Pre-trained Transformer: نموذج يولّد النص بعد أن دُرّب مسبقاً على نصوص هائلة.",
      "GPT means Generative Pre-trained Transformer: a model that generates text after training on huge amounts of it.",
    ],
  ),
  q(
    "H02",
    "hard",
    "facts",
    [
      "عام 1997 هزم حاسوب بطل العالم في الشطرنج. ما اسمه؟",
      "In 1997 a computer beat the world chess champion. What was it called?",
    ],
    ["Deep Blue", "Deep Blue"],
    [
      ["AlphaGo", "AlphaGo"],
      ["IBM Watson", "IBM Watson"],
      ["Siri", "Siri"],
    ],
    ["في اسمه لون.", "Its name has a colour in it."],
    [
      "حاسوب «ديب بلو» من IBM هزم غاري كاسباروف عام 1997، وكانت لحظة تاريخية للذكاء الاصطناعي.",
      "IBM’s Deep Blue beat Garry Kasparov in 1997, a landmark moment for AI.",
    ],
  ),
  q(
    "H03",
    "hard",
    "scams",
    [
      "كم من صوتك قد يكفي الذكاء الاصطناعي ليقلّده؟",
      "How much of your voice can be enough for AI to copy it?",
    ],
    ["بضع ثوانٍ", "A few seconds"],
    [
      ["ساعة تقريباً", "About an hour"],
      ["10 ساعات على الأقل", "At least 10 hours"],
      ["لا يستطيع ذلك بعد", "It can’t do that yet"],
    ],
    ["أقلّ بكثير مما تظن.", "Much less than you’d think."],
    [
      "بعض الأدوات تقلّد الصوت من ثوانٍ قليلة من التسجيل، لذلك تحقّق دائماً قبل أن ترسل مالاً.",
      "Some tools can copy a voice from a few seconds of audio, so always check before sending money.",
    ],
  ),
  q(
    "H04",
    "hard",
    "check",
    [
      "أعطاك روبوت المحادثة رابطاً لمصدر. ماذا تفعل؟",
      "A chatbot gives you a link to its source. What do you do?",
    ],
    ["أفتحه وأتأكد مما فيه", "Open it and check what it says"],
    [
      ["أثق به، فالروابط لا تُختلق", "Trust it: links can’t be made up"],
      ["أثق به إن كان موقعاً معروفاً", "Trust it if it’s a well-known site"],
      ["أنشره، فله مصدر", "Share it: it has a source"],
    ],
    ["قد يختلق الروبوت الروابط أيضاً.", "Bots can make up links too."],
    [
      "قد يعطيك روبوت المحادثة رابطاً لا يقول ما يدّعيه، أو لا وجود له أصلاً. افتحه واقرأ.",
      "A chatbot can give a link that doesn’t say what it claims, or doesn’t exist. Open it and read.",
    ],
  ),
  q(
    "H05",
    "hard",
    "privacy",
    [
      "محادثاتك مع روبوت المحادثة: من قد يطّلع عليها؟",
      "Your chats with a chatbot: who might see them?",
    ],
    ["الشركة قد تحفظها", "The company may keep them"],
    [
      ["لا أحد، فهي تُحذف فوراً", "No one: they’re deleted at once"],
      ["أنت وحدك دائماً", "Only you, always"],
      ["هاتفك فقط يحفظها", "Only your phone keeps them"],
    ],
    ["هل قرأت سياسة الخصوصية؟", "Have you read the privacy policy?"],
    [
      "كثير من الشركات تحفظ المحادثات، وقد يراجعها موظفون أو تُستخدم للتدريب. لا تكتب فيها أسراراً.",
      "Many companies keep chats, and staff may review them or use them for training. Keep secrets out.",
    ],
  ),
  q(
    "H06",
    "hard",
    "jobs",
    [
      "أيّ مهارة تزداد قيمتها مع انتشار الذكاء الاصطناعي؟",
      "Which skill is worth more as AI spreads?",
    ],
    ["التفكير النقدي", "Critical thinking"],
    [
      ["الكتابة السريعة", "Fast typing"],
      ["حفظ المعلومات عن ظهر قلب", "Memorising facts by heart"],
      ["الخط الجميل", "Neat handwriting"],
    ],
    ["الآلة تجيب، فمن يحكم على الجواب؟", "AI answers; who judges the answer?"],
    [
      "كلما كتب الذكاء الاصطناعي أكثر، زادت قيمة من يعرف كيف يسأل ويتحقّق ويحكم.",
      "The more AI writes, the more it’s worth knowing how to question, check and judge.",
    ],
  ),
  q(
    "H07",
    "hard",
    "fair",
    [
      "ذكاء اصطناعي تعلّم غالباً من صور فئة واحدة من الناس. ماذا قد يحدث؟",
      "An AI learned mostly from photos of one group of people. What may happen?",
    ],
    ["يخطئ أكثر مع غيرهم", "It makes more mistakes with others"],
    [
      ["يعمل جيداً مع الجميع بالتساوي", "It works equally well for every person"],
      ["يتعلّم الباقي وحده", "It learns the rest by itself"],
      ["يرفض الصور الأخرى", "It refuses other photos"],
    ],
    ["يعرف فقط ما رآه.", "It only knows what it has seen."],
    [
      "إذا تعلّم الذكاء الاصطناعي من فئة واحدة، يخطئ أكثر مع من لم يرهم. لذلك تهمّ البيانات المتنوعة.",
      "If AI learns from one group, it makes more mistakes with people it hasn’t seen. That’s why varied data matters.",
    ],
  ),
  q(
    "H08",
    "hard",
    "how",
    ["كيف تعلّمت روبوتات المحادثة الكتابة؟", "How did chatbots learn to write?"],
    ["بقراءة كمّ هائل من النصوص", "By reading huge amounts of text"],
    [
      ["من قاموس واحد كبير", "From one big dictionary"],
      ["من قواعد نحو كتبها مبرمجون", "From grammar rules typed by programmers"],
      ["بالاستماع إلى الراديو", "By listening to the radio"],
    ],
    [
      "قرأ أكثر مما يقرأه إنسان في ألف عمر.",
      "It read more than a person could in a thousand lifetimes.",
    ],
    [
      "تعلّمت روبوتات المحادثة الأنماط من مليارات الجمل، لا من قواعد كتبها أحد.",
      "Chatbots learned patterns from billions of sentences, not from rules someone typed in.",
    ],
  ),
  q(
    "H09",
    "hard",
    "health",
    ["كيف يساعد الذكاء الاصطناعي الأطباء في المستشفيات؟", "How does AI help doctors in hospitals?"],
    ["يقرأ صور الأشعة", "It reads X-ray scans"],
    [
      ["يجري العمليات وحده", "It operates on patients alone"],
      ["يصف الدواء دون طبيب", "It prescribes without a doctor"],
      ["يغني عن التحاليل", "It replaces lab tests"],
    ],
    ["الآلة ترى في الصور ما قد يفوت العين.", "It can see things in images the eye might miss."],
    [
      "يرصد الذكاء الاصطناعي علامات مبكرة في صور الأشعة، ويبقى القرار للطبيب.",
      "AI can spot early signs in scans; the doctor still makes the call.",
    ],
  ),
  q(
    "H10",
    "hard",
    "safety",
    [
      "بعض المساعدات الذكية تحجز وتدفع عنك. ماذا تفعل دائماً؟",
      "Some AI assistants can book and pay for you. What should you always do?",
    ],
    ["أراجع قبل أن يدفع", "Check before it pays"],
    [
      ["أعطيه كلمة سرّ البنك", "Give it my bank password"],
      ["أتركه يقرّر كل شيء", "Let it decide everything"],
      ["لا أراجع، فهذا أسرع", "Skip checking: it’s faster"],
    ],
    ["مال من هذا؟", "Whose money is it?"],
    [
      "المساعدات الذكية قد تخطئ في الحجز أو المبلغ. راجع كل شيء قبل الدفع أو الإرسال.",
      "AI assistants can get a booking or an amount wrong. Check before anything is paid or sent.",
    ],
  ),
  q(
    "H11",
    "hard",
    "scams",
    ["كيف غيّر الذكاء الاصطناعي رسائل الاحتيال؟", "How has AI changed scam messages?"],
    ["صارت أتقن وأصعب كشفاً", "Better written, harder to spot"],
    [
      ["صارت مليئة بالأخطاء الإملائية", "Full of obvious spelling mistakes"],
      ["اختفت تماماً", "Gone for good"],
      ["صارت بالإنكليزية فقط", "English only now"],
    ],
    ["الأخطاء الإملائية لم تعد علامة كافية.", "Spelling mistakes are no longer a reliable clue."],
    [
      "يكتب المحتالون اليوم رسائل متقنة بالذكاء الاصطناعي. تحقّق من المرسل لا من جودة اللغة.",
      "Scammers now write polished messages with AI. Check who sent it, not how well it’s written.",
    ],
  ),
  q(
    "H12",
    "hard",
    "check",
    [
      "محامٍ استعان بـ ChatGPT فاختلق له قضايا غير موجودة. ما الدرس؟",
      "A lawyer used ChatGPT and it invented court cases. What’s the lesson?",
    ],
    ["تحقّق دائماً من معلوماته", "Always check its facts"],
    [
      ["استخدم النسخة المدفوعة فقط", "Only use the paid version"],
      ["الذكاء الاصطناعي ممنوع في المحاكم", "AI is banned in court"],
      ["لا تستخدم الحاسوب في العمل", "Don’t use computers at work"],
    ],
    ["ما الذي نسي المحامي أن يفعله؟", "What did the lawyer forget to do?"],
    [
      "حدث هذا فعلاً في نيويورك عام 2023 وغُرّم المحامون. الذكاء الاصطناعي يساعد، والتحقّق مسؤوليتك.",
      "This really happened in New York in 2023 and the lawyers were fined. AI helps; checking is your job.",
    ],
  ),
  q(
    "H13",
    "hard",
    "facts",
    ["أيّ شركة صنعت ChatGPT؟", "Which company made ChatGPT?"],
    ["OpenAI", "OpenAI"],
    [
      ["غوغل", "Google"],
      ["مايكروسوفت", "Microsoft"],
      ["ميتا", "Meta"],
    ],
    ["في اسمها كلمة «مفتوح».", "Its name has “open” in it."],
    [
      "صنعت شركة OpenAI برنامج ChatGPT وأطلقته أواخر 2022، ومايكروسوفت من كبار المستثمرين فيها.",
      "OpenAI made ChatGPT and launched it in late 2022; Microsoft is a major investor.",
    ],
  ),
  q(
    "H14",
    "hard",
    "travel",
    ["السيارات ذاتية القيادة اليوم…", "Self-driving cars today…"],
    ["تنقل ركّاباً في بعض المدن", "Carry passengers in some cities"],
    [
      ["موجودة في الأفلام فقط", "Exist only in films"],
      ["ممنوعة في جميع دول العالم بلا استثناء", "Are banned in every country on earth"],
      ["تسير في الصحراء فقط", "Only drive in deserts"],
    ],
    ["في بعض المدن تطلبها بتطبيق.", "In some cities you can order one with an app."],
    [
      "سيارات أجرة بلا سائق تنقل الركّاب اليوم في مدن مثل سان فرانسيسكو وووهان.",
      "Driverless taxis already carry passengers in cities like San Francisco and Wuhan.",
    ],
  ),
  q(
    "H15",
    "hard",
    "work",
    [
      "تطبيقات الاجتماعات تكتب ملخّص الاجتماع وحدها. كيف؟",
      "Meeting apps write the meeting summary by themselves. How?",
    ],
    ["تكتب الكلام ثم تلخّصه", "They type up the talk, then sum it up"],
    [
      ["تخمّن من عنوان الاجتماع", "They guess it all from the meeting title"],
      ["موظّف يستمع ويكتب", "A person listens and types"],
      ["تقرأ بريد الحضور", "They read the attendees’ email"],
    ],
    ["الآلة تسمع كل كلمة.", "The app hears every word."],
    [
      "تحوّل التطبيقات الكلام إلى نص مكتوب، ثم يلخّص الذكاء الاصطناعي أهم النقاط والمهام.",
      "The app turns speech into text, then AI sums up the key points and tasks.",
    ],
  ),
];
