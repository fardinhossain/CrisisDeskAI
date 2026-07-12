import { PrismaClient } from "@prisma/client";
import { Category, Urgency, ReportStatus, Language } from "../src/constants/enums";

const prisma = new PrismaClient();

async function main() {
  // eslint-disable-next-line no-console
  console.log("🌱 Starting CrisisDesk AI database seed...");

  // Clean existing data for clean demo runs
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();

  // 1. Create Report A (Target for near-duplicate pair)
  const fireReportA = await prisma.report.create({
    data: {
      description: "Large fire at Mirpur 10 market, spreading fast to nearby clothing stalls!",
      location: "Mirpur 10 Circle, Dhaka",
      category: Category.fire,
      urgency: Urgency.critical,
      status: ReportStatus.pending,
      language: Language.en,
      summary: "Severe fire incident reported at Mirpur 10 market affecting commercial stalls.",
      confidence: 0.95,
      aiProvider: "gemini",
      latitude: 23.8069,
      longitude: 90.3687,
      formattedAddress: "Mirpur 10, Dhaka, Bangladesh",
      geocodeProvider: "nominatim",
    },
  });

  // 2. Create Report B (Near-duplicate of Report A)
  await prisma.report.create({
    data: {
      description: "Massive blaze broke out in Mirpur 10 market shops and expanding quickly!",
      location: "Mirpur-10, Dhaka",
      category: Category.fire,
      urgency: Urgency.critical,
      status: ReportStatus.pending,
      language: Language.en,
      summary: "Major commercial fire in progress at Mirpur 10 shops.",
      confidence: 0.92,
      aiProvider: "gemini",
      latitude: 23.807,
      longitude: 90.3688,
      formattedAddress: "Mirpur 10 Circle, Dhaka, Bangladesh",
      geocodeProvider: "nominatim",
      possibleDuplicate: true,
      matchedReportId: fireReportA.id,
    },
  });

  // 3. Create ~13 varied emergency reports covering Bangla & English across all categories
  const seedReports = [
    {
      description: "মিরপুর ১১ নম্বর বাস স্ট্যান্ডের কাছে গ্যাস লাইনে ভয়াবহ বিস্ফোরণ ও আগুন লেগেছে। দ্রুত ফায়ার সার্ভিস দরকার!",
      location: "Mirpur 11 Bus Stand, Dhaka",
      category: Category.fire,
      urgency: Urgency.critical,
      status: ReportStatus.assigned,
      language: Language.bn,
      summary: "Severe gas pipeline explosion and fire near Mirpur 11 Bus Stand requiring urgent fire brigade response.",
      confidence: 0.98,
      aiProvider: "gemini",
      latitude: 23.818,
      longitude: 90.368,
    },
    {
      description: "গুলশান ২ নম্বর গোলচত্বরে দুটি গাড়ির মুখোমুখি সংঘর্ষ, বেশ কয়েকজন গুরুতর আহত। অ্যাম্বুলেন্স প্রয়োজন।",
      location: "Gulshan 2 Circle, Dhaka",
      category: Category.accident,
      urgency: Urgency.high,
      status: ReportStatus.in_review,
      language: Language.bn,
      summary: "Head-on collision between two vehicles at Gulshan 2 Circle with multiple serious injuries requiring ambulances.",
      confidence: 0.91,
      aiProvider: "gemini",
      latitude: 23.793,
      longitude: 90.413,
    },
    {
      description: "Heavy flash floods in Sylhet upazila due to continuous torrential rain. Hundreds of families stranded without drinking water.",
      location: "Companiganj, Sylhet",
      category: Category.flood,
      urgency: Urgency.critical,
      status: ReportStatus.assigned,
      language: Language.en,
      summary: "Severe flash flooding in Sylhet upazila stranding hundreds of families and threatening clean drinking water access.",
      confidence: 0.96,
      aiProvider: "gemini",
      latitude: 25.083,
      longitude: 91.833,
      weatherContext: "Continuous heavy rain over 24h (85mm accumulation)",
      weatherAdjusted: true,
    },
    {
      description: "সিলেটের জৈন্তাপুরে সুরমা নদীর পানি বিপদসীমার উপর দিয়ে প্রবাহিত হচ্ছে, বাঁধ ভেঙে গ্রামের পর গ্রাম প্লাবিত।",
      location: "Jaintiapur, Sylhet",
      category: Category.flood,
      urgency: Urgency.critical,
      status: ReportStatus.pending,
      language: Language.bn,
      summary: "Surma river overflowing danger mark in Jaintiapur, Sylhet, breaching embankments and submerging villages.",
      confidence: 0.94,
      aiProvider: "groq",
      latitude: 25.133,
      longitude: 92.116,
      weatherContext: "Severe thunderstorm with 110mm rainfall in 24h",
      weatherAdjusted: true,
    },
    {
      description: "High voltage electricity transformer sparked and exploded in Dhanmondi Road 8A. Power out across three blocks.",
      location: "Dhanmondi Road 8A, Dhaka",
      category: Category.utility,
      urgency: Urgency.high,
      status: ReportStatus.resolved,
      language: Language.en,
      summary: "Transformer explosion and major power outage across three residential blocks on Dhanmondi Road 8A.",
      confidence: 0.89,
      aiProvider: "gemini",
      latitude: 23.748,
      longitude: 90.375,
    },
    {
      description: "ধানমন্ডি লেকের পাড়ে ছিনতাইকারীর কবলে পড়ে একজন পথচারী ছুরিকাঘাতে আহত হয়েছেন। দ্রুত পুলিশ ও চিকিৎসা প্রয়োজন।",
      location: "Dhanmondi Lake Park, Dhaka",
      category: Category.crime,
      urgency: Urgency.high,
      status: ReportStatus.assigned,
      language: Language.bn,
      summary: "Pedestrian stabbed during a mugging near Dhanmondi Lake requiring immediate police intervention and medical aid.",
      confidence: 0.88,
      aiProvider: "gemini",
      latitude: 23.746,
      longitude: 90.378,
    },
    {
      description: "Main water supply line burst near Banani Road 11 intersection, flooding the street and disrupting traffic.",
      location: "Banani Road 11, Dhaka",
      category: Category.utility,
      urgency: Urgency.medium,
      status: ReportStatus.pending,
      language: Language.en,
      summary: "Major water pipeline rupture flooding Banani Road 11 intersection and causing traffic bottlenecks.",
      confidence: 0.85,
      aiProvider: "gemini",
      latitude: 23.791,
      longitude: 90.404,
    },
    {
      description: "চাঞ্চল্যকর ডাকাতির প্রস্তুতি চলছে উত্তরা ১০ নম্বর সেক্টরের একটি পরিত্যক্ত ভবনে, সশস্ত্র দল দেখা গেছে।",
      location: "Sector 10, Uttara, Dhaka",
      category: Category.crime,
      urgency: Urgency.high,
      status: ReportStatus.in_review,
      language: Language.bn,
      summary: "Armed group spotted preparing for a major robbery inside an abandoned building in Uttara Sector 10.",
      confidence: 0.87,
      aiProvider: "openrouter",
      latitude: 23.876,
      longitude: 90.392,
    },
    {
      description: "Severe dengue fever outbreak in Motijheel bank colony with 15 patients needing urgent ICU beds and blood transfusions.",
      location: "Bank Colony, Motijheel, Dhaka",
      category: Category.medical,
      urgency: Urgency.critical,
      status: ReportStatus.assigned,
      language: Language.en,
      summary: "Cluster of severe dengue cases requiring emergency hospital admissions and blood transfusions in Motijheel.",
      confidence: 0.93,
      aiProvider: "gemini",
      latitude: 23.733,
      longitude: 90.418,
    },
    {
      description: "Major bridge approach road partially collapsed near Chittagong Port entrance after heavy container truck traffic.",
      location: "Chittagong Port Approach Road, Chattogram",
      category: Category.infrastructure,
      urgency: Urgency.high,
      status: ReportStatus.pending,
      language: Language.en,
      summary: "Partial collapse of approach road near Chittagong Port disrupting heavy commercial transport.",
      confidence: 0.9,
      aiProvider: "gemini",
      latitude: 22.316,
      longitude: 91.799,
    },
    {
      description: "চট্টগ্রামের আগ্রাবাদে ড্রেনের ম্যানহোলের ঢাকনা না থাকায় একজন শিশু পড়ে গেছে। ফায়ার সার্ভিসের উদ্ধারকারী দল দরকার।",
      location: "Agrabad Commercial Area, Chattogram",
      category: Category.accident,
      urgency: Urgency.critical,
      status: ReportStatus.resolved,
      language: Language.bn,
      summary: "Child fell into an open drainage manhole in Agrabad, Chattogram requiring rescue squad.",
      confidence: 0.97,
      aiProvider: "gemini",
      latitude: 22.324,
      longitude: 91.812,
    },
    {
      description: "Broken traffic signal and severe gridlock at Farmgate intersection blocking two emergency ambulances for over 45 minutes.",
      location: "Farmgate Intersection, Dhaka",
      category: Category.public_service,
      urgency: Urgency.medium,
      status: ReportStatus.pending,
      language: Language.en,
      summary: "Traffic signal failure causing severe gridlock at Farmgate and trapping emergency medical vehicles.",
      confidence: 0.84,
      aiProvider: "gemini",
      latitude: 23.758,
      longitude: 90.389,
    },
    {
      description: "রাজশাহীর সাহেব বাজারে বৈদ্যুতিক শর্ট সার্কিট থেকে ওষুধের দোকানে আগুন, পাশের ভবনগুলোতে ছড়িয়ে পড়ার আশঙ্কা।",
      location: "Saheb Bazar, Rajshahi",
      category: Category.fire,
      urgency: Urgency.high,
      status: ReportStatus.assigned,
      language: Language.bn,
      summary: "Pharmacy fire caused by electrical short-circuit at Saheb Bazar, Rajshahi with high risk of spreading.",
      confidence: 0.91,
      aiProvider: "gemini",
      latitude: 24.366,
      longitude: 88.601,
    },
  ];

  for (const r of seedReports) {
    await prisma.report.create({ data: r });
  }

  const count = await prisma.report.count();
  // eslint-disable-next-line no-console
  console.log(`✅ Seed complete! Successfully created ${count} reports in the database.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
