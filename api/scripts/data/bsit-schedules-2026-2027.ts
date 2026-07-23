export type BsitScheduleSeedRow = {
  yearLevel: 'First Year' | 'Second Year' | 'Third Year' | 'Fourth Year';
  subjectCode: string;
  subjectName: string;
  units: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
};

export const BSIT_SCHEDULES_2026_2027_FIRST_SEM: BsitScheduleSeedRow[] = [
  {
    yearLevel: 'First Year',
    subjectCode: 'FIL1',
    subjectName: 'Wikang Filipino',
    units: 3,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '14:30',
    endTime: '16:00',
    room: '314'
  },
  {
    yearLevel: 'First Year',
    subjectCode: 'IT112-LEC',
    subjectName: 'PC Assembly & Troubleshooting (Lec)',
    units: 2,
    dayOfWeek: 'MONDAY',
    startTime: '16:00',
    endTime: '18:00',
    room: '301'
  },
  {
    yearLevel: 'First Year',
    subjectCode: 'IT112-LAB',
    subjectName: 'PC Assembly & Troubleshooting (Lab)',
    units: 1,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '16:00',
    endTime: '17:30',
    room: 'CSS - Lab'
  },
  {
    yearLevel: 'First Year',
    subjectCode: 'IT110-LEC',
    subjectName: 'Introduction to Computing (Lec)',
    units: 2,
    dayOfWeek: 'WEDNESDAY',
    startTime: '10:00',
    endTime: '12:00',
    room: '301'
  },
  {
    yearLevel: 'First Year',
    subjectCode: 'IT110-LAB',
    subjectName: 'Introduction to Computing (Lab)',
    units: 1,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '14:30',
    endTime: '16:00',
    room: 'CL - 1'
  },
  {
    yearLevel: 'First Year',
    subjectCode: 'IT111-LEC',
    subjectName: 'Computer Programming I (Lec)',
    units: 2,
    dayOfWeek: 'MONDAY',
    startTime: '12:30',
    endTime: '14:30',
    room: '301'
  },
  {
    yearLevel: 'First Year',
    subjectCode: 'IT111-LAB',
    subjectName: 'Computer Programming I (Lab)',
    units: 1,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '13:00',
    endTime: '14:30',
    room: 'CL - 1'
  },
  {
    yearLevel: 'First Year',
    subjectCode: 'MATHWORLD',
    subjectName: 'Mathematics in the Modern World',
    units: 3,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '16:00',
    endTime: '17:30',
    room: '314'
  },
  {
    yearLevel: 'First Year',
    subjectCode: 'NSTP1',
    subjectName: 'National Service Training Program 1',
    units: 3,
    dayOfWeek: 'FRIDAY',
    startTime: '11:30',
    endTime: '14:30',
    room: '314'
  },
  {
    yearLevel: 'First Year',
    subjectCode: 'PATHFIT1',
    subjectName: 'Movement Competency Training',
    units: 2,
    dayOfWeek: 'FRIDAY',
    startTime: '08:00',
    endTime: '10:00',
    room: '312'
  },
  {
    yearLevel: 'First Year',
    subjectCode: 'UTS',
    subjectName: 'Understanding the Self',
    units: 3,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '18:00',
    endTime: '19:30',
    room: '312'
  },
  {
    yearLevel: 'First Year',
    subjectCode: 'MATHPREP',
    subjectName: 'Pre Calculus for Non-STEM',
    units: 3,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '10:30',
    endTime: '12:00',
    room: '312'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'ARTAPP',
    subjectName: 'Art Appreciation',
    units: 3,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '13:00',
    endTime: '14:30',
    room: '307'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'CW',
    subjectName: 'The Contemporary World',
    units: 3,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '14:30',
    endTime: '16:00',
    room: '318'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'IT210-LEC',
    subjectName: 'Data Structures & Algorithms (Lec)',
    units: 2,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '08:00',
    endTime: '09:00',
    room: '301'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'IT210-LAB',
    subjectName: 'Data Structures & Algorithms (Lab)',
    units: 1,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '09:00',
    endTime: '10:30',
    room: 'CL - 1'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'IT211-LEC',
    subjectName: 'Platform Technologies (Intangible) (Lec)',
    units: 2,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '08:00',
    endTime: '09:00',
    room: '317'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'IT211-LAB',
    subjectName: 'Platform Technologies (Intangible) (Lab)',
    units: 1,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '09:00',
    endTime: '10:30',
    room: 'CL - 1'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'IT212-LEC',
    subjectName: 'Web Systems & Technologies 1 (Lec)',
    units: 2,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '10:30',
    endTime: '11:30',
    room: '317'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'IT212-LAB',
    subjectName: 'Web Systems & Technologies 1 (Lab)',
    units: 1,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '11:30',
    endTime: '13:00',
    room: 'CL - 1'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'IT213-LEC',
    subjectName: 'Introduction to Human Computer Interaction (Lec)',
    units: 2,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '14:30',
    endTime: '15:30',
    room: '317'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'IT213-LAB',
    subjectName: 'Introduction to Human Computer Interaction (Lab)',
    units: 1,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '15:30',
    endTime: '17:00',
    room: 'CL - 1'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'PATHFIT3',
    subjectName: 'Sports',
    units: 2,
    dayOfWeek: 'SATURDAY',
    startTime: '10:00',
    endTime: '12:00',
    room: '312'
  },
  {
    yearLevel: 'Second Year',
    subjectCode: 'STAT',
    subjectName: 'Statistics',
    units: 3,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '10:30',
    endTime: '12:00',
    room: '318'
  },
  {
    yearLevel: 'Third Year',
    subjectCode: 'IT310-LEC',
    subjectName: "App, Dev't. & Emerging Technologies (Lec)",
    units: 2,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '13:00',
    endTime: '14:00',
    room: '307'
  },
  {
    yearLevel: 'Third Year',
    subjectCode: 'IT310-LAB',
    subjectName: "App, Dev't. & Emerging Technologies (Lab)",
    units: 1,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '14:00',
    endTime: '15:30',
    room: 'CL - 1'
  },
  {
    yearLevel: 'Third Year',
    subjectCode: 'IT311-LEC',
    subjectName: 'Networking 2 (Lec)',
    units: 2,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '16:00',
    endTime: '17:00',
    room: '317'
  },
  {
    yearLevel: 'Third Year',
    subjectCode: 'IT311-LAB',
    subjectName: 'Networking 2 (Lab)',
    units: 1,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '17:00',
    endTime: '18:30',
    room: 'CL - 1'
  },
  {
    yearLevel: 'Third Year',
    subjectCode: 'IT312-LEC',
    subjectName: 'Integrative Programming & Technologies 1 (Lec)',
    units: 2,
    dayOfWeek: 'FRIDAY',
    startTime: '08:00',
    endTime: '10:00',
    room: '317'
  },
  {
    yearLevel: 'Third Year',
    subjectCode: 'IT312-LAB',
    subjectName: 'Integrative Programming & Technologies 1 (Lab)',
    units: 1,
    dayOfWeek: 'FRIDAY',
    startTime: '10:00',
    endTime: '13:00',
    room: 'CL - 2'
  },
  {
    yearLevel: 'Third Year',
    subjectCode: 'IT313-LEC',
    subjectName: 'Web Systems & Technologies 2 (Lec)',
    units: 2,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '08:00',
    endTime: '09:00',
    room: '307'
  },
  {
    yearLevel: 'Third Year',
    subjectCode: 'IT313-LAB',
    subjectName: 'Web Systems & Technologies 2 (Lab)',
    units: 1,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '09:00',
    endTime: '10:30',
    room: 'CL - 2'
  },
  {
    yearLevel: 'Third Year',
    subjectCode: 'IT314-LEC',
    subjectName: 'Advance Database Systems (Lec)',
    units: 2,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '09:00',
    endTime: '10:00',
    room: '317'
  },
  {
    yearLevel: 'Third Year',
    subjectCode: 'IT314-LAB',
    subjectName: 'Advance Database Systems (Lab)',
    units: 1,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '10:00',
    endTime: '11:30',
    room: 'CL - 2'
  },
  {
    yearLevel: 'Fourth Year',
    subjectCode: 'IT410-LEC',
    subjectName: 'Capstone Project II (Lec)',
    units: 2,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '09:30',
    endTime: '10:30',
    room: '317'
  },
  {
    yearLevel: 'Fourth Year',
    subjectCode: 'IT410-LAB',
    subjectName: 'Capstone Project II (Lab)',
    units: 1,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '10:30',
    endTime: '12:00',
    room: 'CL - 2'
  },
  {
    yearLevel: 'Fourth Year',
    subjectCode: 'IT411-LEC',
    subjectName: 'Integrative Programming & Technologies (Lec)',
    units: 2,
    dayOfWeek: 'FRIDAY',
    startTime: '13:00',
    endTime: '15:00',
    room: '317'
  },
  {
    yearLevel: 'Fourth Year',
    subjectCode: 'IT411-LAB',
    subjectName: 'Integrative Programming & Technologies (Lab)',
    units: 1,
    dayOfWeek: 'FRIDAY',
    startTime: '15:00',
    endTime: '18:00',
    room: 'CL - 2'
  },
  {
    yearLevel: 'Fourth Year',
    subjectCode: 'IT412-LEC',
    subjectName: 'Systems Administration & Maintenance (Lec)',
    units: 2,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '13:00',
    endTime: '14:00',
    room: '318'
  },
  {
    yearLevel: 'Fourth Year',
    subjectCode: 'IT412-LAB',
    subjectName: 'Systems Administration & Maintenance (Lab)',
    units: 1,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '14:00',
    endTime: '15:30',
    room: 'CL - 2'
  },
  {
    yearLevel: 'Fourth Year',
    subjectCode: 'ITELEC3-LEC',
    subjectName: 'IT Elective III (Lec)',
    units: 2,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '14:30',
    endTime: '15:30',
    room: '317'
  },
  {
    yearLevel: 'Fourth Year',
    subjectCode: 'ITELEC3-LAB',
    subjectName: 'IT Elective III (Lab)',
    units: 1,
    dayOfWeek: 'TUESDAY,THURSDAY',
    startTime: '15:30',
    endTime: '17:00',
    room: 'CL - 2'
  },
  {
    yearLevel: 'Fourth Year',
    subjectCode: 'RIZAL',
    subjectName: "Rizal's Life & Works",
    units: 3,
    dayOfWeek: 'MONDAY,WEDNESDAY',
    startTime: '10:30',
    endTime: '12:00',
    room: '307'
  }
];

