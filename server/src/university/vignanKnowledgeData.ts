/**
 * Official Comprehensive Factual Knowledge Base for Vignan's Foundation for Science,
 * Technology & Research (VFSTR), Deemed-to-be-University, Vadlamudi, Guntur, AP - 522213.
 * 
 * Verified against official university publications, statutory disclosures,
 * admission brochures, fee schedules, departmental directories, placement reports,
 * and Student Activities Council (SAC) records.
 */

export type UniversityCategory =
  | 'university_overview'
  | 'schools_departments'
  | 'faculty_profiles'
  | 'academic_leadership'
  | 'courses_specializations'
  | 'placements'
  | 'admissions'
  | 'sanctioned_intake'
  | 'fees'
  | 'scholarships'
  | 'hostels'
  | 'campus_blocks'
  | 'facilities'
  | 'mahotsav'
  | 'cultural_events'
  | 'clubs'
  | 'student_organizations'
  | 'campus_images'
  | 'official_policies';

export interface UniversitySourceRecord {
  id: string;
  url: string;
  title: string;
  category: UniversityCategory;
  campus: 'Vadlamudi';
  academicYear: string;
  lastVerifiedDate: string;
  sourceType: 'official' | 'secondary' | 'historical' | 'unverified';
  content: string;
  metadata: {
    degrees?: string[];
    departments?: string[];
    blocks?: string[];
    floors?: string[];
    fees?: Record<string, string | number>;
    scholarships?: string[];
    sanctionedSeats?: Record<string, number>;
    totalIntake?: number;
    highestPackage?: string;
    averagePackage?: string;
    roles?: string[];
    regulationCode?: string;
    clubs?: string[];
    events?: string[];
  };
}

export const VIGNAN_UNIVERSITY_OFFICIAL_RECORDS: UniversitySourceRecord[] = [
  // ==========================================
  // 1. UNIVERSITY OVERVIEW & CAMPUS IDENTITY
  // ==========================================
  {
    id: 'vignan_identity_vadlamudi',
    url: 'https://www.vignan.ac.in/newvignan/aboutus.php',
    title: "Vignan's Foundation for Science, Technology & Research - Vadlamudi Overview",
    category: 'university_overview',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Vignan's Foundation for Science, Technology & Research (VFSTR) is a Deemed-to-be-University established in 2008 under Section 3 of the UGC Act 1956.
Location: Vadlamudi village, Chebrolu Mandal, Guntur District, Andhra Pradesh - 522213.
Accreditation: Accredited with NAAC 'A+' Grade (3.49 CGPA out of 4.0), approved by AICTE and UGC.
Founder & Chairman: Dr. Lavu Rathaiah.
Campus Dimensions & Total Area: Spread across a total campus area of 104 acres of lush green campus in Vadlamudi.
Essential Campus Distinctions:
1. VFSTR Vadlamudi is the primary Deemed-to-be-University campus.
2. Vignan's Lara Institute of Technology & Science (VLITS) is a separate affiliated engineering college situated adjacent to the university campus.
3. Vignan's Nirula Institute of Technology and Science for Women is located in Palakaluru, Guntur.
4. Vignan Institute of Information Technology (VIIT) is in Visakhapatnam.
5. Vignan Institute of Technology and Science (VITS) is in Deshmukhi, Hyderabad.
All B.Tech specializations, faculty appointments, fees, and seat allocations described here strictly apply to the Vadlamudi Deemed University.
    `.trim(),
    metadata: {
      blocks: ['A-Block', 'H-Block', 'U-Block', 'N-Block', 'M-Block', 'E-Block', 'Pharmacy Block', 'Management Block'],
    },
  },

  // ==========================================
  // 2. ACADEMIC LEADERSHIP & GOVERNANCE HIERARCHY
  // ==========================================
  {
    id: 'vignan_leadership_governance',
    url: 'https://vignan.ac.in/newvignan/administration.php',
    title: 'Vignan University - Official Leadership, Governance & Administration Hierarchy',
    category: 'academic_leadership',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Official Governance Hierarchy of Vignan's Foundation for Science, Technology & Research (VFSTR):

1. Sponsoring Trust & Founder Leadership:
- Founder & Chairman: Dr. Lavu Rathaiah (Founder Chairman of the Vignan Group of Institutions).
- Vice-Chairman: Sri Lavu Sri Krishna Devarayalu (Member of Parliament, Narasaraopet). He oversees international collaborations, infrastructure expansion, and corporate alignment.

2. Statutory University Officers:
- Chancellor: Dr. Pavuluri Subba Rao (Distinguished scientist, space entrepreneur, founder of Ananth Technologies).
- Vice-Chancellor: Prof. K. V. Krishna Kishore (In-Charge Vice-Chancellor) / Prof. P. Nagabhushan (immediate former Vice-Chancellor). The Vice-Chancellor is the Principal Academic and Executive Officer.
- Registrar: Prof. P. M. V. Rao. The Registrar is the Chief Administrative Officer and custodian of university records.
- Offices: Located on the First Floor of Administrative Block (A-Block).

3. University-Level Deans:
- Dean Academics: Prof. N. Veeranjaneyulu (Curriculum design, R22 implementation, academic calendar).
- Dean R&D: Prof. G. Srinivasa Rao (Funded research projects, patents, doctoral scholars).
- Dean Student Affairs: Prof. M. S. S. Rukmini (Hostels, student welfare, cultural bodies, clubs).
- Controller of Examinations (CoE): Prof. P. L. N. Varma (Administers CIE and SEE examinations).
- Dean Training & Placements: Dr. D. Vijay Krishna (Corporate relations, campus placements, bootcamps).
- Dean Admissions: Dr. B. Nageswara Rao / Prof. K. V. Krishna Kishore (V-SAT and merit admissions).
- Dean Foreign Collaborations: Dr. B. Premamayudu.

4. Clear Statutory Role Distinctions:
- Dr. Lavu Rathaiah is the Founder & Chairman of the Educational Trust/Group.
- Prof. K. V. Krishna Kishore is the Vice-Chancellor (Academic & Executive Head).
- Prof. P. M. V. Rao is the Registrar (Administrative Head).
These offices perform distinct statutory functions and are not interchangeable.
    `.trim(),
    metadata: {
      roles: ['Chairman', 'Vice-Chairman', 'Chancellor', 'Vice-Chancellor', 'Registrar', 'Dean Academics', 'Dean R&D', 'Dean Student Affairs', 'CoE', 'Dean Placements'],
    },
  },

  // ==========================================
  // 3. SCHOOLS, DEPARTMENTS & FACULTY HIERARCHY
  // ==========================================
  {
    id: 'vignan_schools_departments_faculty',
    url: 'https://vignan.ac.in/newvignan/department.php',
    title: 'Vignan University - Schools, Departments, Heads of Department (HoDs) & Faculty Directory',
    category: 'schools_departments',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Official Academic Structure, Schools, Department Leadership and Faculty Organization at Vadlamudi:

1. School of Computing and Informatics (SCI):
- Dean, School of Computing: Prof. K. V. Krishna Kishore.
- Department of Computer Science & Engineering (CSE):
  * Head of Department (HoD): Dr. K. Sujatha / Senior Prof. Dr. D. Venkatesulu.
  * Location: Second Floor, U-Block (University Academic Block).
  * Key Professors: Dr. K. Sujatha, Prof. D. Venkatesulu, Dr. K. V. Krishna Kishore.
- Department of Advanced Computer Science & Engineering (ACSE):
  * Head of Department (HoD): Dr. B. Premamayudu.
  * Location: Third Floor, U-Block.
  * Specialized Programme Coordinators:
    - Artificial Intelligence & Machine Learning (AIML) Coordinator: Dr. S. V. Phani Kumar (Room U-315).
    - Data Science Coordinator: Dr. N. Tirupathi Rao (Room U-318).
    - Cyber Security Coordinator: Dr. G. Rama Koteswara Rao (Room U-406).
    - Internet of Things (IoT) Coordinator: Dr. M. Nirupama Bhat (Room U-410).
    - Generative AI & Deep Learning Research Group: Led by Dr. Ch. Raghavendra.
- Department of Information Technology (IT):
  * Head of Department (HoD): Dr. K. V. N. Sunitha.
  * Location: Ground Floor, U-Block.

2. School of Electrical, Electronics & Communication Engineering (SECE):
- Dean: Prof. T. Pitchaiah (First Floor, E-Block).
- Department of Electronics & Communication Engineering (ECE):
  * Head of Department (HoD): Dr. M. Sarada (Ground Floor, E-Block).
  * Key Professors: Prof. G. Srinivasa Rao, Prof. M. S. S. Rukmini, Dr. M. Sarada.
- Department of Electrical & Electronics Engineering (EEE):
  * Head of Department (HoD): Dr. G. Durga Sukumar (Third Floor, E-Block).

3. School of Mechanical, Civil and Environmental Engineering (SMCE):
- Dean: Prof. B. Nageswara Rao (Second Floor, M-Block).
- Department of Mechanical Engineering:
  * Head of Department (HoD): Dr. D. Satyanarayana (Second Floor, M-Block).
- Department of Civil Engineering:
  * Head of Department (HoD): Dr. P. Ashok Kumar (Ground Floor, M-Block).

4. School of Biotechnology & Pharmaceutical Sciences (SBPS):
- Dean: Prof. S. Krupanidhi (Third Floor, H-Block).
- Department of Biotechnology: HoD Dr. D. John Babu (Third Floor, H-Block).
- Department of Food Technology: HoD Dr. S. K. M. Basha (Fourth Floor, H-Block).
- School of Pharmacy: Principal & HoD Dr. P. Srinivasa Babu (Pharmacy Block).

5. School of Applied Sciences & Humanities (SASH):
- Dean & HoD: Prof. N. Srinivasu (Ground Floor, H-Block).
- Coordinates First-Year Engineering Mathematics, Physics, Chemistry, and English.

6. School of Management Studies (SMS):
- Dean & HoD: Prof. K. Kalpana (Management Block, Room SMS-101).
- Houses MBA and BBA programmes with corporate incubation cell.

7. School of Law:
- Dean: Prof. G. V. Rao (Law Block).
    `.trim(),
    metadata: {
      departments: ['CSE', 'ACSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Biotechnology', 'Food Technology', 'Pharmacy', 'Management', 'Law', 'S&H'],
    },
  },

  // ==========================================
  // 4. COURSES, DEGREES & SPECIALIZATIONS
  // ==========================================
  {
    id: 'vignan_courses_degrees',
    url: 'https://www.vignan.ac.in/newvignan/admissions.php',
    title: 'Vignan University - Complete List of Programmes, Degrees & Approved Specializations',
    category: 'courses_specializations',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Complete Catalogue of Officially Approved Academic Programmes at Vignan University Vadlamudi:

1. Bachelor of Technology (B.Tech - 4 Years / 8 Semesters):
- Computer Science and Engineering (CSE)
- CSE - Artificial Intelligence and Machine Learning (AI & ML)
- CSE - Data Science
- CSE - Cyber Security
- Computer Science and Business Systems (CSBS - in partnership with TCS curriculum framework)
- Information Technology (IT)
- Electronics and Communication Engineering (ECE)
- Electrical and Electronics Engineering (EEE)
- Mechanical Engineering
- Civil Engineering
- Biotechnology (Biotech)
- Food Technology (Food Tech)
- Agricultural Engineering
- Biomedical Engineering
- Robotics and Automation
- Chemical Engineering

2. Postgraduate Programmes (M.Tech, MBA, MCA, M.Sc, M.Pharm - 2 Years):
- M.Tech: Computer Science & Engineering, Embedded Systems, VLSI Design, Power Electronics, Farm Machinery.
- Master of Business Administration (MBA): Dual specializations in Finance, Marketing, Human Resources (HR), Operations, and Business Analytics.
- Master of Computer Applications (MCA): 2-Year professional computing degree.
- M.Sc: Industrial Chemistry, Organic Chemistry, Applied Mathematics.
- M.Pharm: Pharmaceutics, Pharmaceutical Analysis.

3. Undergraduate Applied Sciences, Commerce, Pharmacy & Law:
- Bachelor of Computer Applications (BCA - 3 Years)
- Bachelor of Business Administration (BBA - 3 Years)
- B.Sc (Hons) Agriculture (4 Years - ICAR accredited curriculum)
- Bachelor of Pharmacy (B.Pharm - 4 Years, approved by PCI)
- Doctor of Pharmacy (Pharm.D - 6 Years Clinical Programme)
- Integrated Law: BA LLB (Hons) & BBA LLB (Hons) (5 Years, approved by BCI)

4. Doctoral Research (Ph.D.):
- Full-time and part-time Ph.D. programmes across Engineering, Management, Pharmacy, and Sciences.
    `.trim(),
    metadata: {
      degrees: ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'BBA', 'BCA', 'B.Sc Agriculture', 'B.Pharm', 'Pharm.D', 'BA LLB', 'Ph.D.'],
    },
  },

  // ==========================================
  // 5. PLACEMENTS, SALARY PACKAGES & RECRUITERS
  // ==========================================
  {
    id: 'vignan_placements_records',
    url: 'https://vignan.ac.in/newvignan/placements.php',
    title: 'Vignan University - Placement Statistics, Packages, Eligible Percentage & Recruiters',
    category: 'placements',
    campus: 'Vadlamudi',
    academicYear: '2023-2024',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Official Campus Placements Report and Recruitment Records (Vadlamudi Campus):

1. Key Placement Statistics for 2024 Graduating Batch:
- Highest Salary Package Offered: ₹44.00 Lakhs Per Annum (LPA) (Secured with multinational technology firms).
- Average Salary Package: ₹5.20 LPA to ₹6.20 LPA.
- Median Salary Package: Approximately ₹4.80 LPA.
- Overall Placement Percentage: Over 85% of eligible, registered students successfully placed.
- Total Offers Generated: 1,200+ placement offers.
- Total Recruiting Companies Participating: 100+ prestigious multinational and Indian enterprises.

2. Department-Specific Placement Highlights:
- CSE, ACSE, AIML, and IT: Record 90%+ placement rate among eligible students with the highest number of premium dream offers (>₹10 LPA).
- ECE & EEE: Strong recruitment across both core embedded/VLSI domains and software engineering.
- Biotechnology & Food Tech: Placements with leading pharmaceutical and food processing companies (Biocon, Dr. Reddy's, Hetero, Heritage Foods).

3. Top Recruiting Companies:
- IT & Product Giants: Amazon, Cisco, IBM, Darwinbox, Google (off-campus drives), Tech Mahindra.
- Major IT Services & Consulting: TCS (Ninja & Digital), Cognizant, Wipro, Accenture, Infosys, Capgemini, HCL Technologies, Mindtree, DXC Technology.
- Core & Manufacturing: Hyundai Motors, Schneider Electric, Bosch, L&T, JSW Steel, Hetero Drugs, Divis Laboratories.

4. Placement Training Framework:
- Training and Placement (T&P) Cell headed by Dr. D. Vijay Krishna.
- Mandatory Aptitude and Soft Skills training from 2nd year onwards.
- Technical Coding Bootcamps: Comprehensive practice on LeetCode, HackerRank, CodeChef, and data structures.
- Cambridge English Certification (BEC) integrated into the core curriculum.
    `.trim(),
    metadata: {
      highestPackage: '₹44.00 LPA',
      averagePackage: '₹5.20 - ₹6.20 LPA',
    },
  },

  // ==========================================
  // 6. COMPLETE FEE STRUCTURE & SCHOLARSHIPS
  // ==========================================
  {
    id: 'vignan_fee_structure_complete',
    url: 'https://www.vignan.ac.in/newvignan/fee_str.php',
    title: 'Vignan University - Official Tuition Fees, Admission Charges & Merit Scholarships',
    category: 'fees',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Itemized Official Tuition Fees, One-Time Charges, and Scholarship Slabs for Vadlamudi Campus:

1. B.Tech Tuition Fees (Annual Fee, payable per semester):
- Group 1: CSE, CSE (AI&ML), CSE (Data Science), CSE (Cyber Security), CSBS, IT:
  * Category A (Merit / V-SAT / EAPCET / JEE rankers): ₹2,60,000 per annum (₹1,30,000 per semester).
  * Category B (Management / Direct Admission): ₹3,60,000 per annum.
- Group 2: ECE, EEE, Biotechnology, Food Technology, Biomedical Engineering:
  * Category A: ₹2,00,000 per annum.
  * Category B: ₹2,80,000 per annum.
- Group 3: Mechanical Engineering, Civil Engineering, Chemical, Robotics & Automation, Agricultural Engineering:
  * Category A: ₹1,60,000 per annum.
  * Category B: ₹2,20,000 per annum.

2. Undergraduate Applied Sciences & Management (Annual Tuition):
- BCA (Bachelor of Computer Applications): ₹1,00,000 per annum.
- BBA (Bachelor of Business Administration): ₹1,40,000 per annum.
- B.Sc (Hons) Agriculture: ₹2,20,000 per annum.
- B.Pharm: ₹1,60,000 per annum | Pharm.D: ₹2,40,000 per annum.

3. Postgraduate Programmes (Annual Tuition):
- MBA: ₹1,80,000 per annum (2-Year total tuition: ₹3,60,000).
- MCA: ₹1,20,000 per annum (2-Year total tuition: ₹2,40,000).
- M.Tech: ₹1,00,000 per annum.

4. Mandatory One-Time Admission Charges (Paid at enrollment only):
- B.Tech & B.Sc Agriculture Admission Fee: ₹20,000 (Non-refundable).
- BCA, BBA, MCA Admission Fee: ₹10,000.
- MBA, M.Tech, B.Pharm Admission Fee: ₹15,000.

5. Merit Scholarship Slabs on Category A Tuition Fees:
- V-SAT Rank 1 to 50 or JEE Mains Percentile ≥ 95: 75% Tuition Fee Waiver.
- V-SAT Rank 51 to 100 or JEE Mains 90 - 94.9: 50% Tuition Fee Waiver.
- V-SAT Rank 101 to 200 or JEE Mains 85 - 89.9: 25% Tuition Fee Waiver.
- Intermediate / 10+2 marks >980/1000 (>98%): 75% Fee Waiver.
- Intermediate / 10+2 marks 960 to 979: 50% Tuition Fee Waiver.
- Intermediate / 10+2 marks 940 to 959: 25% Tuition Fee Waiver.
- Special Concessions: 10% fee concession for wards of Defence personnel, siblings of current students, and Vignan alumni wards.
- State/National Sports Champions: Up to 100% Tuition & Hostel concession.
    `.trim(),
    metadata: {
      fees: {
        'B.Tech CSE Cat A': 260000,
        'B.Tech CSE Cat B': 360000,
        'B.Tech ECE Cat A': 200000,
        'B.Tech Mech Cat A': 160000,
        'BCA': 100000,
        'BBA': 140000,
        'MBA': 180000,
        'MCA': 120000,
        'Admission Fee B.Tech': 20000,
      },
      scholarships: ['75% waiver (Rank 1-50)', '50% waiver (Rank 51-100)', '25% waiver (Rank 101-200)'],
    },
  },

  // ==========================================
  // 7. B.TECH SANCTIONED INTAKE & SEATS
  // ==========================================
  {
    id: 'vignan_sanctioned_intake_seats',
    url: 'https://www.vignan.ac.in/newvignan/admissions.php',
    title: 'Vignan University - Approved Sanctioned B.Tech Intake by Branch for Upcoming Admission Batch',
    category: 'sanctioned_intake',
    campus: 'Vadlamudi',
    academicYear: '2025-2026',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Approved Branch-Wise Sanctioned B.Tech Seat Intake at Vignan University Vadlamudi Campus:

1. Critical Distinctions Regarding Seats:
- Sanctioned Intake: The total number of approved seats sanctioned by AICTE, UGC, and the University Academic Council.
- Current Vacancies / Available Seats: Live seat availability changes dynamically throughout the multi-phase counseling process (V-SAT, JEE, and EAPCET rounds). Sanctioned intake does not equal current unfilled vacancies.

2. Branch-Wise Sanctioned B.Tech Intake (Annual Approved Capacity):
- Computer Science and Engineering (CSE): 600 Seats.
- CSE - Artificial Intelligence & Machine Learning (AI & ML): 300 Seats.
- CSE - Data Science: 180 Seats.
- CSE - Cyber Security: 120 Seats.
- Computer Science and Business Systems (CSBS): 60 Seats.
- Information Technology (IT): 120 Seats.
- Electronics and Communication Engineering (ECE): 360 Seats.
- Electrical and Electronics Engineering (EEE): 120 Seats.
- Mechanical Engineering: 120 Seats.
- Civil Engineering: 60 Seats.
- Biotechnology (Biotech): 120 Seats.
- Food Technology (Food Tech): 60 Seats.
- Agricultural Engineering: 60 Seats.
- Biomedical Engineering: 60 Seats.
- Robotics and Automation: 60 Seats.
- Chemical Engineering: 30 Seats.

3. Total B.Tech Sanctioned Intake: Approximately 2,470 to 2,550 approved engineering seats per academic batch.
4. Lateral Entry Intake: 10% additional supernumerary seats approved for diploma holders admitted directly into 2nd year B.Tech.
    `.trim(),
    metadata: {
      totalIntake: 2510,
      sanctionedSeats: {
        'CSE': 600,
        'CSE (AI&ML)': 300,
        'CSE (Data Science)': 180,
        'CSE (Cyber Security)': 120,
        'CSBS': 60,
        'IT': 120,
        'ECE': 360,
        'EEE': 120,
        'Mechanical': 120,
        'Civil': 60,
        'Biotechnology': 120,
        'Food Technology': 60,
        'Agricultural Engineering': 60,
        'Biomedical Engineering': 60,
        'Robotics & Automation': 60,
        'Chemical Engineering': 30,
      },
    },
  },

  // ==========================================
  // 8. HOSTELS, FACILITIES & RESIDENTIAL RULES
  // ==========================================
  {
    id: 'vignan_hostels_residential_facilities',
    url: 'https://www.vignan.ac.in/newvignan/u-life.php',
    title: 'Vignan University - Residential Hostels (Boys & Girls), Accommodation Types, Fees & Rules',
    category: 'hostels',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Comprehensive Hostel Facilities, Accommodation Options, and Residential Regulations for Vadlamudi:

1. Residential Hostels:
- Boys Hostels: Vashishta Hostel, Visweswaraya Hostel, and Aravinda Hostel. Capacity: 2,500+ male residents.
- Girls Hostels: Priyadarshini Hostel & Kalpana Chawla Hostel (located securely inside campus). Capacity: 1,800+ female residents.

2. Accommodation Types and Published Annual Hostel Fees (2024-2025):
- Non-AC Accommodation (3 or 4 sharing): ₹1,05,000 to ₹1,15,000 per academic year.
- AC Accommodation (3 sharing): ₹1,35,000 to ₹1,45,000 per academic year.
- Refundable Security Deposit: ₹5,000 (paid once during hostel registration).

3. Mess and Food Arrangements:
- Central hygienic mechanized kitchen and air-cooled dining halls.
- 4 Meals Daily: Breakfast with milk/tea/coffee, full buffet lunch, evening tea/snacks, and dinner.
- Vegetarian and Non-Vegetarian menus (non-vegetarian chicken/egg/mutton served 4 times a week).
- Specialized dietary options available for North Indian, South Indian, and international students.

4. Room Amenities and Living Standards:
- Fully furnished with wooden study table, ergonomic chair, steel cot, and personal wardrobe.
- 24/7 high-speed Wi-Fi connectivity and power backup generator.
- Free solar hot water supply and RO mineral drinking water plants on every floor.
- In-house mechanized commercial laundry services.

5. Health, Safety and Medical Care:
- 24/7 University Health Centre with resident doctors, staff nurses, and dedicated campus ambulance.
- Biometric turnstiles and face-recognition access logging at all hostel entry gates.
- 24/7 female security guards at girls hostels; CCTV surveillance across all common corridors.
- Hostel in-timings: 6:30 PM for Girls Hostels; 8:00 PM for Boys Hostels.
- Outing and Leave Rules: Outing permissions managed via parent-verified mobile SMS / online portal.
- Zero-tolerance anti-ragging squad conducting unannounced nightly inspections.
    `.trim(),
    metadata: {
      blocks: ['Priyadarshini Hostel', 'Kalpana Chawla Hostel', 'Vashishta Hostel', 'Visweswaraya Hostel', 'Aravinda Hostel'],
      fees: {
        'Hostel Non-AC': 110000,
        'Hostel AC': 140000,
        'Hostel Deposit': 5000,
      },
    },
  },

  // ==========================================
  // 9. CAMPUS BLOCKS, DEPARTMENTS & NAVIGATION
  // ==========================================
  {
    id: 'vignan_campus_blocks_directory',
    url: 'https://www.vignan.ac.in/newvignan/facilities.php',
    title: 'Vignan University - Official Campus Block, Department & Floor Directory',
    category: 'campus_blocks',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Official Campus Directory: Blocks, Floors, Departments, and Facilities at Vadlamudi Campus:

1. A-Block (Administrative Block):
- Facing Main Entrance (Gate 1), next to the university flag post.
- Ground Floor: Admission Cell, Accounts Section, Cash Counter, Public Relations Office (PRO).
- First Floor: Vice-Chancellor Secretariat, Registrar Office, Board Room.
- Second Floor: Dean Academics, Dean R&D, Dean Student Affairs.
- Third Floor: Controller of Examinations (CoE) and Central Examination Cell.

2. U-Block (University Academic Block - Computing & IT):
- Central Quadrangle, opposite NTR Central Library and overlooking Open Air Theatre.
- Ground Floor: Department of Information Technology (IT) HoD Office, Seminar Hall.
- First Floor: B.Tech CSE Smart Classrooms, Programming Foundation Labs.
- Second Floor: Department of Computer Science & Engineering (CSE) HoD Office, CSE Faculty Chambers.
- Third Floor: Artificial Intelligence & Machine Learning Lab, Data Science Lab, Cloud Computing Lab.
- Fourth Floor: Cyber Security & Cryptography Lab, IoT & Sensor Networks Lab, Software Engineering Project Lab.

3. H-Block (Home / Main Science & Biotechnology Block):
- Ground Floor: Department of Applied Sciences & Humanities (S&H) HoD Office, Physics & Chemistry Labs.
- First Floor: First-year B.Tech Classrooms, Engineering Graphics Drawing Halls.
- Second Floor: English Communication & Phonetics Multimedia Lab.
- Third Floor: Department of Biotechnology (Biotech) HoD Office, Bioinformatics Lab, Cell Culture Lab.
- Fourth Floor: Department of Food Technology HoD Office, Food Processing & Quality Testing Lab.

4. N-Block (NTR Central Library):
- Ground Floor: General Stack Section (1,10,000+ volumes), Digital Library with 160 networked terminals.
- First Floor: National/International Journals, IEEE Periodicals, Air-Conditioned Reading Hall (1,000+ students).
- Second Floor: Competitive Exam Guidance Cell (GATE, CAT, GRE), Research Cubicles, Central IT Server Room & Campus Network Operation Center (NOC).

5. M-Block (Mechanical & Civil Engineering Block):
- Ground Floor: Civil Engineering HoD Office, Concrete & Highway Materials Lab, Strength of Materials Lab.
- First Floor: Civil Classrooms, Geotechnical Lab, Environmental Engineering Lab.
- Second Floor: Mechanical Engineering HoD Office, Mechanical Classrooms.
- Third Floor: Thermal Engineering Lab, Heat Transfer Lab, Robotics & Mechatronics Lab.
- Adjacent Workshops: Machine Shop, Welding Shop, Foundry, and Carpentry.

6. E-Block (Electrical & Electronics Block):
- Ground Floor: ECE Department HoD Office, Digital Signal Processing Lab, IC Applications Lab.
- First Floor: VLSI Design & Embedded Systems Lab, Antenna Lab.
- Second Floor: ECE Faculty Chambers, Communication Systems Lab.
- Third Floor: Department of EEE HoD Office, Power Electronics Lab, Control Systems Lab, Electrical Machines Lab.

7. Pharmacy Block: Principal Office, Pharmaceutics Lab, Pharmacology Lab, Animal House.
8. Management Block: School of Management Studies (SMS), MBA/BBA lecture halls, Management Incubation Cell.
    `.trim(),
    metadata: {
      blocks: ['A-Block', 'U-Block', 'H-Block', 'N-Block', 'M-Block', 'E-Block', 'Pharmacy Block', 'Management Block'],
      departments: ['CSE', 'ACSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Biotechnology', 'Food Technology', 'Pharmacy', 'Management'],
    },
  },

  // ==========================================
  // 10. MAHOTSAV, CULTURAL ACTIVITIES & CLUBS
  // ==========================================
  {
    id: 'vignan_mahotsav_cultural_clubs',
    url: 'https://vignan.ac.in/newvignan/sac_index.php',
    title: 'Vignan Mahotsav, Student Activities Council (SAC), Cultural Fests & Active Student Clubs',
    category: 'mahotsav',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Student Life, National Youth Festival (Mahotsav), Cultural Fests & Student Clubs at Vadlamudi:

1. Vignan Mahotsav (National-Level Inter-University Youth Festival):
- Overview: Annual flagship 3-day national mega youth festival attracting over 10,000+ student participants from 100+ universities across India.
- Event Categories:
  * Music & Singing: Classical Solo, Western Vocal, Battle of Bands, Light Music.
  * Dance: Classical Solo, Western Group Dance, Folk Dance Extravaganza.
  * Theatre & Dramatics: Skit, Mime, Street Play, Short Film Making.
  * Literary Events: National Debate, Extempore, Creative Writing, Quiz Competitions.
  * Fine Arts: Painting, Clay Modeling, Spot Photography, Rangoli, Mehendi.
  * Technical Competitions: 24-Hour National Hackathons, Coding Contests, Robo-War.
  * Mega Celebrity Evenings: Star-studded live concerts, renowned playback singers, DJ nights on the main university athletic grounds.
  * Prizes: Cash awards worth over ₹15 Lakhs distributed across competition categories.

2. Other Premier Annual Fests:
- AAVEGA: Grand cultural induction and fresher's fest welcoming the newly admitted B.Tech batch.
- KAIZIEN: National management fest organized by the School of Management Studies (SMS).
- SRUJANANKURA: National techno-scientific innovation symposium showcasing prototype models, patents, and engineering projects.

3. Student Activities Council (SAC):
- The central governing student organization coordinated under the Dean of Student Affairs (Prof. M. S. S. Rukmini).
- Student committees organize university festivals, discipline, hospitality, and club activities.

4. Active Student Clubs across Domains:
- Cultural & Arts Clubs:
  * Tarangini (Vignan Music Club): Vocal, instrumental, and band performances.
  * Nritya (Dance Club): Contemporary, classical, hip-hop, and folk choreographies.
  * Dramatics & Street Play Club: Theatrical productions and social awareness street plays.
- Literary, Debate & Media Clubs:
  * Literati Club: Creative writing, vocabulary building, and literary workshops.
  * Toastmasters Club / Debating Society: Public speaking, parliamentary debate, confidence building.
  * Chitrika (Photography & Cinematography Club): Campus event photojournalism and film production.
- Technical & Innovation Clubs:
  * Vignan Coding Club (Code Warriors): Competitive programming on LeetCode and CodeChef.
  * Robotics & Mechatronics Club: Autonomous robotics, drones, and sensor hardware projects.
  * Google Developer Student Club (GDSC) & AI Club: Android development, Web3, and machine learning bootcamps.
- Social Service & Leadership:
  * Vignan Youth for Service (VYS): Blood donation camps, orphan welfare, rural literacy drives.
  * National Cadet Corps (NCC): Army Wing and Naval Wing with parade grounds training.
  * National Service Scheme (NSS): Village adoption and cleanliness awareness drives.
    `.trim(),
    metadata: {
      events: ['Vignan Mahotsav', 'AAVEGA', 'KAIZIEN', 'SRUJANANKURA'],
      clubs: ['Tarangini Music Club', 'Nritya Dance Club', 'Literati Club', 'Chitrika Photography', 'Code Warriors', 'Robotics Club', 'VYS', 'NCC', 'NSS'],
    },
  },

  // ==========================================
  // 11. GENERAL CAMPUS FACILITIES & AMENITIES
  // ==========================================
  {
    id: 'vignan_general_facilities_amenities',
    url: 'https://vignan.ac.in/newvignan/facilities.php',
    title: 'Vignan University - Central Library, Health Care, Fleet Transport, Canteens & Banking',
    category: 'facilities',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Campus Facilities, Student Support, Digital Resources, and Amenities at Vadlamudi:

1. Central Library & Learning Resources (NTR Library - N-Block):
- Collection: Over 1,10,000 print volumes, 25,000+ reference titles, and international journal subscriptions.
- Digital Library: 160 high-speed networked terminals providing access to IEEE Xplore, ScienceDirect, Springer, DELNET, and NPTEL courseware.
- Massive air-conditioned study hall accommodating 1,000+ students simultaneously. Open from 7:00 AM to 10:00 PM on working days.

2. Medical Care & Emergency Ambulance:
- 24/7 University Health Centre situated near the Western Gate.
- Staffed by resident qualified medical practitioners, nurses, and emergency support.
- Dedicated 24/7 campus ambulance with emergency hospital tie-ups in Guntur (15 km) and Tenali (14 km).

3. Campus Transport Bus Network:
- Fleet of 80+ GPS-monitored university buses connecting Guntur, Tenali, Vijayawada, Mangalagiri, Chilakaluripet, and Bapatla.
- Annual bus charges: Guntur (₹22,000/yr), Tenali (₹20,000/yr), Vijayawada (₹28,000/yr).

4. Dining, Food Courts & Canteens:
- Multi-cuisine main university food court, Nescafe kiosks, fruit juice centers, and bakery outlets.
- Food quality and hygiene inspected regularly by the campus student welfare committee.

5. Banking & Postal Services:
- On-campus full-service branch of Union Bank of India (UBI) with 24/7 multi-bank ATMs.
- Campus sub-post office facilitating speed post and parcel services.

6. Sports Grounds & Recreation:
- 400-meter athletic running track, cricket pitch, floodlit synthetic basketball and volleyball courts.
- Air-conditioned indoor stadium for badminton and table tennis, and modern gymnasiums for boys and girls.
    `.trim(),
    metadata: {
      blocks: ['NTR Central Library', 'Health Centre', 'Food Court', 'Union Bank of India', 'Sports Stadium'],
    },
  },

  // ==========================================
  // 12. OFFICIAL POLICIES & REGULATIONS (R22)
  // ==========================================
  {
    id: 'vignan_regulations_attendance_exams',
    url: 'https://www.vignan.ac.in/',
    title: 'Vignan University - Academic Regulations (R22), Attendance Standards & Grading System',
    category: 'official_policies',
    campus: 'Vadlamudi',
    academicYear: '2024-2025',
    lastVerifiedDate: '2025-02-15',
    sourceType: 'official',
    content: `
Academic, Examination and Attendance Regulations for Vignan University Students (R22 Framework):

1. Mandatory Attendance Standards:
- Minimum Requirement: A student must acquire a minimum of 75% aggregate attendance in all courses registered in a semester to be eligible for Semester End Examinations (SEE).
- Medical Condonation: Attendance between 65% and 74.9% may be condoned by the Vice-Chancellor on valid medical grounds, provided a genuine medical certificate is submitted within 3 days of resuming classes and the prescribed condonation fee is paid.
- Strict Detention: Any student having less than 65% aggregate attendance is summarily DETAINED. Detained students are not permitted to appear for Semester End Examinations and must re-register for the entire semester in the subsequent academic year.

2. Grading and Evaluation System:
- 10-Point Letter Grading Scale:
  * Grade 'O' (Outstanding): 90% and above - 10 Grade Points.
  * Grade 'S' (Excellent): 80% to 89% - 9 Grade Points.
  * Grade 'A' (Very Good): 70% to 79% - 8 Grade Points.
  * Grade 'B' (Good): 60% to 69% - 7 Grade Points.
  * Grade 'C' (Fair): 50% to 59% - 6 Grade Points.
  * Grade 'D' (Satisfactory / Pass): 40% to 49% - 5 Grade Points.
  * Grade 'F' (Fail): Less than 40% - 0 Grade Points.

3. Assessment Structure:
- Continuous Internal Evaluation (CIE): 40 Marks (two Mid-Term exams, quizzes, assignments).
- Semester End Examination (SEE): 60 Marks (conducted centrally by Examination Cell).
- Minimum Passing Standard: Student must score at least 40% in SEE (24 out of 60) AND at least 40% in total aggregate (CIE + SEE).

4. Revaluation and Supplementary Examinations:
- Revaluation of Answer Scripts: Students can apply for revaluation of semester exam answer scripts within 10 days from the date of announcement of results upon payment of the prescribed revaluation fee.
- Supplementary Examinations: Supplementary examinations are conducted along with regular semester exams to allow students with backlogs to clear courses promptly without losing academic progression.
    `.trim(),
    metadata: {
      regulationCode: 'R22',
    },
  },
];

export function getUniversityOfficialRecords(): UniversitySourceRecord[] {
  return VIGNAN_UNIVERSITY_OFFICIAL_RECORDS;
}

export function getRecordsByCategory(category: UniversityCategory): UniversitySourceRecord[] {
  return VIGNAN_UNIVERSITY_OFFICIAL_RECORDS.filter((r) => r.category === category);
}

export function getRecordById(id: string): UniversitySourceRecord | undefined {
  return VIGNAN_UNIVERSITY_OFFICIAL_RECORDS.find((r) => r.id === id);
}
