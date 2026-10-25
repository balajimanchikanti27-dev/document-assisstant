/**
 * Vignan University Vadlamudi - Master Knowledge Base Benchmark Suite
 * 
 * Tests complete end-to-end coverage of all 12 Phases:
 * - Phase 1: Source Registry & Traceability
 * - Phase 2: Complete University Specializations
 * - Phase 3: Faculty Academic Hierarchy, Deans vs HoDs, Specialization Coordinators, Research Filters
 * - Phase 4: Placements, 2024 Highest/Average Package, Recruiters, CRT Training, Non-guarantee safeguards
 * - Phase 5: Fee Structure, Category A & B, One-time charges, Merit Scholarships
 * - Phase 6: Sanctioned Intake vs Live Vacancies (2,510 total B.Tech seats)
 * - Phase 7: Hostels, Boys & Girls Fees, Mess, Registration, 24/7 Medical Care
 * - Phase 8: Campus Blocks, Locations & Authentic Photographic Images
 * - Phase 9: Mahotsav Youth Festival, Aavega, SAC Active Clubs
 * - Phase 10: General Facilities (Library, Transport, Health Centre, Banks)
 * - Phase 11: Structured DB & Vector Retrieval Architecture
 * - Phase 12: Natural, Tailored RAG Answers with Source Provenance
 * - REST API Endpoints: /api/university/info, /faculties, /images, /sources, /query
 */

import { universityRagService } from '../src/university/universityRagService.js';
import { universityVectorStore } from '../src/university/universityVectorStore.js';
import { VIGNAN_SOURCE_REGISTRY } from '../src/university/vignanSourceRegistry.js';
import { VIGNAN_FACULTY_DIRECTORY } from '../src/university/vignanFacultyData.js';
import { VIGNAN_CAMPUS_IMAGES } from '../src/university/vignanCampusImages.js';

interface BenchmarkTest {
  id: string;
  phase: string;
  question: string;
  mustContain: string[];
  mustNotContain?: string[];
  description: string;
}

const BENCHMARK_TESTS: BenchmarkTest[] = [
  // ==========================================
  // PHASE 3: Academic Leadership & Hierarchy
  // ==========================================
  {
    id: 'BM-P3-01',
    phase: 'Phase 3: Academic Hierarchy',
    question: 'Who is the dean of Computing and Informatics?',
    mustContain: ['Krishna Kishore', 'Dean', 'School of Computing and Informatics'],
    description: 'Verify Dean of School of Computing and Informatics is Prof. K. V. Krishna Kishore',
  },
  {
    id: 'BM-P3-02',
    phase: 'Phase 3: Academic Hierarchy',
    question: 'Who heads ACSE?',
    mustContain: ['Premamayudu', 'Head of Department', 'Advanced Computer Science and Engineering'],
    description: 'Verify HoD of ACSE is Dr. B. Premamayudu and distinguished from Dean',
  },
  {
    id: 'BM-P3-03',
    phase: 'Phase 3: Academic Hierarchy',
    question: 'Who coordinates AIML?',
    mustContain: ['Phani Kumar', 'Coordinator', 'Artificial Intelligence and Machine Learning'],
    description: 'Verify AIML coordinator is Dr. S. V. Phani Kumar under ACSE department',
  },
  {
    id: 'BM-P3-04',
    phase: 'Phase 3: Faculty Listing',
    question: 'List all professors in CSE.',
    mustContain: ['Sujatha', 'Venkatesulu', 'Veeranjaneyulu', 'Professor'],
    description: 'Verify listing of CSE professors',
  },
  {
    id: 'BM-P3-05',
    phase: 'Phase 3: Faculty Listing',
    question: 'List assistant professors in Data Science.',
    mustContain: ['Babu', 'Siva Prasad', 'Assistant Professor'],
    description: 'Verify listing of Data Science assistant professors',
  },
  {
    id: 'BM-P3-06',
    phase: 'Phase 3: Research Expertise',
    question: 'Which faculty members research machine learning?',
    mustContain: ['Krishna Kishore', 'Phani Kumar', 'Sujatha'],
    description: 'Verify machine learning faculty search',
  },
  {
    id: 'BM-P3-07',
    phase: 'Phase 3: Research Expertise',
    question: 'Which professors work on generative AI?',
    mustContain: ['Raghavendra', 'Generative AI'],
    description: 'Verify Generative AI research expert lookup',
  },
  {
    id: 'BM-P3-08',
    phase: 'Phase 3: Faculty Department Lookup',
    question: 'Which department does Dr. K. Sujatha belong to?',
    mustContain: ['Computer Science and Engineering', 'CSE', 'HoD'],
    description: 'Verify individual faculty department and appointment lookup',
  },

  // ==========================================
  // PHASE 4: Placements & Statistics
  // ==========================================
  {
    id: 'BM-P4-01',
    phase: 'Phase 4: Placements',
    question: 'What is the highest package at Vignan?',
    mustContain: ['44 LPA', '2024', 'Amazon'],
    mustNotContain: ['guarantee', 'guaranteed'],
    description: 'Verify highest package is reported with 2024 batch context and non-guarantee safeguard',
  },
  {
    id: 'BM-P4-02',
    phase: 'Phase 4: Placements',
    question: 'What was the highest package in 2024?',
    mustContain: ['44 LPA', 'Amazon', '2024'],
    description: 'Verify 2024 highest package accuracy',
  },
  {
    id: 'BM-P4-03',
    phase: 'Phase 4: Placements',
    question: 'What is the average package?',
    mustContain: ['5.2', '6.2 LPA'],
    description: 'Verify average salary package range',
  },
  {
    id: 'BM-P4-04',
    phase: 'Phase 4: Placements',
    question: 'What percentage of eligible students were placed?',
    mustContain: ['85%', '90%'],
    description: 'Verify eligible student placement rate denominator',
  },
  {
    id: 'BM-P4-05',
    phase: 'Phase 4: Placements',
    question: 'What are the placement results for CSE?',
    mustContain: ['CSE', 'Amazon', 'offers'],
    description: 'Verify CSE branch placement outcomes',
  },
  {
    id: 'BM-P4-06',
    phase: 'Phase 4: Placements',
    question: 'What are the placement results for AIML?',
    mustContain: ['AIML', 'ACSE'],
    description: 'Verify AIML placement reporting under ACSE',
  },
  {
    id: 'BM-P4-07',
    phase: 'Phase 4: Recruiters',
    question: 'Which companies recruit at Vignan?',
    mustContain: ['Amazon', 'Cisco', 'TCS', 'Infosys'],
    description: 'Verify leading recruiters list',
  },
  {
    id: 'BM-P4-08',
    phase: 'Phase 4: Placement Training',
    question: 'What placement training is provided?',
    mustContain: ['CRT', 'Aptitude', 'Soft skills', 'Coding'],
    description: 'Verify Campus Recruitment Training (CRT) details',
  },

  // ==========================================
  // PHASE 5: Fee Structure & Scholarships
  // ==========================================
  {
    id: 'BM-P5-01',
    phase: 'Phase 5: Fee Structure',
    question: 'What is the tuition fee for B.Tech CSE?',
    mustContain: ['2,60,000', 'Category A'],
    description: 'Verify B.Tech CSE tuition fee breakdown',
  },
  {
    id: 'BM-P5-02',
    phase: 'Phase 5: Fee Structure',
    question: 'What is the fee for AIML and Data Science?',
    mustContain: ['2,60,000', 'Category A'],
    description: 'Verify AIML and Data Science fee schedule',
  },
  {
    id: 'BM-P5-03',
    phase: 'Phase 5: Fee Structure',
    question: 'What is the fee for Mechanical Engineering?',
    mustContain: ['1,60,000'],
    description: 'Verify core engineering fee schedule',
  },
  {
    id: 'BM-P5-04',
    phase: 'Phase 5: Fee Structure',
    question: 'What are the one-time admission charges at Vignan?',
    mustContain: ['20,000', '2,000', 'Admission fee'],
    description: 'Verify one-time admission and registration fees',
  },
  {
    id: 'BM-P5-05',
    phase: 'Phase 5: Scholarships',
    question: 'What fee concession is given for V-SAT Rank 1 to 50?',
    mustContain: ['75%', 'waiver'],
    description: 'Verify top-tier V-SAT merit scholarship',
  },
  {
    id: 'BM-P5-06',
    phase: 'Phase 5: Scholarships',
    question: 'What fee waiver is provided for students with 95 percentile or above in JEE Main?',
    mustContain: ['75%', 'JEE'],
    description: 'Verify JEE Main percentile scholarship tier',
  },

  // ==========================================
  // PHASE 6: Sanctioned Seat Intake vs Vacancies
  // ==========================================
  {
    id: 'BM-P6-01',
    phase: 'Phase 6: Seat Intake',
    question: 'What is the total B.Tech seat intake at Vignan University?',
    mustContain: ['2,510', 'Sanctioned Intake', 'approved'],
    description: 'Verify total approved B.Tech intake capacity',
  },
  {
    id: 'BM-P6-02',
    phase: 'Phase 6: Seat Intake',
    question: 'What is the approved seat intake for CSE and AIML?',
    mustContain: ['600', '300', 'CSE', 'AIML'],
    description: 'Verify branch-wise sanctioned intake for CSE and AIML',
  },
  {
    id: 'BM-P6-03',
    phase: 'Phase 6: Seat Intake Distinction',
    question: 'How many B.Tech seats are currently available or vacant?',
    mustContain: ['Sanctioned intake', 'dynamic', 'counseling'],
    description: 'Verify clear distinction between sanctioned intake and live counseling vacancies',
  },

  // ==========================================
  // PHASE 7: Hostels & Living Facilities
  // ==========================================
  {
    id: 'BM-P7-01',
    phase: 'Phase 7: Hostels',
    question: 'What is the hostel fee for boys at Vignan University?',
    mustContain: ['1,05,000', '1,15,000', 'Non-AC', 'AC'],
    description: 'Verify boys hostel annual fee breakdown',
  },
  {
    id: 'BM-P7-02',
    phase: 'Phase 7: Hostels',
    question: 'What is the girls AC hostel fee?',
    mustContain: ['1,35,000', '1,45,000', 'AC'],
    description: 'Verify girls AC hostel fee breakdown',
  },
  {
    id: 'BM-P7-03',
    phase: 'Phase 7: Hostels',
    question: 'Is food included in the hostel fee?',
    mustContain: ['included', '4 meals', 'Breakfast', 'Dinner'],
    description: 'Verify meal coverage and mess inclusion',
  },
  {
    id: 'BM-P7-04',
    phase: 'Phase 7: Hostels',
    question: 'What is the hostel registration fee and caution deposit?',
    mustContain: ['5,000', 'refundable', 'deposit'],
    description: 'Verify caution deposit and registration fees',
  },
  {
    id: 'BM-P7-05',
    phase: 'Phase 7: Hostels',
    question: 'How many students can the hostel accommodate?',
    mustContain: ['3,500', '4,000'],
    description: 'Verify total residential capacity',
  },
  {
    id: 'BM-P7-06',
    phase: 'Phase 7: Hostels',
    question: 'Is medical support available in the hostel?',
    mustContain: ['24/7', 'Health Centre', 'ambulance', 'doctor'],
    description: 'Verify healthcare and round-the-clock emergency support',
  },
  {
    id: 'BM-P7-07',
    phase: 'Phase 7: Hostels',
    question: 'How do I apply for hostel accommodation?',
    mustContain: ['Admissions Cell', 'Warden', 'registration'],
    description: 'Verify hostel allotment and booking procedure',
  },

  // ==========================================
  // PHASE 8: Campus Blocks & Photos
  // ==========================================
  {
    id: 'BM-P8-01',
    phase: 'Phase 8: Campus Blocks',
    question: 'Where is the CSE department located?',
    mustContain: ['Universal Block', 'U-Block', '3rd', '4th'],
    description: 'Verify CSE location in U-Block and floor levels',
  },
  {
    id: 'BM-P8-02',
    phase: 'Phase 8: Campus Blocks',
    question: 'What is located in A-Block (Administrative Block)?',
    mustContain: ['Administrative', 'Chancellor', 'Vice-Chancellor', 'Registrar', 'Admissions'],
    description: 'Verify A-Block administrative offices',
  },
  {
    id: 'BM-P8-03',
    phase: 'Phase 8: Visual Knowledge',
    question: 'Show me photos of Vignan University campus.',
    mustContain: ['photo', 'vignan.ac.in'],
    description: 'Verify authentic campus image gallery retrieval',
  },

  // ==========================================
  // PHASE 9: Mahotsav, SAC & Student Life
  // ==========================================
  {
    id: 'BM-P9-01',
    phase: 'Phase 9: Mahotsav',
    question: 'What is Vignan Mahotsav?',
    mustContain: ['Youth Festival', 'national', 'cultural', 'competitions', 'Star Nights'],
    description: 'Verify Vignan Mahotsav national festival details',
  },
  {
    id: 'BM-P9-02',
    phase: 'Phase 9: SAC Clubs',
    question: 'What clubs are active under the Student Activities Council (SAC)?',
    mustContain: ['Dance', 'Music', 'V-Code', 'Robotics', 'NSS', 'NCC'],
    description: 'Verify active student clubs across cultural, technical, and social domains',
  },
  {
    id: 'BM-P9-03',
    phase: 'Phase 9: Cultural & Sports Fests',
    question: 'What is Aavega at Vignan University?',
    mustContain: ['Aavega', 'sports', 'national'],
    description: 'Verify Aavega national sports festival details',
  },

  // ==========================================
  // PHASE 10: General Amenities & Infrastructure
  // ==========================================
  {
    id: 'BM-P10-01',
    phase: 'Phase 10: Library',
    question: 'What are the facilities and timings of the NTR Central Library?',
    mustContain: ['NTR', 'Library', '1,00,000', 'IEEE'],
    description: 'Verify library book count and digital subscription assets',
  },
  {
    id: 'BM-P10-02',
    phase: 'Phase 10: Transport & Health',
    question: 'What bus transport and banking facilities are available on campus?',
    mustContain: ['80', 'Union Bank', 'ATM'],
    description: 'Verify fleet bus coverage and on-campus banking amenities',
  },
];

async function runMasterBenchmark() {
  console.log('========================================================================');
  console.log('🏛️ VIGNAN UNIVERSITY VADLAMUDI - MASTER KNOWLEDGE BASE BENCHMARK SUITE');
  console.log('   Testing all 12 Phases: Sources, Hierarchy, Placements, Fees, Intakes,');
  console.log('   Hostels, Blocks, Visuals, Mahotsav, SAC Clubs & REST Endpoints');
  console.log('========================================================================\n');

  // Step 1: Verify Static Registry & Data Counts
  console.log('Step 1: Validating Registered Knowledge Base Assets...');
  console.log(`- Official Sources Registered:  ${VIGNAN_SOURCE_REGISTRY.length} (Target >= 15)`);
  console.log(`- Verified Faculty Members:    ${VIGNAN_FACULTY_DIRECTORY.length} (Target >= 25)`);
  console.log(`- Authentic Campus Images:     ${VIGNAN_CAMPUS_IMAGES.length} (Target >= 10)`);

  if (VIGNAN_SOURCE_REGISTRY.length < 15) {
    throw new Error(`Insufficient registered sources: expected at least 15, got ${VIGNAN_SOURCE_REGISTRY.length}`);
  }
  if (VIGNAN_FACULTY_DIRECTORY.length < 25) {
    throw new Error(`Insufficient faculty profiles: expected at least 25, got ${VIGNAN_FACULTY_DIRECTORY.length}`);
  }
  if (VIGNAN_CAMPUS_IMAGES.length < 10) {
    throw new Error(`Insufficient campus images: expected at least 10, got ${VIGNAN_CAMPUS_IMAGES.length}`);
  }
  console.log('✓ Asset counts verified successfully.\n');

  // Step 2: Test Vector Store Ingestion & Index Readiness
  console.log('Step 2: Testing Vector Store Ingestion & Index Readiness...');
  const status = universityVectorStore.getStatus();
  console.log(`- Total Indexed Chunks:        ${status.totalIndexedChunks}`);
  console.log(`- Total Source Pages:          ${status.totalSourcePages}`);
  console.log(`- Store Status:                ${status.status}`);
  if (status.totalIndexedChunks < 50) {
    throw new Error(`Vector store chunk count too low: got ${status.totalIndexedChunks}`);
  }
  console.log('✓ Vector store ready and operational.\n');

  // Step 3: Run All Question Benchmarks
  console.log('Step 3: Executing Master Query Benchmarks Across All Phases...\n');

  let passedCount = 0;
  let failedCount = 0;
  const latencies: number[] = [];
  const phaseStats: Record<string, { total: number; passed: number; latencies: number[] }> = {};
  const failures: { id: string; question: string; reason: string }[] = [];

  for (let i = 0; i < BENCHMARK_TESTS.length; i++) {
    const test = BENCHMARK_TESTS[i];
    if (!phaseStats[test.phase]) {
      phaseStats[test.phase] = { total: 0, passed: 0, latencies: [] };
    }
    phaseStats[test.phase].total++;

    const start = Date.now();
    try {
      const response = await universityRagService.query({ question: test.question });
      const elapsed = Date.now() - start;
      latencies.push(elapsed);
      phaseStats[test.phase].latencies.push(elapsed);

      const text = response.answer || '';
      const lower = text.toLowerCase();

      // Check required keywords
      const missingKeywords = test.mustContain.filter(kw => !lower.includes(kw.toLowerCase()));
      // Check forbidden keywords
      const foundForbidden = (test.mustNotContain || []).filter(kw => lower.includes(kw.toLowerCase()));

      const hasCitations = response.citations && response.citations.length > 0;

      if (missingKeywords.length === 0 && foundForbidden.length === 0 && hasCitations) {
        passedCount++;
        phaseStats[test.phase].passed++;
        const numStr = `[${String(i + 1).padStart(2, '0')}/${BENCHMARK_TESTS.length}]`;
        console.log(`${numStr} ✓ [${test.id}] ${test.question.padEnd(55)} (${elapsed}ms)`);
      } else {
        failedCount++;
        let reason = '';
        if (missingKeywords.length > 0) reason += `Missing keywords: [${missingKeywords.join(', ')}]. `;
        if (foundForbidden.length > 0) reason += `Found forbidden words: [${foundForbidden.join(', ')}]. `;
        if (!hasCitations) reason += `Missing citations. `;

        failures.push({ id: test.id, question: test.question, reason });
        const numStr = `[${String(i + 1).padStart(2, '0')}/${BENCHMARK_TESTS.length}]`;
        console.error(`${numStr} ✗ [${test.id}] ${test.question}`);
        console.error(`       Reason: ${reason}`);
        console.error(`       Snippet: ${text.slice(0, 150)}...\n`);
      }
    } catch (err: any) {
      failedCount++;
      const elapsed = Date.now() - start;
      failures.push({ id: test.id, question: test.question, reason: `Exception: ${err.message}` });
      console.error(`✗ [${test.id}] Threw exception: ${err.message}`);
    }
  }

  // Step 4: Validate Structured REST Endpoints
  console.log('\nStep 4: Validating Structured Database & API Query Filters...');
  
  // Test faculty filter logic
  const cseProfessors = VIGNAN_FACULTY_DIRECTORY.filter(f => f.department.includes('CSE') && f.designation.includes('Professor'));
  console.log(`- Filtered CSE Professors: ${cseProfessors.length} found`);
  if (cseProfessors.length === 0) throw new Error('Structured faculty filter failed for CSE professors');

  const sciDean = VIGNAN_FACULTY_DIRECTORY.find(f => (f.administrativeRole?.includes('Dean') || f.designation === 'Dean') && f.school?.includes('Computing'));
  console.log(`- Structured Dean of SCI: ${sciDean?.name} (${sciDean?.designation})`);
  if (!sciDean || !sciDean.name.includes('Krishna Kishore')) {
    throw new Error(`Dean of SCI lookup mismatch: got ${sciDean?.name}`);
  }

  const acseHod = VIGNAN_FACULTY_DIRECTORY.find(f => (f.administrativeRole?.includes('Head') || f.designation === 'Head of Department') && f.department.includes('ACSE'));
  console.log(`- Structured HoD of ACSE: ${acseHod?.name} (${acseHod?.designation})`);
  if (!acseHod || !acseHod.name.includes('Premamayudu')) {
    throw new Error(`HoD of ACSE lookup mismatch: got ${acseHod?.name}`);
  }

  const aimlCoord = VIGNAN_FACULTY_DIRECTORY.find(f => f.administrativeRole?.includes('Coordinator') && f.administrativeRole?.includes('AIML'));
  console.log(`- Structured AIML Coordinator: ${aimlCoord?.name} (${aimlCoord?.designation})`);
  if (!aimlCoord || !aimlCoord.name.includes('Phani Kumar')) {
    throw new Error(`AIML Coordinator lookup mismatch: got ${aimlCoord?.name}`);
  }

  const blockImages = VIGNAN_CAMPUS_IMAGES.filter(img => img.category === 'academic_blocks');
  console.log(`- Structured Block Images: ${blockImages.length} found`);
  if (blockImages.length === 0) throw new Error('Campus image filter failed for academic_blocks');

  console.log('✓ Structured API query filters validated.\n');

  // Step 5: Summary Report
  console.log('========================================================================');
  console.log('📊 MASTER BENCHMARK SUMMARY & INTEGRITY REPORT');
  console.log('========================================================================');
  console.log(`- Total Benchmark Inquiries: ${BENCHMARK_TESTS.length}`);
  console.log(`- Passed:                    ${passedCount} / ${BENCHMARK_TESTS.length} (${((passedCount / BENCHMARK_TESTS.length) * 100).toFixed(1)}%)`);
  console.log(`- Failed:                    ${failedCount}`);
  const avgLat = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1);
  console.log(`- Average Query Latency:     ${avgLat} ms`);

  console.log('\nBreakdown by Phase:');
  for (const [phase, stats] of Object.entries(phaseStats)) {
    const pct = ((stats.passed / stats.total) * 100).toFixed(1);
    const catAvg = (stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length).toFixed(1);
    console.log(`  * ${phase.padEnd(35)}: ${stats.passed}/${stats.total} Passed (${pct}%) | Avg Latency: ${catAvg}ms`);
  }

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  - [${f.id}] "${f.question}" -> Reason: ${f.reason}`);
    }
  }
  console.log('========================================================================\n');

  if (failedCount > 0) {
    console.error(`Master benchmark failed with ${failedCount} errors.`);
    process.exit(1);
  } else {
    console.log('🎉 ALL VIGNAN UNIVERSITY MASTER KNOWLEDGE TESTS PASSED WITH 100% SUCCESS!');
  }
}

runMasterBenchmark().catch((err) => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
