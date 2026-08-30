// Comprehensive Terms of Service & Privacy Policy Data for CattleSense
export const TERMS_OF_SERVICE_DATA = {
  lastUpdated: "August 28, 2026",
  effectiveDate: "August 28, 2026",
  version: "2.4.0",
  sections: [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms & Eligibility",
      badge: "Eligibility",
      content: [
        "Welcome to CattleSense. By registering an account, accessing our web application, or utilizing any of our dairy health diagnostic tools, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service.",
        "CattleSense is designed for smallholder dairy farmers, commercial farm managers, veterinary professionals, agricultural extension officers, and livestock researchers operating within Sri Lanka and globally.",
        "You must be at least 18 years of age or possess the legal authority under applicable local laws to operate a registered dairy farm or represent a livestock enterprise to create an account."
      ]
    },
    {
      id: "ai-disclaimer",
      title: "2. AI Diagnostic Decision-Support & Veterinary Disclaimer",
      badge: "Crucial Medical Notice",
      highlight: true,
      content: [
        "CRITICAL NOTICE: CattleSense employs artificial intelligence (Deep Learning Convolutional Neural Networks, Gradient Boosting Decision Trees, and multimodal clinical fusion) to evaluate cattle health risks, specifically for Mastitis, Foot-and-Mouth Disease (FMD), Lumpy Skin Disease (LSD), and Milk Fever (Hypocalcemia).",
        "Decision-Support Only: The assessments, confidence scores, probability ratings, and preventive guidance provided by CattleSense are designed exclusively as assistive decision-support tools for early on-farm screening.",
        "Not a Replacement for Licensed Veterinarians: CattleSense DOES NOT provide certified veterinary medical diagnoses, nor does it prescribe controlled veterinary drugs. You must always consult a qualified Veterinary Surgeon (registered with the Department of Animal Production & Health - DAPH or Sri Lanka Veterinary Council) before administering injections, antibiotics, or surgical interventions.",
        "Emergency Conditions: If an animal exhibits acute symptoms such as severe recumbency, high fever exceeding 104°F, respiratory failure, or extreme udder inflammation, seek immediate emergency veterinary assistance using the numbers listed in our Guidance section."
      ]
    },
    {
      id: "user-responsibilities",
      title: "3. User Responsibilities & Account Security",
      badge: "Farmer Responsibilities",
      content: [
        "Accurate Farm Information: You agree to provide accurate, current, and complete details regarding your name, contact phone number, farm location (Province, District, DS/GN Division), and registered cattle count.",
        "Image & Symptom Quality: The diagnostic accuracy of CattleSense relies on clear, well-lit photography of teats, udder skin, mouth, hooves, or lesions, alongside truthful clinical sign reporting. Uploading obscured, irrelevant, or misleading photos may cause inaccurate AI predictions.",
        "Credential Safeguarding: You are responsible for maintaining the confidentiality of your mobile login and password. Any actions taken under your account credentials are your sole responsibility. Notify CattleSense immediately if you suspect unauthorized access."
      ]
    },
    {
      id: "data-ownership",
      title: "4. Herd Data & Milk Logging Ownership",
      badge: "Data Rights",
      content: [
        "Farmer Ownership: You retain 100% full legal ownership of your individual herd records, ear tag registrations, daily milk yield logs, cow pedigree data, and uploaded photographs.",
        "Platform License: By submitting records to CattleSense, you grant us a non-exclusive, worldwide, royalty-free license to store, process, analyze, and visualize your herd data to provide you with yield analytics, lactation tracking, health alerts, and disease progression charts.",
        "Data Export: You maintain the right to view, edit, update, or export your farm milk logs and cow medical histories at any time through your dashboard."
      ]
    },
    {
      id: "third-party",
      title: "5. Veterinary Directory & Partner Resources",
      badge: "Third Parties",
      content: [
        "Government & Private Vet Listings: CattleSense facilitates rapid discovery of regional Veterinary Surgeons (VS offices) and DAPH extension centers for the convenience of farmers. We do not charge commissions or endorse specific commercial clinics.",
        "Supplies & Dairy Partners: Any featured nutrition supplements, automated milking machinery, or teat hygiene supplies displayed in partner spotlights are provided by independent third parties. Farmers are encouraged to verify specifications directly with suppliers."
      ]
    },
    {
      id: "availability",
      title: "6. Platform Availability, Updates & Offline Caching",
      badge: "Service Level",
      content: [
        "Uptime Objective: We strive to provide 99.9% platform availability. However, occasional system maintenance, cloud updates, or telecommunication outages may occur.",
        "Feature Evolution: CattleSense continuously upgrades AI model weights and introduces new disease detection algorithms. We reserve the right to modify, enhance, or discontinue specific software features with reasonable prior notification.",
        "Offline Best Practices: Critical emergency vet contacts and first-aid protocols on the Guidance page are cached for offline availability whenever network connectivity is interrupted."
      ]
    },
    {
      id: "liability",
      title: "7. Limitation of Liability",
      badge: "Liability",
      content: [
        "To the maximum extent permitted under Sri Lankan and international law, CattleSense, its developers, research contributors, and affiliates shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from:",
        "• Unforeseen cattle mortality, disease complications, or reduced milk yield.",
        "• Delayed veterinary intervention resulting from farmer reliance solely on AI screening scores.",
        "• Inaccurate input data, poorly captured photographs, or telecommunications latency.",
        "Our total aggregate liability under these terms is strictly limited to the amount paid by you (if any) to access CattleSense services during the preceding twelve months."
      ]
    },
    {
      id: "governing-law",
      title: "8. Governing Law & Dispute Resolution",
      badge: "Legal Jurisdiction",
      content: [
        "These Terms of Service are governed by and construed in accordance with the laws of the Democratic Socialist Republic of Sri Lanka.",
        "Any disputes arising from or relating to the use of CattleSense shall first be submitted to good-faith mediation. If unresolved, disputes shall be subject to the exclusive jurisdiction of the competent courts of Sri Lanka."
      ]
    },
    {
      id: "contact",
      title: "9. Official Contact & Support",
      badge: "Support",
      content: [
        "If you have any questions, feedback, or legal inquiries regarding these Terms of Service, please reach out to our dedicated farm support desk:",
        "• Email: support@cattlesense.lk / contact@cattlesense.lk",
        "• Farm Hotline: +94 (11) 234-5678 / +94 (77) 123-4567",
        "• Address: CattleSense Smart Health Project, Department of Computer Science & Engineering / Agriculture, Sri Lanka."
      ]
    }
  ]
};

export const PRIVACY_POLICY_DATA = {
  lastUpdated: "August 28, 2026",
  effectiveDate: "August 28, 2026",
  version: "2.4.0",
  sections: [
    {
      id: "collection",
      title: "1. Information We Collect",
      badge: "Data Collection",
      content: [
        "We collect only the minimum required information necessary to deliver accurate cattle disease detection, lactation monitoring, and farm management services:",
        "A. Personal & Contact Information: Your full name, mobile telephone number, and optional email address used for account authentication, password recovery (OTP verification), and critical disease alerts.",
        "B. Farm Profile & Location Data: Registered farm name, Province, District, DS Division, GN Division, farm address, total herd count, and farming experience level. Location details ensure climate-relevant disease risk modeling (e.g. wet-zone vs. dry-zone epidemiological patterns).",
        "C. Cattle Records & Health Diagnostics: Individual cow ear tags/names, breed, age, lactation status, uploaded disease inspection photos (udders, teats, skin nodules, oral cavity), clinical symptoms selected, and daily milk yield volume logs.",
        "D. Technical Session Data: Encrypted password hashes (bcrypt with 10 salt rounds), secure JSON Web Tokens (JWT), browser type, and operating system metadata for authentication security."
      ]
    },
    {
      id: "usage",
      title: "2. How We Use Collected Data",
      badge: "Purpose",
      content: [
        "CattleSense utilizes your data strictly for legitimate dairy management purposes:",
        "• Disease Inference & Risk Scoring: Feeding uploaded photos and symptoms to dedicated AI models to compute disease probabilities for Mastitis, FMD, LSD, and Milk Fever.",
        "• Herd Analytics & Trend Reports: Generating visual charts for daily milk yield fluctuations, lactation trends, and individual cow health histories.",
        "• Security & Verification: Sending 6-digit OTP verification codes to your registered email for password recovery.",
        "• AI Model Optimization: Continuous fine-tuning of machine learning algorithms on anonymized cattle images to enhance diagnostic precision for Sri Lankan dairy breeds."
      ]
    },
    {
      id: "security",
      title: "3. Data Security & Storage Standards",
      badge: "Enterprise Security",
      highlight: true,
      content: [
        "We implement robust technical and organizational security protocols to safeguard your farm data against unauthorized access, alteration, or disclosure:",
        "• Password Cryptography: Passwords are NEVER stored in plaintext. All credentials are encrypted using industry-standard bcrypt hashing algorithms.",
        "• Session Tokens: All API requests are authenticated via secure, stateless JSON Web Tokens (JWT) with automatic expiration.",
        "• Database Isolation: Strict multi-tenant row-level access controls guarantee that your cow records and yield logs are accessible only by your authenticated farm account.",
        "• Encrypted Transmission: All web traffic is transmitted via TLS 1.3 / HTTPS encryption."
      ]
    },
    {
      id: "sharing",
      title: "4. Third-Party Sharing & Zero-Sale Guarantee",
      badge: "Zero-Sale Policy",
      content: [
        "ZERO-SALE GUARANTEE: CattleSense NEVER sells, rents, monetizes, or trades your personal information, farm yield records, or cow photographs to third-party commercial advertisers.",
        "Limited Authorized Disclosures occur only in the following controlled circumstances:",
        "• Veterinary Collaboration (Farmer-Initiated): When you choose to share a diagnostic report or emergency record directly with your local veterinary surgeon.",
        "• Anonymized Agricultural Research: Aggregated, de-identified epidemiological statistics (e.g. regional prevalence rates of Mastitis without farm names or GPS coordinates) may be shared with the DAPH or university research bodies to support national livestock disease prevention.",
        "• Legal Compliance: In the rare event required by enforceable court orders or national biosecurity mandates."
      ]
    },
    {
      id: "rights",
      title: "5. Farmer Data Rights & Control",
      badge: "Your Rights",
      content: [
        "Under our privacy framework, every registered farmer enjoys the following rights:",
        "• Right of Access: View all personal details, registered cattle, and milk logs stored in your profile.",
        "• Right to Rectification: Correct, update, or edit any inaccurate farm information or cow details at any time.",
        "• Right to Data Portability: Export your historical milk production data and medical records for farm accounting or loan applications.",
        "• Right to Erasure (Right to be Forgotten): Request complete deletion of your account and associated herd records by contacting support@cattlesense.lk."
      ]
    },
    {
      id: "cookies",
      title: "6. Cookies & Local Storage",
      badge: "Storage",
      content: [
        "CattleSense utilizes browser local storage and essential session cookies solely for:",
        "• Preserving your active login session (`cattlesense_token`).",
        "• Remembering your theme preference (Dark Mode / Light Mode).",
        "• Remembering your preferred language (English / Sinhala).",
        "We do NOT use invasive cross-site advertising trackers or third-party behavioral profiling cookies."
      ]
    },
    {
      id: "officer",
      title: "7. Data Protection Officer & Privacy Inquiries",
      badge: "Contact DPO",
      content: [
        "For any privacy-related requests, questions regarding data handling, or to exercise your data rights, please contact our Data Protection Officer:",
        "• Data Protection Office: privacy@cattlesense.lk",
        "• Physical Mail: CattleSense Privacy Team, Department of Agriculture & Computer Science, Sri Lanka.",
        "• Response Time: We respond to all formal privacy requests within 2 business days."
      ]
    }
  ]
};
