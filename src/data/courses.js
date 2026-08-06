// Advanced exam-prep courses. These are revision/CPD aids aligned to the subject
// areas of recognised UK frameworks — NOT accredited courses or certification.
export const COURSE_DISCLAIMER =
  "Exam-preparation and revision support aligned to these subject areas. This is not an accredited course and not a substitute for registered training, assessment or certification (e.g. Gas Safe/ACS, City & Guilds, NVQ, MCS, CMI/ILM). Always check current regulations and your awarding body.";

export const COURSES = [
  {
    id: "gas", title: "Gas Engineering", emoji: "🔥", grad: "linear-gradient(160deg,#FF8A47,#F2613A)",
    align: "Aligned to domestic gas / ACS topic areas.",
    modules: [
      "Gas safety legislation (GSIUR)", "Combustion & flue gas analysis", "Gas rates & operating pressures",
      "Pipework sizing & tightness (soundness) testing", "Ventilation requirements", "Flueing & flue checks",
      "Appliance servicing", "Unsafe situations & RIDDOR", "Carbon monoxide awareness",
    ],
  },
  {
    id: "electrical", title: "Electrical Engineering", emoji: "⚡", grad: "linear-gradient(160deg,#4DA6FF,#2B80D6)",
    align: "Aligned to BS 7671 (18th Edition) installation topics.",
    modules: [
      "BS 7671 fundamentals", "Circuit design basics", "Cable sizing & current-carrying capacity",
      "Protective devices & discrimination", "Earthing & bonding", "RCDs & additional protection",
      "Initial verification, inspection & testing", "Fault protection", "Three-phase systems", "EV charging installations",
    ],
  },
  {
    id: "renewable", title: "Renewable Engineering", emoji: "🌱", grad: "linear-gradient(160deg,#3FD0B6,#159A83)",
    align: "Aligned to renewables / MCS topic areas.",
    modules: [
      "Solar PV fundamentals", "PV system design & MCS", "Inverters & DC/AC conversion", "Battery storage",
      "Heat pumps (ASHP & GSHP)", "Solar thermal", "Wind energy basics", "Grid connection (G98/G99)",
      "Energy efficiency & SAP", "Sustainability & net zero",
    ],
  },
  {
    id: "business", title: "Business Management", emoji: "📈", grad: "linear-gradient(160deg,#A98BE8,#7C5FD0)",
    align: "Aligned to management & leadership topic areas (CPD).",
    modules: [
      "Leadership & management styles", "Strategy: SWOT & PESTLE", "Finance fundamentals", "Budgeting & cash flow",
      "Marketing essentials", "Operations & project management", "People & HR basics", "Business planning",
      "KPIs & performance", "Change management & ethics",
    ],
  },
  {
    id: "plumbing", title: "Plumbing & Heating", emoji: "🔧", grad: "linear-gradient(160deg,#5BC0EB,#2A9DC4)",
    align: "Aligned to domestic plumbing & heating NVQ/Level 2–3 topic areas.",
    modules: [
      "Water regulations & bylaws", "Pipework materials & jointing", "Hot & cold water systems",
      "Central heating system types", "Boilers & controls", "Drainage & waste", "Sanitation & fittings",
      "Pressure & flow", "Fault finding & maintenance", "Health & safety on site",
    ],
  },
  {
    id: "it", title: "IT & Computing", emoji: "💻", grad: "linear-gradient(160deg,#7C8BFF,#4F5BD5)",
    align: "Aligned to CompTIA A+ / GCSE Computer Science topic areas.",
    modules: [
      "Computer hardware & components", "Operating systems", "Networking fundamentals", "IP addressing & DNS",
      "Cyber security basics", "Data & storage", "Cloud computing", "Troubleshooting methodology",
      "Binary, hex & data representation", "Professional conduct & support",
    ],
  },
  {
    id: "coding", title: "Coding with Python", emoji: "🐍", grad: "linear-gradient(160deg,#FFD66B,#F2A33A)",
    align: "Aligned to introductory programming & GCSE/A-level computing.",
    modules: [
      "Variables & data types", "Input, output & strings", "Conditionals (if/else)", "Loops (for/while)",
      "Lists & dictionaries", "Functions", "Errors & debugging", "Files & data", "Algorithms & logic",
      "Mini-projects",
    ],
  },
  {
    id: "driving", title: "Driving Theory (DVSA)", emoji: "🚗", grad: "linear-gradient(160deg,#7ED957,#46B14B)",
    align: "Aligned to the DVSA car theory test topic areas (UK).",
    modules: [
      "Alertness & attitude", "Safety & your vehicle", "Safety margins", "Hazard awareness",
      "Vulnerable road users", "Road & traffic signs", "Rules of the road", "Motorway driving",
      "Documents & incidents", "Eco-safe driving",
    ],
  },
  {
    id: "firstaid", title: "First Aid & Safety", emoji: "🩹", grad: "linear-gradient(160deg,#FF8FA3,#E5556F)",
    align: "Aligned to emergency first aid at work / HSE topic areas. Not a substitute for hands-on certified training.",
    modules: [
      "Primary survey (DR ABC)", "CPR & defibrillators (AED)", "Recovery position", "Choking",
      "Bleeding & wounds", "Shock", "Burns & scalds", "Fractures & sprains", "Common workplace risks", "Records & RIDDOR",
    ],
  },
  {
    id: "accounting", title: "Bookkeeping & Accounting", emoji: "📊", grad: "linear-gradient(160deg,#9AD0C2,#46998A)",
    align: "Aligned to AAT Level 2–3 bookkeeping topic areas.",
    modules: [
      "Double-entry bookkeeping", "Debits, credits & the trial balance", "VAT basics", "Sales & purchase ledgers",
      "Bank reconciliation", "Petty cash", "Payroll basics", "Financial statements", "Accruals & prepayments", "Ethics for accounting",
    ],
  },
  {
    id: "ielts", title: "English for IELTS", emoji: "🌍", grad: "linear-gradient(160deg,#B69CFF,#7C5FD0)",
    align: "Aligned to IELTS Academic & General topic areas (global English proficiency).",
    modules: [
      "Listening strategies", "Reading skills & skimming", "Academic writing Task 1", "Writing Task 2 essays",
      "Speaking fluency", "Grammar accuracy", "Vocabulary range", "Paraphrasing", "Time management", "Band descriptors",
    ],
  },
];
