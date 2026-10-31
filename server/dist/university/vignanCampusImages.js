/**
 * Phase 8 — Verified Visual Campus Knowledge Base & Official Gallery
 * Stores authentic official Vignan University campus image metadata, categories,
 * associated blocks/departments, accessible alternative text, and verified source provenance.
 */
export const VIGNAN_CAMPUS_IMAGES = [
    // 1. Main Entrance Gate
    {
        id: 'img_campus_entrance_gate1',
        title: 'VFSTR Main Entrance & Grand Gateway (Gate 1)',
        category: 'entrance',
        campus: 'Vadlamudi',
        blockId: 'entrance_main',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/slider/slide1.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/slider/slide1.jpg',
        sourcePageUrl: 'https://www.vignan.ac.in/',
        sourceName: "VFSTR Official Portal (vignan.ac.in)",
        caption: "The majestic main entrance archway and security plaza of Vignan's Foundation for Science, Technology & Research at Vadlamudi, Guntur.",
        altText: "Front view of the prominent white arched entrance gate of Vignan University Vadlamudi campus with lush landscaping.",
        eventOrAcademicYear: '2024-2025',
        isVerifiedOfficial: true,
    },
    // 2. U-Block (Computing, CSE & IT Academic Complex)
    {
        id: 'img_block_u_computing',
        title: 'University Academic Block (U-Block) - Computing Complex',
        category: 'academic_blocks',
        campus: 'Vadlamudi',
        blockId: 'U-Block',
        facilityId: 'cse_acse_it_complex',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/about/ublock.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/about/ublock.jpg',
        sourcePageUrl: 'https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept1&deptnm=CSE&school=sch3',
        sourceName: "Department of CSE, VFSTR",
        caption: 'University Academic Block (U-Block), central computing hub housing the Department of CSE, ACSE, and IT with multi-tier laboratories.',
        altText: 'Exterior architectural view of the 5-storey modern U-Block building at Vignan University Vadlamudi with landscaped gardens.',
        eventOrAcademicYear: '2024-2025',
        isVerifiedOfficial: true,
    },
    // 3. A-Block (Administrative Headquarters)
    {
        id: 'img_block_a_admin',
        title: 'Administrative Block (A-Block) - VC Secretariat & Admissions',
        category: 'academic_blocks',
        campus: 'Vadlamudi',
        blockId: 'A-Block',
        facilityId: 'admin_central',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/about/ablock.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/about/ablock.jpg',
        sourcePageUrl: 'https://www.vignan.ac.in/newvignan/aboutus.php',
        sourceName: "VFSTR Official Portal",
        caption: 'Administrative Block (A-Block) housing the Vice-Chancellor Secretariat, Registrar Office, Admissions Cell, and Controller of Examinations.',
        altText: 'Front facade of the Administrative Block (A-Block) overlooking the ceremonial flag post and central campus driveway.',
        eventOrAcademicYear: '2024-2025',
        isVerifiedOfficial: true,
    },
    // 4. NTR Central Library (N-Block)
    {
        id: 'img_library_ntr_central',
        title: 'NTR Central Library & Information Center (N-Block)',
        category: 'library',
        campus: 'Vadlamudi',
        blockId: 'N-Block',
        facilityId: 'ntr_library',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/lib1.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/lib1.jpg',
        sourcePageUrl: 'https://vignan.ac.in/newvignan/facilities.php',
        sourceName: "Central Library Facilities, VFSTR",
        caption: 'NTR Central Library reading halls and digital knowledge repository with over 1,10,000 volumes, IEEE subscriptions, and 1,000+ study capacity.',
        altText: 'Spacious interior view of NTR Central Library reading hall with rows of wooden study cubicles, books, and students reading.',
        eventOrAcademicYear: '2024-2025',
        isVerifiedOfficial: true,
    },
    // 5. Artificial Intelligence & Computing Labs (U-Block 3rd Floor)
    {
        id: 'img_lab_ai_computing',
        title: 'Specialized Artificial Intelligence & Machine Learning Lab',
        category: 'laboratories',
        campus: 'Vadlamudi',
        blockId: 'U-Block',
        facilityId: 'ai_ml_data_science_labs',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/cselab1.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/cselab1.jpg',
        sourcePageUrl: 'https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept2&deptnm=ACSE&school=sch3',
        sourceName: "Department of ACSE, VFSTR",
        caption: 'Air-conditioned high-performance AI, Machine Learning, and Cloud Computing Lab on the 3rd Floor of U-Block equipped with GPU workstations.',
        altText: 'Interior perspective of a modern computer laboratory with dual-monitor computer workstations and ergonomic chairs.',
        eventOrAcademicYear: '2024-2025',
        isVerifiedOfficial: true,
    },
    // 6. H-Block (Biotechnology, Food Tech & Sciences)
    {
        id: 'img_block_h_biotech',
        title: 'H-Block - Science & Biotechnology Complex',
        category: 'academic_blocks',
        campus: 'Vadlamudi',
        blockId: 'H-Block',
        facilityId: 'science_biotech_complex',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/about/hblock.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/about/hblock.jpg',
        sourcePageUrl: 'https://www.vignan.ac.in/newvignan/aboutus.php',
        sourceName: "VFSTR Campus Infrastructure",
        caption: 'H-Block housing the Department of Biotechnology, Department of Food Technology, and Applied Sciences & Humanities classrooms.',
        altText: 'Exterior view of H-Block building with glass elevation and tree-lined campus pathway.',
        eventOrAcademicYear: '2024-2025',
        isVerifiedOfficial: true,
    },
    // 7. Boys Residential Hostels (Vashishta & Visweswaraya)
    {
        id: 'img_hostel_boys_complex',
        title: 'Vashishta & Visweswaraya Boys Residential Hostels',
        category: 'hostels',
        campus: 'Vadlamudi',
        blockId: 'boys_hostel_vashishta',
        facilityId: 'boys_residence',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/hostel1.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/hostel1.jpg',
        sourcePageUrl: 'https://www.vignan.ac.in/newvignan/u-life.php',
        sourceName: "Student Residential Welfare, VFSTR",
        caption: 'Modern multi-storey boys residential hostels featuring AC and non-AC rooms, in-house hygienic mess halls, and sports amenities.',
        altText: 'Large multi-storey residential building complex of Vignan University boys hostel surrounded by green trees.',
        eventOrAcademicYear: '2024-2025',
        isVerifiedOfficial: true,
    },
    // 8. Girls Residential Hostels (Priyadarshini & Kalpana Chawla)
    {
        id: 'img_hostel_girls_complex',
        title: 'Priyadarshini & Kalpana Chawla Girls Residential Hostels',
        category: 'hostels',
        campus: 'Vadlamudi',
        blockId: 'girls_hostel_priyadarshini',
        facilityId: 'girls_residence',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/hostel2.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/hostel2.jpg',
        sourcePageUrl: 'https://www.vignan.ac.in/newvignan/u-life.php',
        sourceName: "Student Residential Welfare, VFSTR",
        caption: 'Priyadarshini Girls Hostel equipped with 24/7 biometric access turnstiles, CCTV security surveillance, dining halls, and study rooms.',
        altText: 'Exterior perspective of secure multi-storey girls hostel building on Vadlamudi campus with landscaped courtyard.',
        eventOrAcademicYear: '2024-2025',
        isVerifiedOfficial: true,
    },
    // 9. Athletic Track, Cricket & Sports Arena
    {
        id: 'img_sports_ground_track',
        title: '400m Athletic Track & University Sports Complex',
        category: 'sports',
        campus: 'Vadlamudi',
        facilityId: 'athletic_sports_complex',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/sports1.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/sports1.jpg',
        sourcePageUrl: 'https://vignan.ac.in/newvignan/facilities.php',
        sourceName: "Physical Education & Sports Board, VFSTR",
        caption: 'International-specification 400-meter athletic running track, cricket stadium pavilion, and floodlit synthetic basketball courts.',
        altText: 'Wide-angle view of green athletic stadium with running track, spectators pavilion, and open playing fields.',
        eventOrAcademicYear: '2024-2025',
        isVerifiedOfficial: true,
    },
    // 10. Open Air Theatre (OAT) & Sangamam Auditorium
    {
        id: 'img_auditorium_oat',
        title: 'Open Air Theatre (OAT) & Sangamam Central Auditorium',
        category: 'auditorium',
        campus: 'Vadlamudi',
        facilityId: 'sangamam_oat',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/oat.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/facilities/oat.jpg',
        sourcePageUrl: 'https://vignan.ac.in/newvignan/facilities.php',
        sourceName: "Campus Infrastructure, VFSTR",
        caption: 'Open Air Theatre (OAT) with amphitheatre seating for 5,000+ spectators, hosting national cultural celebrations, convocations, and concerts.',
        altText: 'Stepped amphitheatre seating of the Open Air Theatre with covered performance stage and sound towers.',
        eventOrAcademicYear: '2024-2025',
        isVerifiedOfficial: true,
    },
    // 11. Vignan Mahotsav National Youth Festival
    {
        id: 'img_event_mahotsav_celebration',
        title: 'Vignan Mahotsav - National Level Inter-University Youth Festival',
        category: 'mahotsav',
        campus: 'Vadlamudi',
        facilityId: 'mahotsav_main_stage',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/events/mahotsav1.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/events/mahotsav1.jpg',
        sourcePageUrl: 'https://vignan.ac.in/newvignan/sac_index.php',
        sourceName: "Student Activities Council (SAC), VFSTR",
        caption: 'Vignan Mahotsav gala evening showcasing national music competitions, classical and Western dance fests, drama, and youth conclaves.',
        altText: 'Crowd of university students watching a colorful musical and dance concert on a brightly lit festival stage.',
        eventOrAcademicYear: '2024',
        isVerifiedOfficial: true,
    },
    // 12. Student Activities Council (SAC) Cultural Clubs
    {
        id: 'img_event_sac_clubs',
        title: 'Student Activities Council (SAC) Cultural & Technical Club Activities',
        category: 'clubs_events',
        campus: 'Vadlamudi',
        facilityId: 'sac_hub',
        originalImageUrl: 'https://vignan.ac.in/newvignan/assets/images/events/sac1.jpg',
        thumbnailUrl: 'https://vignan.ac.in/newvignan/assets/images/events/sac1.jpg',
        sourcePageUrl: 'https://vignan.ac.in/newvignan/sac_index.php',
        sourceName: "Student Activities Council (SAC)",
        caption: 'Members of SAC cultural, literary, and technical clubs performing during the annual university orientation and club expo.',
        altText: 'Group of vibrant student performers in cultural traditional costumes performing on the university stage.',
        eventOrAcademicYear: '2024-2025',
        isVerifiedOfficial: true,
    },
];
export function getAllCampusImages() {
    return VIGNAN_CAMPUS_IMAGES;
}
export function getCampusImagesByCategory(category) {
    return VIGNAN_CAMPUS_IMAGES.filter((img) => img.category === category);
}
export function getCampusImagesByBlock(blockId) {
    return VIGNAN_CAMPUS_IMAGES.filter((img) => img.blockId === blockId);
}
export function searchCampusImages(query) {
    const q = query.toLowerCase();
    return VIGNAN_CAMPUS_IMAGES.filter((img) => img.title.toLowerCase().includes(q) ||
        img.caption.toLowerCase().includes(q) ||
        img.altText.toLowerCase().includes(q) ||
        (img.blockId && img.blockId.toLowerCase().includes(q)) ||
        img.category.toLowerCase().includes(q));
}
