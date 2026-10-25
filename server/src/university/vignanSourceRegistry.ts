/**
 * Phase 1 — Comprehensive Official Vignan University Source Registry
 * Tracks canonical source URLs, categories, academic years, verification dates,
 * extracted core facts, and verification tiers for Vadlamudi campus.
 */

export interface SourceRegistryEntry {
  id: string;
  url: string;
  title: string;
  category:
    | 'university_overview'
    | 'administration'
    | 'academic_leadership'
    | 'faculty_directory'
    | 'department_directory'
    | 'courses_specializations'
    | 'placements'
    | 'admissions'
    | 'fees'
    | 'scholarships'
    | 'sanctioned_intake'
    | 'hostels'
    | 'campus_blocks'
    | 'facilities'
    | 'mahotsav'
    | 'cultural_events'
    | 'clubs'
    | 'student_organizations'
    | 'campus_images'
    | 'official_policies';
  campus: 'Vadlamudi';
  academicYear: string;
  publicationDate?: string;
  retrievedDate: string;
  lastVerifiedDate: string;
  sourceType: 'official' | 'secondary' | 'historical' | 'unverified';
  extractedFactsSummary: string[];
  canonicalUrl: string;
  relatedImagesCount: number;
}

export const VIGNAN_SOURCE_REGISTRY: SourceRegistryEntry[] = [
  // 1. Main Website & Overview
  {
    id: 'src_vignan_home',
    url: 'https://www.vignan.ac.in/',
    canonicalUrl: 'https://www.vignan.ac.in/',
    title: "Vignan's Foundation for Science, Technology & Research - Official Portal",
    category: 'university_overview',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    publicationDate: '2025-01-10',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'Deemed-to-be-University established in 2008 under Section 3 of UGC Act 1956',
      'NAAC A+ Accredited with 3.49 CGPA',
      'Total Vadlamudi Campus area: 104 acres in Guntur district, AP',
      'Founder & Chairman: Dr. Lavu Rathaiah',
    ],
    relatedImagesCount: 8,
  },
  // 2. About Us & Identity
  {
    id: 'src_vignan_about',
    url: 'https://www.vignan.ac.in/newvignan/aboutus.php',
    canonicalUrl: 'https://www.vignan.ac.in/newvignan/aboutus.php',
    title: 'About Vignan University - Vision, Mission & Campus Identity',
    category: 'university_overview',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'Institutional vision: Evolve into a center of excellence in science and technology',
      'Autonomous university distinction from adjacent VLITS and affiliated group colleges',
      'Statutory approvals: UGC, AICTE, NBA, ISO 9001:2015',
    ],
    relatedImagesCount: 4,
  },
  // 3. Administration & Governance
  {
    id: 'src_vignan_admin',
    url: 'https://vignan.ac.in/newvignan/administration.php',
    canonicalUrl: 'https://vignan.ac.in/newvignan/administration.php',
    title: 'University Administration, Governance & Statutory Bodies',
    category: 'administration',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'Chancellor: Dr. Pavuluri Subba Rao (Former scientist/ISRO leader & entrepreneur)',
      'Vice-Chancellor: Prof. K. V. Krishna Kishore (In-Charge) / Prof. P. Nagabhushan (Immediate past VC)',
      'Registrar: Prof. P. M. V. Rao',
      'Vice-Chairman: Sri Lavu Sri Krishna Devarayalu (Member of Parliament)',
    ],
    relatedImagesCount: 5,
  },
  // 4. Administrative Directory
  {
    id: 'src_vignan_directory',
    url: 'https://www.vignan.ac.in/newvignan/directory.php',
    canonicalUrl: 'https://www.vignan.ac.in/newvignan/directory.php',
    title: 'Administrative & Statutory Officers Directory',
    category: 'academic_leadership',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'Dean Academics: Prof. N. Veeranjaneyulu',
      'Dean R&D: Prof. G. Srinivasa Rao',
      'Dean Student Affairs: Prof. M. S. S. Rukmini',
      'Controller of Examinations (CoE): Prof. P. L. N. Varma',
      'Dean Training & Placements: Dr. D. Vijay Krishna',
      'Dean Admissions: Dr. B. Nageswara Rao / Prof. K. V. Krishna Kishore',
    ],
    relatedImagesCount: 6,
  },
  // 5. Faculty Directory
  {
    id: 'src_vignan_people',
    url: 'https://www.vignan.ac.in/newvignan/people.php',
    canonicalUrl: 'https://www.vignan.ac.in/newvignan/people.php',
    title: 'University Faculty Directory & Profiles',
    category: 'faculty_directory',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      '500+ full-time teaching faculty across all schools',
      'Over 60% faculty with Ph.D. degrees from IITs, NITs, and reputed state universities',
      'Searchable by department, designation, and research specialization',
    ],
    relatedImagesCount: 12,
  },
  // 6. Departments Directory
  {
    id: 'src_vignan_dept_directory',
    url: 'https://www.vignan.ac.in/newvignan/department.php',
    canonicalUrl: 'https://www.vignan.ac.in/newvignan/department.php',
    title: 'Academic Schools and Departments Directory',
    category: 'department_directory',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'School of Computing and Informatics (SCI)',
      'School of Electrical, Electronics & Communication Engineering (SECE)',
      'School of Mechanical, Civil and Environmental Engineering (SMCE)',
      'School of Applied Sciences & Humanities (SASH)',
      'School of Biotechnology & Pharmaceutical Sciences (SBPS)',
      'School of Management Studies (SMS)',
      'School of Law',
    ],
    relatedImagesCount: 7,
  },
  // 7. Department of Computer Science & Engineering (CSE)
  {
    id: 'src_vignan_cse_dept',
    url: 'https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept1&deptnm=CSE&school=sch3',
    canonicalUrl: 'https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept1&deptnm=CSE&school=sch3',
    title: 'Department of Computer Science and Engineering (CSE)',
    category: 'courses_specializations',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'Dean, School of Computing: Prof. K. V. Krishna Kishore',
      'Head of Department (HoD) CSE: Dr. K. Sujatha / Dr. D. Venkatesulu',
      'Located in U-Block, 2nd Floor',
      'Specializations: Core CSE, AI & ML, Data Science, Cyber Security, CSBS',
      'State-of-the-art computing labs with 1,500+ high-end workstations',
    ],
    relatedImagesCount: 5,
  },
  // 8. Advanced Computer Science & Engineering (ACSE)
  {
    id: 'src_vignan_acse_dept',
    url: 'https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept2&deptnm=ACSE&school=sch3',
    canonicalUrl: 'https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept2&deptnm=ACSE&school=sch3',
    title: 'Department of Advanced Computer Science and Engineering (ACSE)',
    category: 'courses_specializations',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'Head of Department (HoD) ACSE: Dr. B. Premamayudu',
      'AIML Programme Coordinator: Dr. S. V. Phani Kumar',
      'Data Science Programme Coordinator: Dr. N. Tirupathi Rao',
      'Cyber Security Programme Coordinator: Dr. G. Rama Koteswara Rao',
      'Located in U-Block, 3rd & 4th Floors',
    ],
    relatedImagesCount: 4,
  },
  // 9. Placements & Career Guidance
  {
    id: 'src_vignan_placements',
    url: 'https://vignan.ac.in/newvignan/placements.php',
    canonicalUrl: 'https://vignan.ac.in/newvignan/placements.php',
    title: 'Training and Placement Cell - Placement Statistics & Recruiters',
    category: 'placements',
    campus: 'Vadlamudi',
    academicYear: '2023-2024',
    publicationDate: '2024-08-30',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'Reported 2024 Highest Package: ₹44.00 LPA (Amazon & international tech companies)',
      'Reported 2024 Average Package: ₹5.20 LPA to ₹6.20 LPA',
      'Placement rate: Over 85% eligible students placed',
      '1,200+ total job offers in 2024 graduating batch',
      'Key Recruiters: Amazon, Cisco, TCS, Cognizant, Wipro, Accenture, Infosys, Capgemini, HCL, Tech Mahindra, Darwinbox, Hyundai, IBM',
    ],
    relatedImagesCount: 6,
  },
  // 10. Admissions & Entrance Exam (V-SAT)
  {
    id: 'src_vignan_admissions',
    url: 'https://vignan.ac.in/newvignan/admissions.php',
    canonicalUrl: 'https://vignan.ac.in/newvignan/admissions.php',
    title: 'Admissions 2025 - Programmes, Eligibility & V-SAT Admission Route',
    category: 'admissions',
    campus: 'Vadlamudi',
    academicYear: '2025-2026',
    publicationDate: '2025-01-05',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'Admissions via V-SAT (All-India entrance test), JEE Mains, or AP/TS EAPCET',
      'Minimum eligibility for B.Tech: 60% aggregate in 10+2 / Intermediate (MPC/BiPC)',
      'Centralized counseling in Vadlamudi campus (A-Block Admission Cell)',
      'One-time admission registration fee: ₹20,000 for B.Tech',
    ],
    relatedImagesCount: 3,
  },
  // 11. Fee Structure & Concessions
  {
    id: 'src_vignan_fee_str',
    url: 'https://vignan.ac.in/newvignan/fee_str.php',
    canonicalUrl: 'https://vignan.ac.in/newvignan/fee_str.php',
    title: 'Official Tuition Fees, Slabs, and Scholarship Concession Policy',
    category: 'fees',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'B.Tech CSE/AIML/DS/Cyber Security/CSBS/IT Cat A: ₹2,60,000 per annum',
      'B.Tech CSE/Specializations Cat B (Management): ₹3,60,000 per annum',
      'B.Tech ECE/EEE/Biotech/Food Tech Cat A: ₹2,00,000 per annum (Cat B: ₹2,80,000)',
      'B.Tech Mechanical/Civil/Chemical Cat A: ₹1,60,000 per annum (Cat B: ₹2,20,000)',
      'BCA: ₹1,00,000/yr | BBA: ₹1,40,000/yr | MBA: ₹1,80,000/yr | MCA: ₹1,20,000/yr',
      'Merit Scholarship: 75% fee waiver (V-SAT Rank 1-50 or JEE >95 percentile)',
    ],
    relatedImagesCount: 2,
  },
  // 12. Campus Facilities & Infrastructure
  {
    id: 'src_vignan_facilities',
    url: 'https://vignan.ac.in/newvignan/facilities.php',
    canonicalUrl: 'https://vignan.ac.in/newvignan/facilities.php',
    title: 'Campus Infrastructure, Central Library, Health Care & Transport',
    category: 'facilities',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'NTR Central Library: 1,10,000+ volumes, 160 digital library terminals, 1,000+ reading capacity',
      '24/7 University Health Centre with on-duty physicians, nurses, and dedicated campus ambulance',
      '80+ university bus fleet connecting Guntur, Tenali, Vijayawada, and surrounding regions',
      'Union Bank of India campus branch with 24/7 ATMs',
      'Open Air Theatre (OAT) with 5,000+ seating capacity',
    ],
    relatedImagesCount: 8,
  },
  // 13. University Life & Student Hostels
  {
    id: 'src_vignan_u_life',
    url: 'https://www.vignan.ac.in/newvignan/u-life.php',
    canonicalUrl: 'https://www.vignan.ac.in/newvignan/u-life.php',
    title: 'University Life, Residential Hostels & Student Welfare',
    category: 'hostels',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'Boys Hostels: Vashishta, Visweswaraya, Aravinda Hostels',
      'Girls Hostels: Priyadarshini & Kalpana Chawla Hostels (biometric turnstiles, 24/7 security)',
      'Non-AC Hostel Fee: ₹1,05,000 to ₹1,15,000 per annum',
      'AC Hostel Fee: ₹1,35,000 to ₹1,45,000 per annum',
      'Includes 4 meals/day, RO water, laundry, Wi-Fi, and recreation rooms',
    ],
    relatedImagesCount: 6,
  },
  // 14. Student Activities Council (SAC) & Clubs
  {
    id: 'src_vignan_sac',
    url: 'https://vignan.ac.in/newvignan/sac_index.php',
    canonicalUrl: 'https://vignan.ac.in/newvignan/sac_index.php',
    title: 'Student Activities Council (SAC) - Cultural, Technical & Social Clubs',
    category: 'student_organizations',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'Governing student council coordinating all campus clubs and national festivals',
      'Cultural Clubs: Tarangini (Music), Nritya (Dance), Dramatics Club',
      'Literary & Media: Literati Club, Chitrika (Photography), Toastmasters',
      'Technical Clubs: Coding Club, Robotics Club, AI/ML Club, Google Developer Student Club',
      'Social Service: Vignan Youth for Service (VYS), NSS, NCC (Army/Navy), Unnat Bharat Abhiyan',
    ],
    relatedImagesCount: 10,
  },
  // 15. Student Admissions & Campus Life (New Students)
  {
    id: 'src_vignan_newstudent',
    url: 'https://www.vignan.ac.in/newvignan/newstudent.php',
    canonicalUrl: 'https://www.vignan.ac.in/newvignan/newstudent.php',
    title: 'Freshers Guide, Campus Life & Student Induction Handbook',
    category: 'official_policies',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    retrievedDate: '2025-02-15',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    extractedFactsSummary: [
      'Comprehensive orientation and induction programme for incoming B.Tech students',
      'Strict zero-tolerance anti-ragging policy under UGC and Supreme Court regulations',
      'Mentorship system: 1 faculty counselor per 20 students',
      'Student grievance cell and internal complaints committee (ICC)',
    ],
    relatedImagesCount: 4,
  },
];

export function getSourceRegistry(): SourceRegistryEntry[] {
  return VIGNAN_SOURCE_REGISTRY;
}

export function getSourcesByCategory(category: SourceRegistryEntry['category']): SourceRegistryEntry[] {
  return VIGNAN_SOURCE_REGISTRY.filter((s) => s.category === category);
}

export function getSourceById(id: string): SourceRegistryEntry | undefined {
  return VIGNAN_SOURCE_REGISTRY.find((s) => s.id === id);
}
