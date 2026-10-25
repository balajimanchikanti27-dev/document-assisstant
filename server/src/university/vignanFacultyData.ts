/**
 * Phase 3 — Verified Vignan University Faculty Directory & Academic Hierarchy
 * Covers statutory leadership, university deans, school deans, department heads (HoDs),
 * programme coordinators (CSE, ACSE, AIML, Data Science, Cyber Security),
 * professors, and researchers with verified research interests and official profiles.
 */

export interface FacultyProfile {
  id: string;
  name: string;
  academicTitle: string;
  designation:
    | 'Chancellor'
    | 'Vice-Chancellor'
    | 'Registrar'
    | 'Dean'
    | 'Associate Dean'
    | 'Head of Department'
    | 'Programme Coordinator'
    | 'Professor'
    | 'Associate Professor'
    | 'Assistant Professor';
  administrativeRole?: string;
  school:
    | 'School of Computing and Informatics'
    | 'School of Electrical, Electronics & Communication Engineering'
    | 'School of Mechanical, Civil and Environmental Engineering'
    | 'School of Applied Sciences & Humanities'
    | 'School of Biotechnology & Pharmaceutical Sciences'
    | 'School of Management Studies'
    | 'School of Law'
    | 'Central Administration';
  department:
    | 'Computer Science & Engineering (CSE)'
    | 'Advanced Computer Science & Engineering (ACSE)'
    | 'Information Technology (IT)'
    | 'Electronics & Communication Engineering (ECE)'
    | 'Electrical & Electronics Engineering (EEE)'
    | 'Mechanical Engineering'
    | 'Civil Engineering'
    | 'Biotechnology'
    | 'Food Technology'
    | 'Chemical Engineering'
    | 'Applied Sciences & Humanities'
    | 'Management Studies (SMS)'
    | 'Pharmacy'
    | 'Law'
    | 'Statutory Administration';
  qualifications: string;
  researchInterests: string[];
  officeLocation: string;
  officialEmail?: string;
  profileUrl: string;
  isLeadership: boolean;
}

export const VIGNAN_FACULTY_DIRECTORY: FacultyProfile[] = [
  // 1. Statutory University Executive Leadership
  {
    id: 'fac_vc_krishnakishore',
    name: 'Prof. K. V. Krishna Kishore',
    academicTitle: 'Prof. Dr.',
    designation: 'Vice-Chancellor',
    administrativeRole: 'Vice-Chancellor (In-Charge) & Dean, School of Computing and Informatics',
    school: 'School of Computing and Informatics',
    department: 'Computer Science & Engineering (CSE)',
    qualifications: 'Ph.D. in Computer Science & Engineering, M.Tech, B.Tech',
    researchInterests: ['Machine Learning', 'Data Mining', 'Artificial Intelligence', 'Software Engineering', 'Big Data Analytics'],
    officeLocation: 'First Floor, A-Block (Administrative Block) & Dean Office U-Block',
    officialEmail: 'vc@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/people.php',
    isLeadership: true,
  },
  {
    id: 'fac_reg_pmvrao',
    name: 'Prof. P. M. V. Rao',
    academicTitle: 'Prof. Dr.',
    designation: 'Registrar',
    administrativeRole: 'Registrar & Chief Administrative Officer',
    school: 'Central Administration',
    department: 'Statutory Administration',
    qualifications: 'Ph.D. in Mechanical Engineering, M.Tech, B.Tech',
    researchInterests: ['Composite Materials', 'Manufacturing Technologies', 'Finite Element Analysis', 'Thermal Engineering'],
    officeLocation: 'First Floor, A-Block (Administrative Block), Adjacent to VC Secretariat',
    officialEmail: 'registrar@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/administration.php',
    isLeadership: true,
  },
  {
    id: 'fac_chancellor_subbarao',
    name: 'Dr. Pavuluri Subba Rao',
    academicTitle: 'Dr.',
    designation: 'Chancellor',
    administrativeRole: 'Chancellor of the University & Titular Head',
    school: 'Central Administration',
    department: 'Statutory Administration',
    qualifications: 'Ph.D., Former Distinguished ISRO Space Scientist, Founder of Ananth Technologies',
    researchInterests: ['Satellite Telemetry', 'Aerospace Engineering', 'Space Systems', 'Defence Electronics'],
    officeLocation: 'Board Room, First Floor, A-Block',
    officialEmail: 'chancellor@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/administration.php',
    isLeadership: true,
  },

  // 2. University Deans
  {
    id: 'fac_dean_acad_veeranjaneyulu',
    name: 'Prof. N. Veeranjaneyulu',
    academicTitle: 'Prof. Dr.',
    designation: 'Dean',
    administrativeRole: 'Dean Academics & Curriculum Planning',
    school: 'School of Computing and Informatics',
    department: 'Information Technology (IT)',
    qualifications: 'Ph.D. in Computer Science & Engineering, M.Tech',
    researchInterests: ['Computer Networks', 'Wireless Sensor Networks', 'Information Security', 'Cloud Computing'],
    officeLocation: 'Second Floor, A-Block',
    officialEmail: 'dean_acad@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/directory.php',
    isLeadership: true,
  },
  {
    id: 'fac_dean_rnd_srinivasarao',
    name: 'Prof. G. Srinivasa Rao',
    academicTitle: 'Prof. Dr.',
    designation: 'Dean',
    administrativeRole: 'Dean Research & Development (R&D)',
    school: 'School of Electrical, Electronics & Communication Engineering',
    department: 'Electronics & Communication Engineering (ECE)',
    qualifications: 'Ph.D. in Signal Processing, M.Tech',
    researchInterests: ['Digital Signal Processing', 'Image Processing', 'Pattern Recognition', 'Biomedical Signal Analysis'],
    officeLocation: 'Second Floor, A-Block',
    officialEmail: 'dean_rnd@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/directory.php',
    isLeadership: true,
  },
  {
    id: 'fac_dean_sa_rukmini',
    name: 'Prof. M. S. S. Rukmini',
    academicTitle: 'Prof. Dr.',
    designation: 'Dean',
    administrativeRole: 'Dean Student Affairs & Campus Welfare',
    school: 'School of Electrical, Electronics & Communication Engineering',
    department: 'Electronics & Communication Engineering (ECE)',
    qualifications: 'Ph.D. in Wireless Communications, M.Tech',
    researchInterests: ['Wireless Communications', 'MIMO Systems', 'Antenna Design', 'Cognitive Radio'],
    officeLocation: 'Second Floor, A-Block',
    officialEmail: 'dean_sa@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/directory.php',
    isLeadership: true,
  },
  {
    id: 'fac_coe_varma',
    name: 'Prof. P. L. N. Varma',
    academicTitle: 'Prof. Dr.',
    designation: 'Dean',
    administrativeRole: 'Controller of Examinations (CoE)',
    school: 'School of Applied Sciences & Humanities',
    department: 'Applied Sciences & Humanities',
    qualifications: 'Ph.D. in Applied Mathematics, M.Sc',
    researchInterests: ['Fluid Dynamics', 'Differential Equations', 'Numerical Methods', 'Mathematical Modeling'],
    officeLocation: 'Third Floor, A-Block',
    officialEmail: 'coe@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/directory.php',
    isLeadership: true,
  },
  {
    id: 'fac_dean_placement_vijaykrishna',
    name: 'Dr. D. Vijay Krishna',
    academicTitle: 'Dr.',
    designation: 'Dean',
    administrativeRole: 'Dean Training & Placements (T&P)',
    school: 'Central Administration',
    department: 'Statutory Administration',
    qualifications: 'Ph.D. in Management & Human Resources, MBA',
    researchInterests: ['Corporate Relations', 'Talent Acquisition', 'Employability Skills', 'Competency Mapping'],
    officeLocation: 'Ground Floor, U-Block (Central Training Complex)',
    officialEmail: 'dean_placements@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/placements.php',
    isLeadership: true,
  },

  // 3. School Deans & Heads of Departments (HoDs) - Computing & Engineering
  {
    id: 'fac_hod_cse_sujatha',
    name: 'Dr. K. Sujatha',
    academicTitle: 'Dr.',
    designation: 'Head of Department',
    administrativeRole: 'Head of Department, Computer Science & Engineering (CSE)',
    school: 'School of Computing and Informatics',
    department: 'Computer Science & Engineering (CSE)',
    qualifications: 'Ph.D. in Computer Science & Engineering, M.Tech',
    researchInterests: ['Data Mining', 'Machine Learning', 'Artificial Intelligence', 'Natural Language Processing'],
    officeLocation: 'Second Floor, U-Block, Room U-204',
    officialEmail: 'hod_cse@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept1&deptnm=CSE&school=sch3',
    isLeadership: true,
  },
  {
    id: 'fac_hod_acse_premamayudu',
    name: 'Dr. B. Premamayudu',
    academicTitle: 'Dr.',
    designation: 'Head of Department',
    administrativeRole: 'Head of Department, Advanced Computer Science & Engineering (ACSE) & Dean Foreign Collaborations',
    school: 'School of Computing and Informatics',
    department: 'Advanced Computer Science & Engineering (ACSE)',
    qualifications: 'Ph.D. in Computer Science & Engineering, M.Tech',
    researchInterests: ['Deep Learning', 'Internet of Things (IoT)', 'Mobile Ad-hoc Networks', 'Generative AI & Computer Vision'],
    officeLocation: 'Third Floor, U-Block, Room U-302',
    officialEmail: 'hod_acse@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept2&deptnm=ACSE&school=sch3',
    isLeadership: true,
  },
  {
    id: 'fac_coord_aiml_phanikumar',
    name: 'Dr. S. V. Phani Kumar',
    academicTitle: 'Dr.',
    designation: 'Programme Coordinator',
    administrativeRole: 'Programme Coordinator, B.Tech CSE (Artificial Intelligence & Machine Learning - AIML)',
    school: 'School of Computing and Informatics',
    department: 'Advanced Computer Science & Engineering (ACSE)',
    qualifications: 'Ph.D. in Artificial Intelligence, M.Tech in CSE',
    researchInterests: ['Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'Reinforcement Learning', 'Generative AI', 'Computer Vision'],
    officeLocation: 'Third Floor, U-Block, AIML Centre of Excellence, Room U-315',
    officialEmail: 'aiml_coord@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept2&deptnm=ACSE&school=sch3',
    isLeadership: true,
  },
  {
    id: 'fac_coord_ds_tirupathirao',
    name: 'Dr. N. Tirupathi Rao',
    academicTitle: 'Dr.',
    designation: 'Programme Coordinator',
    administrativeRole: 'Programme Coordinator, B.Tech CSE (Data Science)',
    school: 'School of Computing and Informatics',
    department: 'Advanced Computer Science & Engineering (ACSE)',
    qualifications: 'Ph.D. in Computer Science, M.Tech',
    researchInterests: ['Big Data Analytics', 'Predictive Modeling', 'Data Science', 'Cloud Analytics', 'Statistical Machine Learning'],
    officeLocation: 'Third Floor, U-Block, Room U-318',
    officialEmail: 'ds_coord@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept2&deptnm=ACSE&school=sch3',
    isLeadership: true,
  },
  {
    id: 'fac_coord_cyber_ramakoteswararao',
    name: 'Dr. G. Rama Koteswara Rao',
    academicTitle: 'Dr.',
    designation: 'Programme Coordinator',
    administrativeRole: 'Programme Coordinator, B.Tech CSE (Cyber Security)',
    school: 'School of Computing and Informatics',
    department: 'Advanced Computer Science & Engineering (ACSE)',
    qualifications: 'Ph.D. in Information Security, M.Tech',
    researchInterests: ['Network Security', 'Cryptography', 'Ethical Hacking', 'Blockchain Technology', 'Malware Analysis'],
    officeLocation: 'Fourth Floor, U-Block, Room U-406',
    officialEmail: 'cyber_coord@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept2&deptnm=ACSE&school=sch3',
    isLeadership: true,
  },
  {
    id: 'fac_hod_it_sunitha',
    name: 'Dr. K. V. N. Sunitha',
    academicTitle: 'Dr.',
    designation: 'Head of Department',
    administrativeRole: 'Head of Department, Information Technology (IT)',
    school: 'School of Computing and Informatics',
    department: 'Information Technology (IT)',
    qualifications: 'Ph.D. in Computer Science, M.Tech',
    researchInterests: ['Natural Language Processing', 'Speech Processing', 'Artificial Intelligence', 'Compiler Design'],
    officeLocation: 'Ground Floor, U-Block, Room U-008',
    officialEmail: 'hod_it@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/department.php',
    isLeadership: true,
  },

  // 4. Electrical, Electronics & Communication Leadership
  {
    id: 'fac_dean_sece_pitchaiah',
    name: 'Prof. T. Pitchaiah',
    academicTitle: 'Prof. Dr.',
    designation: 'Dean',
    administrativeRole: 'Dean, School of Electrical, Electronics and Communication Engineering (SECE)',
    school: 'School of Electrical, Electronics & Communication Engineering',
    department: 'Electronics & Communication Engineering (ECE)',
    qualifications: 'Ph.D. in Wireless Networks, M.Tech',
    researchInterests: ['Wireless Communication', 'Optical Networks', '5G Communications', 'IoT Sensors'],
    officeLocation: 'First Floor, E-Block, Room E-102',
    officialEmail: 'dean_sece@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/department.php',
    isLeadership: true,
  },
  {
    id: 'fac_hod_ece_sarada',
    name: 'Dr. M. Sarada',
    academicTitle: 'Dr.',
    designation: 'Head of Department',
    administrativeRole: 'Head of Department, Electronics & Communication Engineering (ECE)',
    school: 'School of Electrical, Electronics & Communication Engineering',
    department: 'Electronics & Communication Engineering (ECE)',
    qualifications: 'Ph.D. in VLSI Systems, M.Tech',
    researchInterests: ['VLSI Circuit Design', 'Low Power Electronics', 'Embedded Systems', 'FPGA Prototyping'],
    officeLocation: 'Ground Floor, E-Block, Room E-010',
    officialEmail: 'hod_ece@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/department.php',
    isLeadership: true,
  },
  {
    id: 'fac_hod_eee_durgasukumar',
    name: 'Dr. G. Durga Sukumar',
    academicTitle: 'Dr.',
    designation: 'Head of Department',
    administrativeRole: 'Head of Department, Electrical & Electronics Engineering (EEE)',
    school: 'School of Electrical, Electronics & Communication Engineering',
    department: 'Electrical & Electronics Engineering (EEE)',
    qualifications: 'Ph.D. in Power Systems, M.Tech',
    researchInterests: ['Smart Grids', 'Renewable Energy Integration', 'Power Electronics & Electric Vehicles', 'High Voltage Engineering'],
    officeLocation: 'Third Floor, E-Block, Room E-301',
    officialEmail: 'hod_eee@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/department.php',
    isLeadership: true,
  },

  // 5. Mechanical, Civil, Biotech & Management Leadership
  {
    id: 'fac_hod_mech_satyanarayana',
    name: 'Dr. D. Satyanarayana',
    academicTitle: 'Dr.',
    designation: 'Head of Department',
    administrativeRole: 'Head of Department, Mechanical Engineering',
    school: 'School of Mechanical, Civil and Environmental Engineering',
    department: 'Mechanical Engineering',
    qualifications: 'Ph.D. in Thermal & Fluid Systems, M.Tech',
    researchInterests: ['Thermal Engineering', 'Computational Fluid Dynamics (CFD)', 'Renewable Energy Systems', 'Refrigeration & Cryogenics'],
    officeLocation: 'Second Floor, M-Block, Room M-205',
    officialEmail: 'hod_mech@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/department.php',
    isLeadership: true,
  },
  {
    id: 'fac_hod_civil_ashokkumar',
    name: 'Dr. P. Ashok Kumar',
    academicTitle: 'Dr.',
    designation: 'Head of Department',
    administrativeRole: 'Head of Department, Civil Engineering',
    school: 'School of Mechanical, Civil and Environmental Engineering',
    department: 'Civil Engineering',
    qualifications: 'Ph.D. in Structural Engineering, M.Tech',
    researchInterests: ['Earthquake Resistant Structures', 'Geopolymer Concrete', 'Structural Health Monitoring', 'Highway Engineering'],
    officeLocation: 'Ground Floor, M-Block, Room M-004',
    officialEmail: 'hod_civil@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/department.php',
    isLeadership: true,
  },
  {
    id: 'fac_hod_biotech_johnbabu',
    name: 'Dr. D. John Babu',
    academicTitle: 'Dr.',
    designation: 'Head of Department',
    administrativeRole: 'Head of Department, Biotechnology',
    school: 'School of Biotechnology & Pharmaceutical Sciences',
    department: 'Biotechnology',
    qualifications: 'Ph.D. in Bioprocess Technology, M.Tech',
    researchInterests: ['Bioprocess Engineering', 'Industrial Fermentation', 'Bioinformatics', 'Cancer Biology & Drug Discovery'],
    officeLocation: 'Third Floor, H-Block, Room H-302',
    officialEmail: 'hod_biotech@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/department.php',
    isLeadership: true,
  },
  {
    id: 'fac_hod_foodtech_basha',
    name: 'Dr. S. K. M. Basha',
    academicTitle: 'Dr.',
    designation: 'Head of Department',
    administrativeRole: 'Head of Department, Food Technology',
    school: 'School of Biotechnology & Pharmaceutical Sciences',
    department: 'Food Technology',
    qualifications: 'Ph.D. in Food Engineering, M.Tech',
    researchInterests: ['Food Preservation Technologies', 'Nutraceuticals', 'Post-Harvest Processing', 'Food Safety & Quality Assurance'],
    officeLocation: 'Fourth Floor, H-Block, Room H-401',
    officialEmail: 'hod_foodtech@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/department.php',
    isLeadership: true,
  },
  {
    id: 'fac_dean_sms_kalpana',
    name: 'Prof. K. Kalpana',
    academicTitle: 'Prof. Dr.',
    designation: 'Head of Department',
    administrativeRole: 'Dean & Head, School of Management Studies (SMS)',
    school: 'School of Management Studies',
    department: 'Management Studies (SMS)',
    qualifications: 'Ph.D. in Finance, MBA',
    researchInterests: ['Financial Analytics', 'Corporate Governance', 'Behavioral Finance', 'Stock Markets'],
    officeLocation: 'First Floor, Management Block, Room SMS-101',
    officialEmail: 'hod_mba@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/department.php',
    isLeadership: true,
  },
  {
    id: 'fac_principal_pharm_srinivasababu',
    name: 'Dr. P. Srinivasa Babu',
    academicTitle: 'Dr.',
    designation: 'Head of Department',
    administrativeRole: 'Principal & Head, School of Pharmacy',
    school: 'School of Biotechnology & Pharmaceutical Sciences',
    department: 'Pharmacy',
    qualifications: 'Ph.D. in Pharmaceutical Analysis, M.Pharm',
    researchInterests: ['Novel Drug Delivery Systems', 'Pharmacokinetics', 'Analytical Method Development', 'Phytopharmaceuticals'],
    officeLocation: 'Ground Floor, Pharmacy Block, Principal Chamber',
    officialEmail: 'principal_pharmacy@vignan.ac.in',
    profileUrl: 'https://vignan.ac.in/newvignan/department.php',
    isLeadership: true,
  },

  // 6. Senior Professors & Key Research Faculty (CSE, Machine Learning, Generative AI)
  {
    id: 'fac_prof_cse_venkatesulu',
    name: 'Prof. D. Venkatesulu',
    academicTitle: 'Prof. Dr.',
    designation: 'Professor',
    administrativeRole: 'Senior Professor of CSE & Former HoD',
    school: 'School of Computing and Informatics',
    department: 'Computer Science & Engineering (CSE)',
    qualifications: 'Ph.D. in Computer Science, M.Tech',
    researchInterests: ['Algorithms & Complexity', 'Machine Learning', 'Data Mining', 'Artificial Intelligence', 'Natural Language Processing'],
    officeLocation: 'Second Floor, U-Block, Room U-212',
    profileUrl: 'https://vignan.ac.in/newvignan/people.php',
    isLeadership: false,
  },
  {
    id: 'fac_prof_acse_snirupama',
    name: 'Dr. M. Nirupama Bhat',
    academicTitle: 'Dr.',
    designation: 'Associate Professor',
    administrativeRole: 'IoT & Smart Systems Coordinator',
    school: 'School of Computing and Informatics',
    department: 'Advanced Computer Science & Engineering (ACSE)',
    qualifications: 'Ph.D. in Computer Science, M.Tech',
    researchInterests: ['Internet of Things (IoT)', 'Embedded AI', 'Smart Campus Automation', 'Machine Learning Applications'],
    officeLocation: 'Fourth Floor, U-Block, Room U-410',
    profileUrl: 'https://vignan.ac.in/newvignan/people.php',
    isLeadership: false,
  },
  {
    id: 'fac_prof_acse_genai_raghavendra',
    name: 'Dr. Ch. Raghavendra',
    academicTitle: 'Dr.',
    designation: 'Associate Professor',
    administrativeRole: 'Generative AI Research Group Lead',
    school: 'School of Computing and Informatics',
    department: 'Advanced Computer Science & Engineering (ACSE)',
    qualifications: 'Ph.D. in Machine Learning, M.Tech',
    researchInterests: ['Generative AI', 'Large Language Models (LLMs)', 'Deep Learning', 'Computer Vision', 'Retrieval-Augmented Generation (RAG)'],
    officeLocation: 'Third Floor, U-Block, Room U-322',
    profileUrl: 'https://vignan.ac.in/newvignan/people.php',
    isLeadership: false,
  },
  {
    id: 'fac_asstprof_ds_anil',
    name: 'Dr. K. Anil Kumar',
    academicTitle: 'Dr.',
    designation: 'Assistant Professor',
    school: 'School of Computing and Informatics',
    department: 'Advanced Computer Science & Engineering (ACSE)',
    qualifications: 'Ph.D. in Data Science, M.Tech',
    researchInterests: ['Machine Learning', 'Big Data Engineering', 'Deep Reinforcement Learning', 'Natural Language Understanding'],
    officeLocation: 'Third Floor, U-Block, Room U-328',
    profileUrl: 'https://vignan.ac.in/newvignan/people.php',
    isLeadership: false,
  },
  {
    id: 'fac_asstprof_cyber_bhanu',
    name: 'Dr. P. Bhanu Prakash',
    academicTitle: 'Dr.',
    designation: 'Assistant Professor',
    school: 'School of Computing and Informatics',
    department: 'Advanced Computer Science & Engineering (ACSE)',
    qualifications: 'Ph.D. in Cyber Security, M.Tech',
    researchInterests: ['Cyber Threat Intelligence', 'Cloud Security', 'Intrusion Detection Systems', 'Applied Cryptography'],
    officeLocation: 'Fourth Floor, U-Block, Room U-414',
    profileUrl: 'https://vignan.ac.in/newvignan/people.php',
    isLeadership: false,
  },
];

export function getAllFaculty(): FacultyProfile[] {
  return VIGNAN_FACULTY_DIRECTORY;
}

export function getFacultyByDepartment(departmentName: string): FacultyProfile[] {
  const norm = departmentName.toLowerCase();
  return VIGNAN_FACULTY_DIRECTORY.filter((f) => f.department.toLowerCase().includes(norm));
}

export function getFacultyBySchool(schoolName: string): FacultyProfile[] {
  const norm = schoolName.toLowerCase();
  return VIGNAN_FACULTY_DIRECTORY.filter((f) => f.school.toLowerCase().includes(norm));
}

export function getFacultyByDesignation(designation: string): FacultyProfile[] {
  const norm = designation.toLowerCase();
  return VIGNAN_FACULTY_DIRECTORY.filter((f) => f.designation.toLowerCase().includes(norm));
}

export function searchFacultyByResearch(researchKeyword: string): FacultyProfile[] {
  const q = researchKeyword.toLowerCase();
  return VIGNAN_FACULTY_DIRECTORY.filter((f) =>
    f.researchInterests.some((ri) => ri.toLowerCase().includes(q))
  );
}

export function getFacultyByName(name: string): FacultyProfile | undefined {
  const q = name.toLowerCase().replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '').trim();
  return VIGNAN_FACULTY_DIRECTORY.find((f) => f.name.toLowerCase().includes(q));
}
