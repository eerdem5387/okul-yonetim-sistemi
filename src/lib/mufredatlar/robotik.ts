/**
 * LEVENT COLLEGE IB PROGRAMME
 * ELECTRONICS & ROBOTICS CLUB ANNUAL CURRICULUM
 * Programme Duration: 40 weeks
 * Kaynak: pdf/robotik-mufredat.pdf
 *
 * Not: Bu müfredat Subject | Objective formatındadır (Content sütunu yoktur).
 */

import type { MufredatHafta } from "./ingilizce"
export type { MufredatHafta }

export const ROBOTIK_MUFREDAT: MufredatHafta[] = [
  // ── SEPTEMBER 2024 ──────────────────────────────────────────────────
  {
    ay: "SEPTEMBER 2024",
    hafta: 1,
    konu: "Project Introduction & Erasmus+ Briefing",
    icerik: "—",
    hedef: "Understands the aim and scope of the project.",
  },
  {
    hafta: 2,
    konu: "Drone Project Timeline & Task Distribution",
    icerik: "—",
    hedef: "Forms teamwork, shares roles, and creates a project plan.",
  },
  {
    hafta: 3,
    konu: "Flight Physics – Thrust, Weight, Direction",
    icerik: "—",
    hedef: "Recognizes the physical forces affecting drone flight.",
  },
  {
    hafta: 4,
    konu: "Types of Multirotors",
    icerik: "—",
    hedef: "Explains multirotor types and their advantages.",
  },

  // ── OCTOBER 2024 ────────────────────────────────────────────────────
  {
    ay: "OCTOBER 2024",
    hafta: 5,
    konu: "Introduction to Electricity",
    icerik: "—",
    hedef: "Explains the concepts of voltage, current, and resistance.",
  },
  {
    hafta: 6,
    konu: "Basic Circuit Setup",
    icerik: "—",
    hedef: "Reads and builds simple circuit diagrams.",
  },
  {
    hafta: 7,
    konu: "Brushless DC Motor (BLDC) Structure",
    icerik: "—",
    hedef: "Explains how motors work.",
  },
  {
    hafta: 8,
    konu: "ESC Control & Connections",
    icerik: "—",
    hedef: "Learns the function of an ESC and connects it correctly.",
  },

  // ── NOVEMBER 2024 ───────────────────────────────────────────────────
  {
    ay: "NOVEMBER 2024",
    hafta: 9,
    konu: "LiPo Battery Features",
    icerik: "—",
    hedef: "Understands battery capacity, C-rating, and cell count.",
  },
  {
    hafta: 10,
    konu: "Battery Safety & Charging",
    icerik: "—",
    hedef: "Applies safe usage and charging procedures.",
  },
  {
    hafta: 11,
    konu: "Pixhawk / Flight Controller Boards",
    icerik: "—",
    hedef: "Identifies flight controller types and their functions.",
  },
  {
    hafta: 12,
    konu: "Loading Pixhawk Firmware",
    icerik: "—",
    hedef: "Learns how to install PX4 / ArduPilot firmware.",
  },

  // ── DECEMBER 2024 ───────────────────────────────────────────────────
  {
    ay: "DECEMBER 2024",
    hafta: 13,
    konu: "ESC Calibration",
    icerik: "—",
    hedef: "Performs ESC calibration using PWM signals.",
  },
  {
    hafta: 14,
    konu: "PWM and Signal Logic",
    icerik: "—",
    hedef: "Understands PWM logic, frequency–duty cycle relationship.",
  },
  {
    hafta: 15,
    konu: "RC Transmitter – Receiver Introduction",
    icerik: "—",
    hedef: "Learns RC system and performs channel pairing.",
  },
  {
    hafta: 16,
    konu: "RC Transmitter Testing",
    icerik: "—",
    hedef: "Monitors and analyzes channel data.",
  },

  // ── JANUARY 2025 ────────────────────────────────────────────────────
  {
    ay: "JANUARY 2025",
    hafta: 17,
    konu: "GPS and GNSS Systems",
    icerik: "—",
    hedef: "Learns the principle of positioning systems.",
  },
  {
    hafta: 18,
    konu: "Connecting Pixhawk with GPS",
    icerik: "—",
    hedef: "Connects GPS module properly to Pixhawk.",
  },
  {
    hafta: 19,
    konu: "Drone Assembly – Beginning",
    icerik: "—",
    hedef: "Starts assembling motor, ESC, and flight controller.",
  },
  {
    hafta: 20,
    konu: "Drone Assembly – Continuation",
    icerik: "—",
    hedef: "Completes wiring and connection checks.",
  },

  // ── FEBRUARY 2025 ───────────────────────────────────────────────────
  {
    ay: "FEBRUARY 2025",
    hafta: 21,
    konu: "QGroundControl Introduction",
    icerik: "—",
    hedef: "Learns the ground control station interface.",
  },
  {
    hafta: 22,
    konu: "Flight Sensor Calibrations (IMU, Compass)",
    icerik: "—",
    hedef: "Performs sensor calibrations.",
  },
  {
    hafta: 23,
    konu: "Flight Simulation",
    icerik: "—",
    hedef: "Tests basic flight scenarios in a simulator.",
  },
  {
    hafta: 24,
    konu: "Real-Time Flight Telemetry",
    icerik: "—",
    hedef: "Learns to monitor real-time flight data.",
  },

  // ── MARCH 2025 ──────────────────────────────────────────────────────
  {
    ay: "MARCH 2025",
    hafta: 25,
    konu: "What is PID? – Fundamentals",
    icerik: "—",
    hedef: "Understands PID control logic.",
  },
  {
    hafta: 26,
    konu: "PID Settings – Pitch/Roll/Yaw",
    icerik: "—",
    hedef: "Performs basic PID adjustments.",
  },
  {
    hafta: 27,
    konu: "MAVLink Protocol Introduction",
    icerik: "—",
    hedef: "Learns what MAVLink is and how it works.",
  },
  {
    hafta: 28,
    konu: "Reading MAVLink Data with Raspberry Pi",
    icerik: "—",
    hedef: "Reads position data from Pixhawk using Raspberry Pi.",
  },

  // ── APRIL 2025 ──────────────────────────────────────────────────────
  {
    ay: "APRIL 2025",
    hafta: 29,
    konu: "UBEC and 5V Power Supply",
    icerik: "—",
    hedef: "Powers Raspberry Pi by stepping down high voltage to 5V.",
  },
  {
    hafta: 30,
    konu: "Installing Raspberry Pi",
    icerik: "—",
    hedef: "Installs operating system and basic setup.",
  },
  {
    hafta: 31,
    konu: "Connecting Pi Camera",
    icerik: "—",
    hedef: "Connects camera and captures video.",
  },
  {
    hafta: 32,
    konu: "Capturing Images with Python",
    icerik: "—",
    hedef: "Processes camera images using OpenCV in Python.",
  },

  // ── MAY 2025 ────────────────────────────────────────────────────────
  {
    ay: "MAY 2025",
    hafta: 33,
    konu: "Drone Test Flights",
    icerik: "—",
    hedef: "Performs test flights safely.",
  },
  {
    hafta: 34,
    konu: "Drone Safety Training",
    icerik: "—",
    hedef: "Applies emergency procedures.",
  },
  {
    hafta: 35,
    konu: "Waypoint (Autonomous Route) Planning",
    icerik: "—",
    hedef: "Plans routes on a mission planner.",
  },
  {
    hafta: 36,
    konu: "Autonomous Flight Task",
    icerik: "—",
    hedef: "Executes autonomous flight on planned route.",
  },

  // ── JUNE 2025 ───────────────────────────────────────────────────────
  {
    ay: "JUNE 2025",
    hafta: 37,
    konu: "Drone Flight Logging & Reporting",
    icerik: "—",
    hedef: "Records and reports flight data.",
  },
  {
    hafta: 38,
    konu: "System Evaluation",
    icerik: "—",
    hedef: "Identifies errors and shortcomings of the drone system.",
  },
  {
    hafta: 39,
    konu: "Presentation & Rehearsal",
    icerik: "—",
    hedef: "Prepares and rehearses project presentation.",
  },
  {
    hafta: 40,
    konu: "Final Demonstration & Exhibition",
    icerik: "—",
    hedef: "Presents drone system in front of an audience.",
  },
]
