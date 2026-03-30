/**
 * LEVENT COLLEGE IB PROGRAMME
 * ARTIFICIAL INTELLIGENCE IB ANNUAL CURRICULUM PROGRAM
 * Programme Duration: 40 weeks
 * Kaynak: pdf/yapay-zeka-mufredat.pdf
 *
 * Sütunlar: Week | Subject | Objective | Practice/Assignment + Achievements
 */

import type { MufredatHafta } from "./ingilizce"
export type { MufredatHafta }

export const YAPAY_ZEKA_MUFREDAT: MufredatHafta[] = [
  // ── SEPTEMBER 2024 ──────────────────────────────────────────────────
  {
    ay: "SEPTEMBER 2024",
    hafta: 1,
    konu: "Course Introduction & What is AI?",
    icerik: "AI example videos, ChatGPT experience",
    hedef: "Recognizes AI concepts and explains different usage areas with examples.",
  },
  {
    hafta: 2,
    konu: "Python Installation & Environments",
    icerik: 'First "Hello World" code',
    hedef: "Runs the first basic program using the Python environment.",
  },
  {
    hafta: 3,
    konu: "Python Basics 1 — Variables & Data Types",
    icerik: "Simple calculator program",
    hedef: "Uses variables and data types for basic operations.",
  },
  {
    hafta: 4,
    konu: "Python Basics 2 — Decision Structures (if/else)",
    icerik: "Average grade calculator code",
    hedef: "Writes different codes using decision structures.",
  },

  // ── OCTOBER 2024 ────────────────────────────────────────────────────
  {
    ay: "OCTOBER 2024",
    hafta: 5,
    konu: "Loops — For and While",
    icerik: "Code that finds a random number between 1–100",
    hedef: "Automates repetitive operations using loops.",
  },
  {
    hafta: 6,
    konu: "Functions — Defining Functions & Parameters",
    icerik: "Fahrenheit ↔ Celsius converter",
    hedef: "Creates reusable modules by writing functions.",
  },
  {
    hafta: 7,
    konu: "Lists & Arrays",
    icerik: "Classroom list application",
    hedef: "Adds, deletes, and accesses items in lists.",
  },
  {
    hafta: 8,
    konu: "Dictionaries & Data Structures — Key-Value Logic",
    icerik: "Student information storage",
    hedef: "Uses dictionary structures to store information.",
  },

  // ── NOVEMBER 2024 ───────────────────────────────────────────────────
  {
    ay: "NOVEMBER 2024",
    hafta: 9,
    konu: "File Reading / Writing — TXT/CSV File Operations",
    icerik: "System that saves notes to a file",
    hedef: "Opens, reads, writes, and saves files.",
  },
  {
    hafta: 10,
    konu: "Python Libraries — math, random, datetime",
    icerik: "Number guessing game",
    hedef: "Applies Python libraries (math, random, datetime).",
  },
  {
    hafta: 11,
    konu: "Introduction to NumPy — Array Operations",
    icerik: "Random data generation",
    hedef: "Uses NumPy to process numerical data.",
  },
  {
    hafta: 12,
    konu: "Introduction to Pandas — Reading & Filtering Data",
    icerik: "Student grades analysis with CSV",
    hedef: "Processes and filters data with Pandas.",
  },

  // ── DECEMBER 2024 ───────────────────────────────────────────────────
  {
    ay: "DECEMBER 2024",
    hafta: 13,
    konu: "Introduction to Matplotlib — Plotting Graphs",
    icerik: "Classroom distribution chart",
    hedef: "Visualizes data with Matplotlib.",
  },
  {
    hafta: 14,
    konu: "AI Logic — Basic Machine Learning Concepts",
    icerik: "Model, dataset concept",
    hedef: "Explains the logic of AI and the model concept.",
  },
  {
    hafta: 15,
    konu: "Data Preprocessing — Missing Data & Normalization",
    icerik: "Data cleaning with Pandas",
    hedef: "Cleans datasets and applies normalization.",
  },
  {
    hafta: 16,
    konu: "Scikit-learn Introduction — Simple ML Algorithms",
    icerik: "Installing scikit-learn",
    hedef: "Runs simple ML models with scikit-learn.",
  },

  // ── JANUARY 2025 ────────────────────────────────────────────────────
  {
    ay: "JANUARY 2025",
    hafta: 17,
    konu: "Regression Analysis — Linear Regression Logic",
    icerik: "House price prediction example",
    hedef: "Explains and applies linear regression logic.",
  },
  {
    hafta: 18,
    konu: "Classification Algorithms 1 — KNN Algorithm",
    icerik: "Handwriting recognition (MNIST subset)",
    hedef: "Classifies data using the KNN algorithm.",
  },
  {
    hafta: 19,
    konu: "Classification Algorithms 2 — Decision Tree & Random Forest",
    icerik: "Fruit classification",
    hedef: "Classifies with Decision Tree and Random Forest.",
  },
  {
    hafta: 20,
    konu: "Model Evaluation — Accuracy, Precision, Recall",
    icerik: "Measuring model performance",
    hedef: "Measures model accuracy and performance.",
  },

  // ── FEBRUARY 2025 ───────────────────────────────────────────────────
  {
    ay: "FEBRUARY 2025",
    hafta: 21,
    konu: "Image Processing + IoU — OpenCV Basics",
    icerik: "Image upload, grayscale, IoU calculation",
    hedef: "Understands image processing and IoU/mAP concepts.",
  },
  {
    hafta: 22,
    konu: "Object Detection & Display — Pre-trained YOLO/SSD Model",
    icerik: "Dog-cat detection demo",
    hedef: "Interprets outputs of pre-trained models like YOLO/SSD.",
  },
  {
    hafta: 23,
    konu: "Natural Language Processing (NLP) Intro — Text Processing",
    icerik: "Word counter app",
    hedef: "Learns text processing and NLP basics.",
  },
  {
    hafta: 24,
    konu: "NLP & Simple Chatbot — if/else Chatbot",
    icerik: "Q&A chatbot system",
    hedef: "Writes a basic chatbot.",
  },

  // ── MARCH 2025 ──────────────────────────────────────────────────────
  {
    ay: "MARCH 2025",
    hafta: 25,
    konu: "AI Ethics & Safety — Data Privacy & Algorithm Bias",
    icerik: "Group discussion",
    hedef: "Discusses AI ethics and safety issues.",
  },
  {
    hafta: 26,
    konu: "Project Preparation 1 — Defining Project Scope",
    icerik: "Selecting 3–5 projects, project plan",
    hedef: "Defines project scope.",
  },
  {
    hafta: 27,
    konu: "Project Preparation 2 — Data Collection & Labeling",
    icerik: "LabelImg/Roboflow bounding box labeling",
    hedef: "Collects data and performs labeling.",
  },
  {
    hafta: 28,
    konu: "Project Application 1 — Transfer Learning with YOLO/SSD",
    icerik: "Training first model on Colab",
    hedef: "Applies transfer learning with YOLO/SSD.",
  },

  // ── APRIL 2025 ──────────────────────────────────────────────────────
  {
    ay: "APRIL 2025",
    hafta: 29,
    konu: "Project Application 2 — Model Evaluation",
    icerik: "Calculating mAP50/mAP95",
    hedef: "Evaluates models with mAP.",
  },
  {
    hafta: 30,
    konu: "Project Application 3 — Improvement Techniques",
    icerik: "Data augmentation, parameter tuning",
    hedef: "Improves model with data augmentation and tuning.",
  },
  {
    hafta: 31,
    konu: "Project Application 4 — User Interface Development",
    icerik: "Tkinter/Streamlit lite inference UI",
    hedef: "Builds a basic user interface.",
  },
  {
    hafta: 32,
    konu: "Project Completion — Final Tests & Error Fixing",
    icerik: "Project file organization",
    hedef: "Finalizes and tests project.",
  },

  // ── MAY 2025 ────────────────────────────────────────────────────────
  {
    ay: "MAY 2025",
    hafta: 33,
    konu: "Project Presentation Preparation — Slide & Report Creation",
    icerik: "PowerPoint/report writing",
    hedef: "Prepares project report and slides.",
  },
  {
    hafta: 34,
    konu: "Project Presentations 1 — Presentation Skills",
    icerik: "Group presentations",
    hedef: "Presents project results.",
  },
  {
    hafta: 35,
    konu: "Project Presentations 2 — Evaluating Projects",
    icerik: "Class feedback",
    hedef: "Evaluates peers' projects.",
  },
  {
    hafta: 36,
    konu: "AI and the Future — AI's Role in Business World",
    icerik: "Article analysis",
    hedef: "Analyzes AI applications in real life.",
  },

  // ── JUNE 2025 ───────────────────────────────────────────────────────
  {
    ay: "JUNE 2025",
    hafta: 37,
    konu: "Advanced Python Topics — Decorator & Generator Logic",
    icerik: "Examples with small projects",
    hedef: "Learns advanced topics in Python (decorator, generator).",
  },
  {
    hafta: 38,
    konu: "Deep Dive into AI Libraries — TensorFlow & PyTorch Intro",
    icerik: "Simple neural network",
    hedef: "Runs a simple NN with TensorFlow/PyTorch.",
  },
  {
    hafta: 39,
    konu: "Year-End Review — All Topics",
    icerik: "Short quiz and practice",
    hedef: "Reviews yearly achievements.",
  },
  {
    hafta: 40,
    konu: "Year-End Evaluation — Portfolio Submission",
    icerik: "Project files",
    hedef: "Submits project portfolio and receives evaluation feedback.",
  },
]
