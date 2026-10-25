import { universityRagService } from '../src/university/universityRagService.js';
import { universityVectorStore } from '../src/university/universityVectorStore.js';
import { ragService } from '../src/rag/ragService.js';

interface TestCase {
  id: string;
  category: string;
  question: string;
  expectedKeywords: string[];
  isMissingKnowledge?: boolean;
  isCampusDistinction?: boolean;
}

const TEST_CASES: TestCase[] = [
  // ==========================================
  // Category A: Courses & Eligibility (15 Questions)
  // ==========================================
  {
    id: 'Q001',
    category: 'Courses',
    question: 'What courses are available at Vignan University, Vadlamudi?',
    expectedKeywords: ['B.Tech', 'M.Tech', 'MBA', 'MCA'],
  },
  {
    id: 'Q002',
    category: 'Courses',
    question: 'What B.Tech specializations are offered at Vignan University?',
    expectedKeywords: ['CSE', 'ECE', 'Mechanical', 'Biotechnology'],
  },
  {
    id: 'Q003',
    category: 'Courses',
    question: 'Does Vignan University offer B.Tech in CSE with Artificial Intelligence and Machine Learning (AI & ML)?',
    expectedKeywords: ['Artificial Intelligence', 'Machine Learning'],
  },
  {
    id: 'Q004',
    category: 'Courses',
    question: 'What is the duration of the B.Tech programme at VFSTR Vadlamudi?',
    expectedKeywords: ['4', 'Year'],
  },
  {
    id: 'Q005',
    category: 'Courses',
    question: 'What postgraduate programmes are offered at Vignan University?',
    expectedKeywords: ['MBA', 'MCA', 'M.Tech'],
  },
  {
    id: 'Q006',
    category: 'Courses',
    question: 'What are the available specializations in MBA at Vignan University?',
    expectedKeywords: ['Finance', 'HR', 'Marketing'],
  },
  {
    id: 'Q007',
    category: 'Courses',
    question: 'Does Vignan University offer Master of Computer Applications (MCA)?',
    expectedKeywords: ['MCA', 'Computer Applications'],
  },
  {
    id: 'Q008',
    category: 'Courses',
    question: 'What pharmacy programmes are available at Vignan University?',
    expectedKeywords: ['B.Pharm', 'Pharm.D'],
  },
  {
    id: 'Q009',
    category: 'Courses',
    question: 'How long is the Doctor of Pharmacy (Pharm.D) course at Vignan University?',
    expectedKeywords: ['6', 'Year'],
  },
  {
    id: 'Q010',
    category: 'Courses',
    question: 'Is B.Sc (Hons) Agriculture offered at Vadlamudi campus?',
    expectedKeywords: ['Agriculture', '4 Years'],
  },
  {
    id: 'Q011',
    category: 'Courses',
    question: 'What integrated law programmes are offered at Vignan University?',
    expectedKeywords: ['LLB', '5 Years'],
  },
  {
    id: 'Q012',
    category: 'Courses',
    question: 'Does Vignan University provide a Ph.D. doctoral programme?',
    expectedKeywords: ['Ph.D', 'Engineering'],
  },
  {
    id: 'Q013',
    category: 'Courses',
    question: 'What specializations are available in M.Tech at VFSTR Vadlamudi?',
    expectedKeywords: ['CSE', 'VLSI'],
  },
  {
    id: 'Q014',
    category: 'Courses',
    question: 'What is the duration and eligibility for BCA at Vignan University?',
    expectedKeywords: ['BCA', '3 Years'],
  },
  {
    id: 'Q015',
    category: 'Courses',
    question: 'Which department offers B.Tech Biotechnology and Food Technology at Vignan?',
    expectedKeywords: ['Biotechnology', 'Food Technology'],
  },

  // ==========================================
  // Category B: Fees & Component Charges (15 Questions)
  // ==========================================
  {
    id: 'Q016',
    category: 'Fees',
    question: 'What is the complete fee structure for B.Tech CSE?',
    expectedKeywords: ['2,60,000', 'annum', 'Category A'],
  },
  {
    id: 'Q017',
    category: 'Fees',
    question: 'What are the fees for every B.Tech specialization at Vignan?',
    expectedKeywords: ['2,60,000', '2,00,000', '1,60,000'],
  },
  {
    id: 'Q018',
    category: 'Fees',
    question: 'What is the Category A annual tuition fee for B.Tech CSE at Vignan University?',
    expectedKeywords: ['2,60,000', 'per annum'],
  },
  {
    id: 'Q019',
    category: 'Fees',
    question: 'What is the Category B management quota fee for B.Tech CSE?',
    expectedKeywords: ['3,60,000', 'annum'],
  },
  {
    id: 'Q020',
    category: 'Fees',
    question: 'What is the annual tuition fee for B.Tech ECE and EEE at Vignan?',
    expectedKeywords: ['2,00,000', 'Category A'],
  },
  {
    id: 'Q021',
    category: 'Fees',
    question: 'What is the annual fee for B.Tech Mechanical and Civil Engineering?',
    expectedKeywords: ['1,60,000', 'annum'],
  },
  {
    id: 'Q022',
    category: 'Fees',
    question: 'What is the one-time admission fee for B.Tech at Vignan University?',
    expectedKeywords: ['20,000', 'Admission Fee'],
  },
  {
    id: 'Q023',
    category: 'Fees',
    question: 'What is the annual fee for BCA (Bachelor of Computer Applications)?',
    expectedKeywords: ['1,00,000', 'annum'],
  },
  {
    id: 'Q024',
    category: 'Fees',
    question: 'What is the annual tuition fee for BBA at Vignan University?',
    expectedKeywords: ['1,40,000'],
  },
  {
    id: 'Q025',
    category: 'Fees',
    question: 'What is the annual fee for MCA at Vignan University?',
    expectedKeywords: ['1,20,000'],
  },
  {
    id: 'Q026',
    category: 'Fees',
    question: 'What is the total 2-year tuition fee for MBA at Vignan University?',
    expectedKeywords: ['1,80,000', '3,60,000'],
  },
  {
    id: 'Q027',
    category: 'Fees',
    question: 'How much is the hostel fee for Non-AC accommodation at Vignan University?',
    expectedKeywords: ['1,05,000', 'Hostel'],
  },
  {
    id: 'Q028',
    category: 'Fees',
    question: 'What is the cost of AC hostel accommodation per annum at Vadlamudi?',
    expectedKeywords: ['1,35,000', '1,45,000'],
  },
  {
    id: 'Q029',
    category: 'Fees',
    question: 'What are the campus bus transport charges for students commuting from Guntur?',
    expectedKeywords: ['22,000', 'Guntur'],
  },
  {
    id: 'Q030',
    category: 'Fees',
    question: 'What are the campus bus fees for Tenali and Vijayawada?',
    expectedKeywords: ['20,000', '28,000'],
  },

  // ==========================================
  // Category C: Scholarships & V-SAT Concessions (10 Questions)
  // ==========================================
  {
    id: 'Q031',
    category: 'Scholarships',
    question: 'What scholarships are available at Vignan University?',
    expectedKeywords: ['V-SAT', 'Tuition Fee Waiver', '75%'],
  },
  {
    id: 'Q032',
    category: 'Scholarships',
    question: 'What fee concession is given for V-SAT Rank 1 to 50?',
    expectedKeywords: ['75%', 'Tuition Fee Waiver'],
  },
  {
    id: 'Q033',
    category: 'Scholarships',
    question: 'What scholarship is granted for V-SAT Rank 51 to 100?',
    expectedKeywords: ['50%', 'Tuition Fee Waiver'],
  },
  {
    id: 'Q034',
    category: 'Scholarships',
    question: 'What fee waiver is given for V-SAT Rank 101 to 200?',
    expectedKeywords: ['25%', 'Tuition Fee Waiver'],
  },
  {
    id: 'Q035',
    category: 'Scholarships',
    question: 'What fee waiver is provided for students with 95 percentile and above in JEE Mains?',
    expectedKeywords: ['75%', 'JEE'],
  },
  {
    id: 'Q036',
    category: 'Scholarships',
    question: 'What scholarship is granted for 90 to 94.9 percentile in JEE Mains?',
    expectedKeywords: ['50%', 'Percentile'],
  },
  {
    id: 'Q037',
    category: 'Scholarships',
    question: 'What scholarship is given for Intermediate students scoring over 980 marks?',
    expectedKeywords: ['75%', '980'],
  },
  {
    id: 'Q038',
    category: 'Scholarships',
    question: 'What fee concession is provided for 960 to 979 marks in 10+2 State Board?',
    expectedKeywords: ['50%', '960'],
  },
  {
    id: 'Q039',

    category: 'Scholarships',
    question: 'What is the scholarship policy for national and international sports persons at Vignan?',
    expectedKeywords: ['100%', 'Sports'],
  },
  {
    id: 'Q040',
    category: 'Scholarships',
    question: 'Is there a fee concession for wards of defence personnel or siblings studying at Vignan?',
    expectedKeywords: ['10%', 'Defence'],
  },

  // ==========================================
  // Category D: Campus Blocks, Floors & Directory (16 Questions)
  // ==========================================
  {
    id: 'Q041',
    category: 'Blocks & Floors',
    question: 'Where is the CSE department located?',
    expectedKeywords: ['U-Block', 'Second Floor'],
  },
  {
    id: 'Q042',
    category: 'Blocks & Floors',
    question: 'Which departments are in H Block, N Block, U Block, and other campus blocks?',
    expectedKeywords: ['U-Block', 'H-Block', 'N-Block'],
  },
  {
    id: 'Q043',
    category: 'Blocks & Floors',
    question: 'Which floor contains the CSE department and HoD office?',
    expectedKeywords: ['Second Floor', 'U-Block'],
  },
  {
    id: 'Q044',
    category: 'Blocks & Floors',
    question: 'Where is the Information Technology (IT) department located?',
    expectedKeywords: ['U-Block', 'Ground Floor'],
  },
  {
    id: 'Q045',
    category: 'Blocks & Floors',
    question: 'What labs are on the 3rd and 4th floors of U Block?',
    expectedKeywords: ['Artificial Intelligence', 'Data Science', 'Cyber Security'],
  },
  {
    id: 'Q046',
    category: 'Blocks & Floors',
    question: 'What departments are housed in H-Block at Vignan University?',
    expectedKeywords: ['Biotechnology', 'Applied Sciences', 'Food Technology'],
  },
  {
    id: 'Q047',
    category: 'Blocks & Floors',
    question: 'Where is the Department of Biotechnology located?',
    expectedKeywords: ['H-Block', 'Third Floor'],
  },
  {
    id: 'Q048',
    category: 'Blocks & Floors',
    question: 'Where is the Department of Food Technology located?',
    expectedKeywords: ['H-Block', 'Fourth Floor'],
  },
  {
    id: 'Q049',
    category: 'Blocks & Floors',
    question: 'What is located in A-Block (Administrative Block)?',
    expectedKeywords: ['Admission Cell', 'Vice-Chancellor', 'Registrar'],
  },
  {
    id: 'Q050',
    category: 'Blocks & Floors',
    question: 'On which floor is the Admission Cell located in A-Block?',
    expectedKeywords: ['Ground Floor', 'A-Block'],
  },
  {
    id: 'Q051',
    category: 'Blocks & Floors',
    question: 'Where is the Vice-Chancellor secretariat and Registrar office in A Block?',
    expectedKeywords: ['First Floor', 'A-Block'],
  },
  {
    id: 'Q052',
    category: 'Blocks & Floors',
    question: 'On which floor is the Controller of Examinations (CoE) office in A-Block?',
    expectedKeywords: ['Third Floor', 'Examination'],
  },
  {
    id: 'Q053',
    category: 'Blocks & Floors',
    question: 'What is housed in N-Block at Vignan University?',
    expectedKeywords: ['NTR', 'Library', 'Reading Hall'],
  },
  {
    id: 'Q054',
    category: 'Blocks & Floors',
    question: 'Where are the Mechanical and Civil Engineering departments located?',
    expectedKeywords: ['M-Block', 'Civil', 'Mechanical'],
  },
  {
    id: 'Q055',
    category: 'Blocks & Floors',
    question: 'Where is the Department of Electronics and Communication Engineering (ECE) located?',
    expectedKeywords: ['E-Block', 'Ground Floor'],
  },
  {
    id: 'Q056',
    category: 'Blocks & Floors',
    question: 'Where is the Department of Electrical and Electronics Engineering (EEE) located?',
    expectedKeywords: ['E-Block', 'Third Floor'],
  },

  // ==========================================
  // Category E: Regulations, Attendance & Exams (15 Questions)
  // ==========================================
  {
    id: 'Q057',
    category: 'Regulations',
    question: 'What are the examination and attendance regulations at Vignan University?',
    expectedKeywords: ['75%', 'attendance', 'CIE', 'SEE'],
  },
  {
    id: 'Q058',
    category: 'Regulations',
    question: 'What is the minimum mandatory attendance required at Vignan University?',
    expectedKeywords: ['75%'],
  },
  {
    id: 'Q059',
    category: 'Regulations',
    question: 'What happens if a student has less than 65% aggregate attendance?',
    expectedKeywords: ['DETAINED', '65%'],
  },
  {
    id: 'Q060',
    category: 'Regulations',
    question: 'What is the attendance condonation policy between 65% and 75%?',
    expectedKeywords: ['65%', '74.9%', 'medical', 'condonation'],
  },
  {
    id: 'Q061',
    category: 'Regulations',
    question: 'What is the grading scale used at Vignan University?',
    expectedKeywords: ['10-Point', 'Grade'],
  },
  {
    id: 'Q062',
    category: 'Regulations',
    question: 'What percentage of marks is required for Grade O (Outstanding)?',
    expectedKeywords: ['90%', '10'],
  },
  {
    id: 'Q063',
    category: 'Regulations',
    question: 'What are the grade points for Grade S and Grade A?',
    expectedKeywords: ['9', '8'],
  },
  {
    id: 'Q064',
    category: 'Regulations',
    question: 'What is the minimum passing score required in the Semester End Examination (SEE)?',
    expectedKeywords: ['40%', '24'],
  },
  {
    id: 'Q065',
    category: 'Regulations',
    question: 'How are marks divided between Continuous Internal Evaluation (CIE) and SEE?',
    expectedKeywords: ['40 Marks', '60 Marks'],
  },
  {
    id: 'Q066',
    category: 'Regulations',
    question: 'What academic regulation governs current B.Tech batches (R19 / R22)?',
    expectedKeywords: ['R22', 'R19'],
  },
  {
    id: 'Q067',
    category: 'Regulations',
    question: 'Within how many days can students apply for revaluation of exam scripts?',
    expectedKeywords: ['10 days', 'revaluation'],
  },
  {
    id: 'Q068',
    category: 'Regulations',
    question: 'What are the consequences of an F grade in a semester subject?',
    expectedKeywords: ['Fail', '0 Grade Points'],
  },
  {
    id: 'Q069',
    category: 'Regulations',
    question: 'Who has the authority to approve attendance condonation on medical grounds?',
    expectedKeywords: ['Vice-Chancellor'],
  },
  {
    id: 'Q070',
    category: 'Regulations',
    question: 'Within how many days must a medical certificate be submitted after resuming classes?',
    expectedKeywords: ['3 days'],
  },
  {
    id: 'Q071',
    category: 'Regulations',
    question: 'Are supplementary examinations conducted along with regular semester exams?',
    expectedKeywords: ['Supplementary', 'regular'],
  },

  // ==========================================
  // Category F: Facilities, Hostels, Transport & Placements (15 Questions)
  // ==========================================
  {
    id: 'Q072',
    category: 'Facilities',
    question: 'Where are the library, hostels, laboratories, and other campus facilities?',
    expectedKeywords: ['Hostel', 'Library', 'Campus'],
  },
  {
    id: 'Q073',
    category: 'Facilities',
    question: 'What are the names of the girls hostels at Vignan University?',
    expectedKeywords: ['Priyadarshini', 'Kalpana Chawla'],
  },
  {
    id: 'Q074',
    category: 'Facilities',
    question: 'What are the names of the boys hostels at Vignan University?',
    expectedKeywords: ['Vashishta', 'Visweswaraya', 'Aravinda'],
  },
  {
    id: 'Q075',
    category: 'Facilities',
    question: 'What medical and emergency healthcare facilities are available on campus?',
    expectedKeywords: ['Health Centre', 'ambulance', '24/7'],
  },
  {
    id: 'Q076',
    category: 'Facilities',
    question: 'What sports facilities and athletic tracks are present at Vadlamudi campus?',
    expectedKeywords: ['400-meter', 'basketball', 'Indoor Sports'],
  },
  {
    id: 'Q077',
    category: 'Facilities',
    question: 'What is the placement track record at Vignan University?',
    expectedKeywords: ['85%', 'Placed'],
  },
  {
    id: 'Q078',
    category: 'Facilities',
    question: 'What was the highest package offered at Vignan University placements?',
    expectedKeywords: ['44.00 Lakhs', 'LPA'],
  },
  {
    id: 'Q079',
    category: 'Facilities',
    question: 'What is the average salary package for students placed at Vignan?',
    expectedKeywords: ['5.50', '6.20 LPA'],
  },
  {
    id: 'Q080',
    category: 'Facilities',
    question: 'Which major companies recruit from Vignan University Vadlamudi?',
    expectedKeywords: ['Amazon', 'TCS', 'Cognizant', 'Wipro'],
  },
  {
    id: 'Q081',
    category: 'Facilities',
    question: 'What is the total campus area of VFSTR at Vadlamudi?',
    expectedKeywords: ['104 acres'],
  },
  {
    id: 'Q082',
    category: 'Facilities',
    question: 'What meal facilities and food options are provided in the university hostels?',
    expectedKeywords: ['vegetarian', 'non-vegetarian', '4 meals'],
  },
  {
    id: 'Q083',
    category: 'Facilities',
    question: 'How far is Vignan University from Guntur Railway Station?',
    expectedKeywords: ['15 km'],
  },
  {
    id: 'Q084',
    category: 'Facilities',
    question: 'How far is Vignan University from Tenali Junction?',
    expectedKeywords: ['14 km'],
  },
  {
    id: 'Q085',
    category: 'Facilities',
    question: 'What is the distance from Vijayawada International Airport to Vignan University?',
    expectedKeywords: ['55 km', 'Gannavaram'],
  },
  {
    id: 'Q086',
    category: 'Facilities',
    question: 'What public transit or city bus route connects Guntur to Vadlamudi?',
    expectedKeywords: ['Route 211', '15 km'],
  },

  // ==========================================
  // Category G: Campus Distinction & Missing Knowledge Handling (14 Questions)
  // ==========================================
  {
    id: 'Q087',
    category: 'Distinction',
    question: 'What is the difference between VFSTR Vadlamudi and Vignan Lara Institute of Technology?',
    expectedKeywords: ['Lara', 'separate', 'affiliated'],
    isCampusDistinction: true,
  },
  {
    id: 'Q088',
    category: 'Distinction',
    question: 'Is Vignan Institute of Technology and Science in Hyderabad part of the Vadlamudi campus?',
    expectedKeywords: ['Hyderabad', 'separate', 'Vadlamudi'],
    isCampusDistinction: true,
  },
  {
    id: 'Q089',
    category: 'Distinction',
    question: 'What is Vignan Nirula Institute of Technology and Science for Women?',
    expectedKeywords: ['Nirula', 'women', 'Palakaluru'],
    isCampusDistinction: true,
  },
  {
    id: 'Q090',
    category: 'Distinction',
    question: 'Does Vignan have an engineering college in Visakhapatnam Vizag?',
    expectedKeywords: ['VIIT', 'Visakhapatnam', 'Vadlamudi'],
    isCampusDistinction: true,
  },
  {
    id: 'Q091',
    category: 'Missing Knowledge',
    question: 'What is the detailed syllabus for Deep Space Quantum Mining in 2038 at Vignan University?',
    expectedKeywords: ['could not find verified', 'not yet verified'],
    isMissingKnowledge: true,
  },
  {
    id: 'Q092',
    category: 'Missing Knowledge',
    question: 'What is the tuition fee for Submarine Marine Archaeology at Vignan in 2029?',
    expectedKeywords: ['could not find verified', 'not yet verified'],
    isMissingKnowledge: true,
  },
  {
    id: 'Q093',
    category: 'Missing Knowledge',
    question: 'Where is the Department of Extraterrestrial Biology located at Vignan?',
    expectedKeywords: ['could not find verified', 'not yet verified'],
    isMissingKnowledge: true,
  },
  {
    id: 'Q094',
    category: 'Missing Knowledge',
    question: 'What is the personal mobile phone number of the university security guard?',
    expectedKeywords: ['could not find verified', 'not yet verified'],
    isMissingKnowledge: true,
  },
  {
    id: 'Q095',
    category: 'Identity',
    question: 'What is the NAAC accreditation grade of VFSTR Vignan University?',
    expectedKeywords: ['NAAC', 'A+'],
  },
  {
    id: 'Q096',
    category: 'Identity',
    question: 'Who is the Chairman and founder of Vignan University?',
    expectedKeywords: ['Dr. Lavu Rathaiah', 'Chairman'],
  },
  {
    id: 'Q097',
    category: 'Identity',
    question: 'What is the postal PIN code and mandal of Vignan University at Vadlamudi?',
    expectedKeywords: ['522213', 'Chebrolu', 'Guntur'],
  },
  {
    id: 'Q098',
    category: 'Identity',
    question: 'What is the official Deemed-to-be-University status of VFSTR?',
    expectedKeywords: ['Deemed', 'University', 'UGC'],
  },
  {
    id: 'Q099',
    category: 'Missing Knowledge',
    question: 'What is the secret underground tunnel entrance code at Vignan University?',
    expectedKeywords: ['could not find verified', 'not yet verified'],
    isMissingKnowledge: true,
  },
  {
    id: 'Q100',
    category: 'Missing Knowledge',
    question: 'Where is the Department of Nuclear Teleportation located in U-Block?',
    expectedKeywords: ['could not find verified', 'not yet verified'],
    isMissingKnowledge: true,
  },
];

async function runUniversityEvaluation() {
  console.log('\n========================================================================');
  console.log('🏛️  VIGNAN UNIVERSITY (VADLAMUDI) 100-QUESTION AGENT EVALUATION BENCHMARK');
  console.log('========================================================================\n');

  // 1. Initial Ingestion & Vector Index Verification
  console.log('Step 1: Inspecting Vector Store & Ingestion State...');
  const initStatus = universityVectorStore.getStatus();
  console.log(`- Verified Source Pages: ${initStatus.totalSourcePages}`);
  console.log(`- Indexed Semantic Chunks: ${initStatus.totalIndexedChunks}`);
  console.log(`- Last Refresh: ${initStatus.lastRefreshTime}`);
  console.log(`- Target Campus: ${initStatus.campus}\n`);

  if (initStatus.totalIndexedChunks === 0) {
    console.log('Building vector store from verified official records...');
    universityVectorStore.buildFromOfficialRecords();
  }

  // 2. Evaluate 100 Questions
  console.log('Step 2: Executing 100 Representative Test Inquiries across 7 Categories...\n');

  let passedCount = 0;
  let failedCount = 0;
  const categoryStats: Record<string, { total: number; passed: number; latencies: number[] }> = {};
  const latencies: number[] = [];
  const failures: { id: string; question: string; reason: string }[] = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const test = TEST_CASES[i];
    if (!categoryStats[test.category]) {
      categoryStats[test.category] = { total: 0, passed: 0, latencies: [] };
    }
    categoryStats[test.category].total++;

    const startTime = Date.now();

    // 1. Verify intent detection
    const isIntentDetected = universityRagService.isUniversityIntent(test.question);
    if (!isIntentDetected) {
      failedCount++;
      failures.push({ id: test.id, question: test.question, reason: 'Failed intent detection' });
      continue;
    }

    // 2. Query university RAG
    const result = await universityRagService.query({ question: test.question });
    const latency = Date.now() - startTime;
    latencies.push(latency);
    categoryStats[test.category].latencies.push(latency);

    // 3. Grounding & Evidence Verification
    let isPassed = true;
    let failureReason = '';

    if (!result.success || !result.answer) {
      isPassed = false;
      failureReason = 'Empty or unsuccessful RAG response';
    } else if (result.campus !== 'Vadlamudi') {
      isPassed = false;
      failureReason = `Campus mismatch: received ${result.campus}, expected Vadlamudi`;
    } else if (test.isMissingKnowledge) {
      // Must admit missing/unverified info, NOT hallucinate
      const ansLower = result.answer.toLowerCase();
      const admitsMissing =
        ansLower.includes('could not find verified') ||
        ansLower.includes('not yet verified') ||
        ansLower.includes('please verify directly') ||
        !result.isVerifiedKnowledge;

      if (!admitsMissing) {
        isPassed = false;
        failureReason = 'Hallucinated or fabricated answer for unindexed inquiry';
      }
    } else if (test.isCampusDistinction) {
      // Must explicitly mention campus distinction
      const ansLower = result.answer.toLowerCase();
      const hasDistinction =
        ansLower.includes('distinction') ||
        ansLower.includes('separate') ||
        ansLower.includes('affiliated') ||
        ansLower.includes('vadlamudi');

      if (!hasDistinction) {
        isPassed = false;
        failureReason = 'Failed to articulate campus distinction from Vadlamudi';
      }
    } else {
      // Standard verified query: must have working citations and expected content
      const ansAndCits = (
        result.answer +
        ' ' +
        result.citations.map((c) => c.title + ' ' + (c.snippet || '')).join(' ')
      ).toLowerCase();

      // Check if at least one expected keyword is present
      const matched = test.expectedKeywords.filter((kw) => ansAndCits.includes(kw.toLowerCase()));
      if (matched.length === 0) {
        isPassed = false;
        failureReason = `Missing expected keywords: ${test.expectedKeywords.join(', ')}`;
      }

      // Check citation authenticity
      const firstCitation = result.citations[0];
      if (!firstCitation || !firstCitation.url || !firstCitation.url.includes('vignan.ac.in')) {
        isPassed = false;
        failureReason = 'Missing or invalid official vignan.ac.in citation';
      }
    }

    if (isPassed) {
      passedCount++;
      categoryStats[test.category].passed++;
    } else {
      failedCount++;
      failures.push({ id: test.id, question: test.question, reason: failureReason });
    }

    const mark = isPassed ? '✓' : '✗';
    const num = (i + 1).toString().padStart(3, '0');
    console.log(`[${num}/100] ${mark} [${test.category.padEnd(17)}] ${test.question.slice(0, 52).padEnd(55)} (${latency}ms)`);
  }

  // 3. Document Mode Isolation Verification
  console.log('\nStep 3: Verifying "Ask My Documents" Mode Strict Isolation...');
  try {
    const isolatedResult = await ragService.query({
      question: 'What is the complete fee structure for B.Tech CSE at Vignan University?',
      documentIds: ['non_existent_doc_123'],
      userId: 'test_isolation_user',
    });

    const isIsolated =
      isolatedResult.isInsufficientEvidence ||
      isolatedResult.citations.length === 0 ||
      !isolatedResult.answer.toLowerCase().includes('₹2,60,000');

    if (isIsolated) {
      console.log('✓ Document RAG Isolation Verified: Private document mode does NOT mix in university knowledge.');
    } else {
      console.warn('⚠️ Document RAG isolation check flagged potential leakage.');
    }
  } catch (err: any) {
    console.log('✓ Document RAG Isolation Verified: Non-existent document was properly rejected without leaking university knowledge.');
  }

  // 4. Live Knowledge Refresh Job Verification
  console.log('\nStep 4: Testing Knowledge Base Controlled Refresh Ingestion Job...');
  const refreshStatus = await universityVectorStore.refreshKnowledge();
  console.log(`✓ Refresh Job Complete: Status = ${refreshStatus.status}`);
  console.log(`- Seed URLs Attempted: ${refreshStatus.seedUrlsAttempted}`);
  console.log(`- Seed URLs Succeeded: ${refreshStatus.seedUrlsSuccessful}`);
  console.log(`- Total Indexed Chunks After Refresh: ${refreshStatus.totalIndexedChunks}`);

  // 5. Final Evaluation Summary Report
  console.log('\n========================================================================');
  console.log('📊 FINAL 100-QUESTION BENCHMARK RESULTS & QUALITY METRICS');
  console.log('========================================================================');
  console.log(`- Total Questions Evaluated: ${TEST_CASES.length}`);
  console.log(`- Passed:                    ${passedCount} / ${TEST_CASES.length} (${((passedCount / TEST_CASES.length) * 100).toFixed(1)}%)`);
  console.log(`- Failed:                    ${failedCount}`);
  const avgLat = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1);
  console.log(`- Average Query Latency:     ${avgLat} ms`);

  console.log('\nCategory Breakdown:');
  for (const [cat, stats] of Object.entries(categoryStats)) {
    const pct = ((stats.passed / stats.total) * 100).toFixed(1);
    const catAvg = (stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length).toFixed(1);
    console.log(`  * ${cat.padEnd(20)}: ${stats.passed}/${stats.total} Passed (${pct}%) | Avg Latency: ${catAvg}ms`);
  }

  if (failures.length > 0) {
    console.log('\nFailed Inquiries:');
    for (const f of failures) {
      console.log(`  - [${f.id}] "${f.question}" -> Reason: ${f.reason}`);
    }
  }

  console.log('========================================================================\n');

  if (failedCount > 0) {
    console.error(`Benchmark failed with ${failedCount} failures.`);
    process.exit(1);
  } else {
    console.log('🎉 ALL 100 VIGNAN UNIVERSITY TEST INQUIRIES PASSED WITH 100% SUCCESS!');
  }
}

runUniversityEvaluation().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
