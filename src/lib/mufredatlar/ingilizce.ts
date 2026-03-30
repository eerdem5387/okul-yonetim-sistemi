/**
 * LEVENT COLLEGE IB PROGRAMME — ENGLISH ANNUAL CURRICULUM
 * Programme Duration: 40 weeks
 * Kaynak: pdf/ingilizce-mufredat.pdf
 */

export interface MufredatHafta {
  ay?: string            // Ay başlığı (sadece ay değiştiğinde)
  hafta: number | string // Tek hafta (5) veya aralık ("1–2")
  konu: string           // Ünite adı (Subject)
  icerik: string         // Ders içeriği (Content)
  hedef: string          // Öğrenme hedefleri (Objective)
}

export const INGILIZCE_MUFREDAT: MufredatHafta[] = [
  // ── SEPTEMBER 2024 ──────────────────────────────────────────────────
  {
    ay: "SEPTEMBER 2024",
    hafta: 1,
    konu: "Lifestyles",
    icerik: "1a Night and Day Around the Milky Way · 1b Grammar in Use",
    hedef:
      "To learn vocabulary for daily routines and leisure activities in context, to listen and read for gist, to read for specific information (multiple choice), to learn prepositions, to practice words easily confused, to expand vocabulary through contextual speaking and writing activities. To learn/revise the present simple and present continuous, to compare action verbs & stative verbs, to learn/revise stative verbs with continuous forms, to learn/revise adverbs of frequency, to express agreement and disagreement using so, neither, and nor in appropriate contexts.",
  },
  {
    hafta: 2,
    konu: "Lifestyles",
    icerik: "1c Skills in Action · Culture 1: Teen Life in Ireland · Review 1",
    hedef:
      "To learn vocabulary for describing people, to listen for specific information (matching), to act out a dialogue and practice every day English for introducing people, to learn the pronunciation of homophones, to read for how to describe a person's character, to write a blog entry about a favorite person. To listen/read for gist, to read for specific information (true/false), to describe the typical daily routines, families, and extracurricular activities of teenagers in Ireland and compare them with other cultures. To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English.",
  },
  {
    hafta: 3,
    konu: "Shop Till You Drop",
    icerik: "2a Harrods 'All Things, for All People, Everywhere'",
    hedef:
      "To learn vocabulary for shops and shopping, to listen and read for gist (matching headings to paragraphs), to read for specific information (true-false), to make sentences using the phrases, to expand vocabulary through contextual speaking and writing activities.",
  },
  {
    hafta: 4,
    konu: "Shop Till You Drop",
    icerik: "2b Grammar in Use · 2c Skills in Action",
    hedef:
      "To form and use the past simple and used to correctly in speech and writing, to apply the correct order of adjectives, to make comparisons accurately. To learn vocabulary for clothes-patterns & materials, to listen for a specific information (multiple choice questions), to act out a dialogue and practice every day English for describing lost property, to learn the pronunciation of silent letters, to read an e-mail and replace adjectives in the given paragraph, to write an e-mail about a weekend break.",
  },

  // ── OCTOBER 2024 ────────────────────────────────────────────────────
  {
    ay: "OCTOBER 2024",
    hafta: 5,
    konu: "Shop Till You Drop",
    icerik: "Culture 2: Borough Market 1000 years of shopping · Review 2",
    hedef:
      "To listen/read for gist, to read for specific information (gap-fill task), to ask for things in a shop and describe objects, to write a short text for an online travel magazine (ICT). To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English.",
  },
  {
    hafta: 6,
    konu: "Survival Stories",
    icerik: "3a Surviving Solo · 3b Grammar in Use",
    hedef:
      "To learn vocabulary for weather phenomena, feelings, and sounds in appropriate contexts, to read for specific information (multiple choice questions), to recognize adverbs, to make sentences into the correct order (sequencing task), to write a blog. To form and use the Past Continuous Tense with while/when and distinguish it from the past simple.",
  },
  {
    hafta: 7,
    konu: "Survival Stories",
    icerik: "3c Skills in Action · Culture 3: Sir Ernest Shackleton · Review 3",
    hedef:
      "To learn vocabulary for feelings & sounds, to listen for specific information (listen for attitude), to act out a dialogue and practice every day English for a witness report, to learn the pronunciation of stressed words, to read the story (sequencing task) and learn a variety of adjectives and adverbs, to write a well-organized story, incorporating past tenses and descriptive language. To listen/read for gist (brainstorming), to read for specific information (gap-fill task), to collect information and write a short paragraph (ICT). To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English.",
  },

  // ── NOVEMBER 2024 ───────────────────────────────────────────────────
  {
    ay: "NOVEMBER 2024",
    hafta: 8,
    konu: "Survival Stories",
    icerik: "Values A: Diversity · Public Speaking Skills A · CLIL A: History: In England a century ago",
    hedef:
      "To listen and read for specific information (matching headings to paragraphs), to define what diversity is and explain its significance in various settings and compare it with other countries. To give presentation to entertain the audience, narrate the events, inform and persuade the audience. To listen for specific information (true-false), to talk about key historical events and social changes in England a century ago, analyze their impact on society, and compare them to modern-day developments using CLIL strategies.",
  },
  {
    hafta: 9,
    konu: "Planning Ahead",
    icerik: "4a Forum · 4b Grammar in Use",
    hedef:
      "To listen/read for identifying different jobs and their required qualities, to read for specific information (multiple choice questions, gap-fill), to learn prepositions, to practice words easily confused, to expand vocabulary through contextual speaking and writing activities. To form and use will, going to, and the present continuous tense to discuss future plans.",
  },
  {
    hafta: 10,
    konu: "Planning Ahead",
    icerik: "4c Skills in Action · Culture 4: Part-time American Student Jobs · Review 4",
    hedef:
      "To learn vocabulary for job qualities, to listen for a specific information (multiple choice questions), to act out a dialogue and practice every day English for having a job interview, to learn the pronunciation of 'll, to read an e-mail and replace the informal phrases with their equivalent formal ones, to write an e-mail applying for a job. To read for comprehension by developing critical thinking skills by evaluating how part-time jobs impact students' education and future careers (ICT). To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English.",
  },
  {
    hafta: 11,
    konu: "Food, Glorious Food",
    icerik: "5a Tasty Cuisine on a Submarine · 5b Grammar in Use",
    hedef:
      "To identify and categorize different types of food and drinks, to compare and contrast fast food with homemade dishes, to read for specific information (multiple choice), to learn phrases and prepositions, to expand vocabulary through contextual speaking and writing activities. To form and use countable and uncountable nouns-quantifiers, to use compound forms of some, any, no, and every accurately, to recognize and construct Conditionals Type 0 sentences.",
  },
  {
    hafta: 12,
    konu: "Food, Glorious Food",
    icerik: "5c Skills in Action",
    hedef:
      "To learn vocabulary for fast food dishes and drinks, to listen to and understand dialogues related to food (listen for cohesion & multiple choice), to act out a dialogue and practice every day English for ordering a takeaway, to learn the pronunciation of like-d' like, to read for specific information (gap-fill task) (multiple choice), to write an online review about a recently visited restaurant.",
  },

  // ── DECEMBER 2024 ───────────────────────────────────────────────────
  {
    ay: "DECEMBER 2024",
    hafta: 13,
    konu: "Food, Glorious Food",
    icerik: "Culture 5: Festive Sweets in the UK · Review 5",
    hedef:
      "To read for specific information (reading comprehension) (short answer format), to write a short text about any kind of sweet. To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English.",
  },
  {
    hafta: 14,
    konu: "Health",
    icerik: "6a An Apple a Day · 6b Grammar in Use",
    hedef:
      "To identify common illnesses, remedies, body parts, and injuries, to read for specific information (read for detail-multiple choice), to learn prepositions, to practice words easily confused, to expand vocabulary through contextual speaking and writing activities (ICT). To form the present perfect simple and distinguish it from past simple tense, to form present perfect continuous tense.",
  },
  {
    hafta: 15,
    konu: "Health",
    icerik: "6c Skills in Action · Culture 6: Royal Flying Doctor Service",
    hedef:
      "To learn vocabulary for parts of the body & injuries, to listen/revise for a specific information (multiple matching), to act out a dialogue and practice every day English for at the doctor's, to learn the pronunciation of /ıd/, to understand the text related to health (read for coherence & cohesion/missing sentences), to write an e-mail about a health issue. To read for detail (missing sentences), to expand vocabulary through contextual speaking and writing activities (ICT).",
  },
  {
    hafta: 16,
    konu: "Health",
    icerik: "Review 6 · Values B: Volunteering",
    hedef:
      "To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English. To listen and read for specific information (paragraph completion), to research ways to volunteer and create a one-minute video promoting volunteering (ICT).",
  },

  // ── JANUARY 2025 ────────────────────────────────────────────────────
  {
    ay: "JANUARY 2025",
    hafta: 17,
    konu: "Health",
    icerik: "Public Speaking Skills B · CLIL B: Food Preparation & Nutrition: Food Label",
    hedef:
      "To give presentation by reflecting on their personal interests and skills to identify meaningful volunteer opportunities and develop empathy and social responsibility through discussions and real-world examples. To listen/read for specific information (true-false), to analyze food labels to understand food preparation and nutrition.",
  },
  {
    hafta: 18,
    konu: "Stick to the Rules",
    icerik: "7a Welcome to Green Forest Campsite",
    hedef:
      "To learn and use vocabulary related to rules, regulations, and chores in various contexts, to listen for a specific information (multiple choice), to learn new words/phrases related to the text, to learn prepositions, to expand vocabulary through contextual speaking and writing activities.",
  },
  {
    hafta: 19,
    konu: "Stick to the Rules",
    icerik: "7b Grammar in Use · 7c Skills in Action",
    hedef:
      "To understand and apply modal verbs (present & past modals) and the imperative to express rules, permissions, and obligations. To learn vocabulary for chores, to listen for specific information (multiple matching), to act out a dialogue and practice every day English for asking about/explaining rules, to learn the pronunciation of can/kæn/-can't/kɑːnt/, to read for detail (match headings to paragraphs), to write an advert about a flat for rent.",
  },
  {
    hafta: 20,
    konu: "Stick to the Rules",
    icerik: "Culture 7: The Greatest Race in the Land Down Under · Review 7",
    hedef:
      "To read for detail (T/F/DS Statements), to use appropriate vocabulary and expressions to discuss and write about cultural and sporting events, to collect information about a race in other countries and make a presentation about it (ICT). To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English.",
  },

  // ── FEBRUARY 2025 ───────────────────────────────────────────────────
  {
    ay: "FEBRUARY 2025",
    hafta: 21,
    konu: "Landmarks",
    icerik: "8a A Hidden of Wonders",
    hedef:
      "To identify and use vocabulary related to geographical features, man-made landmarks, and materials, to listen for a specific information (complete sentences), to learn opposites of the given words, to learn prepositions, to expand vocabulary through contextual speaking and writing activities.",
  },
  {
    hafta: 22,
    konu: "Landmarks",
    icerik: "8b Grammar in Use",
    hedef:
      "To understand and use the passive voice correctly in different tenses to describe processes, actions, and events where the focus is on the action rather than the doer.",
  },
  {
    hafta: 23,
    konu: "Landmarks",
    icerik: "8c Skills in Action",
    hedef:
      "To learn vocabulary for man-made landmarks and materials, to listen to and understand the text (listen for detail-gap-fill task), to act out a dialogue and practice every day English for asking for information, to learn the intonation in passive questions, to read an article about a landmark (gap-fill task/sentence completion), to develop writing skills by composing an informative article about a landmark, incorporating descriptive language and passive structures.",
  },
  {
    hafta: 24,
    konu: "Landmarks",
    icerik: "Culture 8: Man-made Landmarks in the UK · Review 8",
    hedef:
      "To listen/read for specific information (multiple matching), to enhance their research and critical thinking skills by analyzing famous landmarks and their significance (ICT). To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English.",
  },

  // ── MARCH 2025 ──────────────────────────────────────────────────────
  {
    ay: "MARCH 2025",
    hafta: 25,
    konu: "Live and Let Live",
    icerik: "9a No Dodos",
    hedef:
      "To learn and use vocabulary for endangered animals and green activities in various contexts, to read for specific information (comprehension questions/short answer format/sentence completion), to learn prepositions, to expand vocabulary through contextual speaking and writing activities (ICT).",
  },
  {
    hafta: 26,
    konu: "Live and Let Live",
    icerik: "9b Grammar in Use",
    hedef:
      "To understand and apply the past perfect tense, second conditional, and reflexive pronouns in spoken and written communication.",
  },
  {
    hafta: 27,
    konu: "Live and Let Live",
    icerik: "9c Skills in Action · Culture 9: Footprints Eco Festival · Review 9",
    hedef:
      "To learn vocabulary for green activities, to listen for detail (multiple choice), to act out a dialogue and practice every day English for making suggestions-agreeing/disagreeing, to learn the intonation of identifying feelings, to read for specific information (comprehension), to write an article providing solutions to a problem. To read/listen for specific information (comprehension), to collect information about an eco-festival, write a short paragraph and present it (ICT). To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English.",
  },
  {
    hafta: 28,
    konu: "Live and Let Live",
    icerik: "Values C: Good Citizenship · Public Speaking Skills C · CLIL C: Science: The Greenhouse Effect",
    hedef:
      "To listen and read for specific information (matching paragraphs to circles), to understand key principles of good citizenship, including responsibility, respect, and community involvement, and analyze real-life examples. To listen to and read the model in the given text, to collect information and give presentation about how to save water at home (ICT). To read and explain the concept of the greenhouse effect and its role in global climate change, identify the causes and consequences using scientific vocabulary (ICT).",
  },

  // ── APRIL 2025 ──────────────────────────────────────────────────────
  {
    ay: "APRIL 2025",
    hafta: 29,
    konu: "Holiday Time",
    icerik: "10a Top Travellers",
    hedef:
      "To learn and use vocabulary related to different types of holidays, weather conditions, and hotel services & facilities, to read for specific information (T/F/DS statements, matching opposites), to learn prepositions, to listen for a specific information (gap-fill task), to expand vocabulary through contextual speaking and writing activities.",
  },
  {
    hafta: 30,
    konu: "Holiday Time",
    icerik: "10b Grammar in Use",
    hedef:
      "To understand and correctly use the (to) infinitive and -ing form in various sentence structures, to identify and apply relative pronouns, adverbs, and defining relative clauses in speaking and writing, to learn how the article is used with names of places.",
  },
  {
    hafta: 31,
    konu: "Holiday Time",
    icerik: "10c Skills in Action",
    hedef:
      "To learn vocabulary for hotel services & facilities, to listen for detail (multiple choice), to act out a dialogue and practice every day English for checking in at a hotel, to learn the pronunciation of rhyming words, to read for specific information (comprehension & short answer format), to write a hotel review.",
  },
  {
    hafta: 32,
    konu: "Holiday Time",
    icerik: "Culture 10: Discover Scotland · Review 10",
    hedef:
      "To develop reading and listening comprehension skills through texts and discussions about Scotland, to collect information about different places and types of holidays in other countries and create a brochure (ICT). To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English.",
  },

  // ── MAY 2025 ────────────────────────────────────────────────────────
  {
    ay: "MAY 2025",
    hafta: 33,
    konu: "Join in the Fun",
    icerik: "11a Two Festivals for the Price of One!",
    hedef:
      "To learn and use vocabulary for festival activities and types of entertainment, to read for specific information (multiple choice, gap-fill task), to learn prepositions, to expand vocabulary through contextual speaking and writing activities.",
  },
  {
    hafta: 34,
    konu: "Join in the Fun",
    icerik: "11b Grammar in Use",
    hedef:
      "To use reported speech (statements-questions), to form changing from direct to reported speech, to recognize personal pronouns & possessive adjectives & time expressions in reported speech, to use gradable/non-gradable adjectives.",
  },
  {
    hafta: 35,
    konu: "Join in the Fun",
    icerik: "11c Skills in Action",
    hedef:
      "To learn vocabulary for types of entertainment, to listen for detail (gap-fill task), to act out a dialogue and practice every day English for describing an event, to learn the pronunciation of stressed syllables, to read for specific information (opening-closing remarks in an e-mail), to write an e-mail describing an event.",
  },
  {
    hafta: 36,
    konu: "Join in the Fun",
    icerik: "Culture 11: Tjungu Festival · Review 11",
    hedef:
      "To read for specific information (short answer, matching opposites), to collect information about an annual festival and write a short text about it for a website's culture column (ICT). To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English.",
  },

  // ── JUNE 2025 ───────────────────────────────────────────────────────
  {
    ay: "JUNE 2025",
    hafta: 37,
    konu: "Going Online",
    icerik: "12a Better Safe than Sorry!",
    hedef:
      "To learn and use vocabulary for computer parts and smartphone usage, to read for specific information (multiple matching), to listen for specific information/gist (multiple matching, sentence completion, gap-fill task), to learn prepositions, to expand vocabulary through contextual speaking and writing activities.",
  },
  {
    hafta: 38,
    konu: "Going Online",
    icerik: "12b Grammar in Use",
    hedef:
      "To understand and apply reported orders, instructions, and commands in various contexts, to correctly use question tags and exclamations.",
  },
  {
    hafta: 39,
    konu: "Going Online",
    icerik: "12c Skills in Action · Culture 12: What Technology",
    hedef:
      "To learn vocabulary for using a smartphone, to listen for specific information (multiple matching), to act out a dialogue and practice every day English for giving instructions, to learn intonation in exclamations, to read for specific information (gap-fill task), to write a for-against essay. To read for specific information (multiple matching), to collect information about a museum of technology in other countries (ICT). To test/consolidate vocabulary and grammar learnt through the unit, to practice every day English.",
  },
  {
    hafta: 40,
    konu: "Going Online",
    icerik: "Values D: Cooperation · Public Speaking Skills D · CLIL D: Art & Design: Art Movements of the 20th Century",
    hedef:
      "To enhance critical thinking and collaborative skills through group projects and discussions on art and cooperation. To learn and use key vocabulary related to technological advancements and digital tools and give presentation about a new piece of technology (ICT). To read for specific information (multiple matching), to collect information about another art movement of the 20th century and prepare a presentation (ICT).",
  },
]
