// Languages taught by the in-app AI teacher. `code` is the BCP-47 tag used for
// text-to-speech pronunciation; `rtl` flags right-to-left scripts (Arabic).
export const LANGUAGES = [
  { id: "en", name: "English",    endonym: "English",    emoji: "🇬🇧", code: "en-US", rtl: false },
  { id: "es", name: "Spanish",    endonym: "Español",    emoji: "🇪🇸", code: "es-ES", rtl: false },
  { id: "fr", name: "French",     endonym: "Français",   emoji: "🇫🇷", code: "fr-FR", rtl: false },
  { id: "zh", name: "Mandarin",   endonym: "中文",        emoji: "🇨🇳", code: "zh-CN", rtl: false },
  { id: "ru", name: "Russian",    endonym: "Русский",    emoji: "🇷🇺", code: "ru-RU", rtl: false },
  { id: "ar", name: "Arabic",     endonym: "العربية",     emoji: "🇸🇦", code: "ar-SA", rtl: true  },
  { id: "pt", name: "Portuguese", endonym: "Português",  emoji: "🇵🇹", code: "pt-PT", rtl: false },
  { id: "hi", name: "Hindi",      endonym: "हिन्दी",       emoji: "🇮🇳", code: "hi-IN", rtl: false },
];

export const LANG_TOPICS = ["Greetings", "Numbers 1–10", "Colours", "Food", "Family", "Animals", "Days & time", "Weather", "School", "Body", "Feelings", "Common verbs", "Travel", "Everyday phrases"];

// Minimal offline fallback (greetings) so a first lesson isn't blank without internet.
export const FALLBACK = {
  en: [
    { target: "Hello", roman: "heh-LOH", english: "Hello" },
    { target: "Good morning", roman: "good MOR-ning", english: "Good morning" },
    { target: "Thank you", roman: "thank yoo", english: "Thank you" },
    { target: "Please", roman: "pleez", english: "Please" },
    { target: "Goodbye", roman: "good-BY", english: "Goodbye" },
  ],
  es: [
    { target: "Hola", roman: "OH-lah", english: "Hello" },
    { target: "Buenos días", roman: "BWEH-nos DEE-as", english: "Good morning" },
    { target: "Gracias", roman: "GRAH-syas", english: "Thank you" },
    { target: "Por favor", roman: "por fah-VOR", english: "Please" },
    { target: "Adiós", roman: "ah-DYOS", english: "Goodbye" },
  ],
  fr: [
    { target: "Bonjour", roman: "bon-ZHOOR", english: "Hello / Good day" },
    { target: "Bonsoir", roman: "bon-SWAHR", english: "Good evening" },
    { target: "Merci", roman: "mehr-SEE", english: "Thank you" },
    { target: "S'il vous plaît", roman: "seel voo PLEH", english: "Please" },
    { target: "Au revoir", roman: "oh ruh-VWAHR", english: "Goodbye" },
  ],
  zh: [
    { target: "你好", roman: "nǐ hǎo", english: "Hello" },
    { target: "早上好", roman: "zǎo shang hǎo", english: "Good morning" },
    { target: "谢谢", roman: "xiè xie", english: "Thank you" },
    { target: "请", roman: "qǐng", english: "Please" },
    { target: "再见", roman: "zài jiàn", english: "Goodbye" },
  ],
  ru: [
    { target: "Привет", roman: "pri-VYET", english: "Hi" },
    { target: "Доброе утро", roman: "DOH-bra-ye OO-tra", english: "Good morning" },
    { target: "Спасибо", roman: "spa-SEE-ba", english: "Thank you" },
    { target: "Пожалуйста", roman: "pa-ZHAL-sta", english: "Please" },
    { target: "До свидания", roman: "da svi-DA-ni-ya", english: "Goodbye" },
  ],
  ar: [
    { target: "مرحبا", roman: "MAR-ha-ban", english: "Hello" },
    { target: "صباح الخير", roman: "sa-BAAH al-KHAYR", english: "Good morning" },
    { target: "شكرا", roman: "SHUK-ran", english: "Thank you" },
    { target: "من فضلك", roman: "min FAD-lik", english: "Please" },
    { target: "مع السلامة", roman: "ma-a sa-LA-ma", english: "Goodbye" },
  ],
  pt: [
    { target: "Olá", roman: "oh-LAH", english: "Hello" },
    { target: "Bom dia", roman: "bom DEE-a", english: "Good morning" },
    { target: "Obrigado", roman: "oh-bri-GAH-doo", english: "Thank you" },
    { target: "Por favor", roman: "por fa-VOR", english: "Please" },
    { target: "Adeus", roman: "a-DEUSH", english: "Goodbye" },
  ],
  hi: [
    { target: "नमस्ते", roman: "na-mas-TAY", english: "Hello" },
    { target: "सुप्रभात", roman: "su-pra-BHAAT", english: "Good morning" },
    { target: "धन्यवाद", roman: "DHAN-ya-vaad", english: "Thank you" },
    { target: "कृपया", roman: "KRIP-ya", english: "Please" },
    { target: "अलविदा", roman: "al-vi-DAA", english: "Goodbye" },
  ],
};
