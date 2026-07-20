import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Schedule } from '../store/slices/schedulingSlice';

// Interface for jsPDF with autoTable plugin
interface AutoTableDoc extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

const formatTime = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const mapDays = (days: string) => {
  if (!days) return '';
  const dayMap: Record<string, string> = {
    'MONDAY': 'M',
    'TUESDAY': 'T',
    'WEDNESDAY': 'W',
    'THURSDAY': 'TH',
    'FRIDAY': 'F',
    'SATURDAY': 'S',
    'SUNDAY': 'SU'
  };
  
  // Handle comma-separated days
  return days.split(',')
    .map(d => dayMap[d.trim().toUpperCase()] || d)
    .join('');
};

export const generateScheduleReport = async (
  schedules: Schedule[],
  meta: {
    courseName: string;
    courseCode?: string;
    semester: string;
    academicYear: string;
    yearLevel: string; // e.g., "FIRST YEAR"
    logoUrl?: string;
    schoolName?: string;
    schoolAddress?: string;
    schoolEmail?: string;
    preparedBy?: string;
    preparedByPosition?: string;
    approvedBy?: string;
    approvedByPosition?: string;
  },
  options?: {
    preview?: boolean;
  }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const courseCode = meta.courseCode || (meta.courseName.includes('Bachelor') 
    ? meta.courseName.replace('Bachelor of ', '').split(' ').map(w => w[0]).join('') 
    : meta.courseName);
  
  // --- Header ---
  let yPos = 15;
  
  // Try to add logo if provided
  if (meta.logoUrl) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'Anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = meta.logoUrl!;
      });
      
      // Determine format from URL or default to JPEG
      let format = 'JPEG';
      if (meta.logoUrl && meta.logoUrl.toLowerCase().endsWith('.png')) {
        format = 'PNG';
      }
      
      // Add logo to the left of the header
      doc.addImage(img, format, 25, 10, 25, 25);
    } catch (e) {
      console.warn('Failed to load logo', e);
    }
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(meta.schoolName || 'COLEGIO De ALICIA', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (meta.schoolAddress) {
    const addressLines = meta.schoolAddress.split('\n').filter(line => line.trim());
    addressLines.forEach(line => {
      doc.text(line.trim(), pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    });
  } else {
    doc.text('Republic of the Philippines', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text('So. Caniogan, Pular, Pob. Alicia', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text('Alicia, Bohol', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  }

  // Add email if provided
  if (meta.schoolEmail) {
    doc.setTextColor(0, 51, 204); // Dark blue like a link
    doc.text(meta.schoolEmail, pageWidth / 2, yPos, { align: 'center' });
    
    // Add underline
    const textWidth = doc.getTextWidth(meta.schoolEmail);
    doc.line(pageWidth / 2 - textWidth / 2, yPos + 1, pageWidth / 2 + textWidth / 2, yPos + 1);
    
    doc.setTextColor(0, 0, 0); // Reset color
    yPos += 5;
  }
  
  yPos += 5; // Extra spacing after header

  // Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(meta.courseName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  // Semester & AY
  doc.text(`${meta.semester.toUpperCase()} - A.Y. ${meta.academicYear}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Year Level Header (e.g., BTVTED - FIRST YEAR)
    
  doc.setFillColor(220, 220, 220); // Light gray
  doc.rect(14, yPos - 5, pageWidth - 28, 7, 'F');
  doc.text(`${courseCode} - ${meta.yearLevel.toUpperCase()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  // --- Content ---
  
  // Group schedules by Block (Section)
  const grouped = schedules.reduce((acc, schedule) => {
    const block = schedule.courseSection?.sectionName || 'Unknown Block';
    if (!acc[block]) acc[block] = [];
    acc[block].push(schedule);
    return acc;
  }, {} as Record<string, Schedule[]>);

  // Sort blocks (Block 1, Block 2, ...)
  const blocks = Object.keys(grouped).sort();

  for (const block of blocks) {
    const blockSchedules = grouped[block];
    
    // Calculate Total Units
    const totalUnits = blockSchedules.reduce((sum, s) => sum + (s.subject?.units || 0), 0);

    // Section Header
    // doc.setFillColor(100, 100, 100); // Darker gray
    // doc.setTextColor(255, 255, 255);
    // doc.rect(14, yPos, pageWidth - 28, 7, 'F');
    // doc.text(`${courseCode} ${block}`, pageWidth / 2, yPos + 5, { align: 'center' });
    // doc.setTextColor(0, 0, 0);
    // yPos += 7;

    // Table
    autoTable(doc, {
      startY: yPos,
      head: [[
        { content: `${courseCode} ${block}`, colSpan: 9, styles: { halign: 'center', fillColor: [100, 100, 100], textColor: [255, 255, 255], fontStyle: 'bold' } }
      ], [
        'SUBJECT', 
        'SUBJECT DESCRIPTION', 
        'UNIT', 
        'TIME START', 
        'TIME END', 
        'DAYS', 
        'ROOM', 
        'NO OF STUD', 
        'INSTRUCTOR'
      ]],
      body: [
        ...blockSchedules.map(s => [
          s.subject?.code || '',
          s.subject?.name || '',
          s.subject?.units || 0,
          formatTime(s.startTime),
          formatTime(s.endTime),
          mapDays(s.dayOfWeek),
          s.room || '',
          s.courseSection?.maxStudents || 50, // Default to 50 if not set
          s.teacher?.user 
            ? `${s.teacher.user.firstName} ${s.teacher.user.lastName}` 
            : 'TBA'
        ]),
        // Total Row
        [
          { content: 'TOTAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: totalUnits, styles: { fontStyle: 'bold' } },
          { content: '', colSpan: 6 }
        ]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        halign: 'center',
        fontSize: 8
      },
      bodyStyles: {
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        fontSize: 8,
        halign: 'center'
      },
      styles: {
        cellPadding: 1,
        overflow: 'linebreak'
      },
      columnStyles: {
        1: { halign: 'left' }, // Description aligned left
        8: { halign: 'left' }  // Instructor aligned left
      },
      margin: { top: 10, left: 10, right: 10 },
      pageBreak: 'avoid' // Try to keep blocks together
    });

    // Update yPos for next block
    yPos = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 10;
  }

  // --- Footer ---
  // Check if we have enough space, else add page
  if (yPos > doc.internal.pageSize.height - 40) {
    doc.addPage();
    yPos = 20;
  }

  yPos += 10;
  doc.setFontSize(10);
  
  // Signatures
  const leftX = 20;
  const rightX = pageWidth - 80;

  doc.text('Prepared by:', leftX, yPos);
  doc.text('Approved by:', rightX, yPos);
  
  yPos += 15;
  
  // Placeholder names - could be passed in meta or dynamic
  doc.setFont('helvetica', 'bold');
  doc.text((meta.preparedBy || 'SHEILA A. GALORIO, PhD').toUpperCase(), leftX, yPos);
  doc.text((meta.approvedBy || 'MA. CLEA DE ALVAREZ, PhD, Dev.Ed.D').toUpperCase(), rightX, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  yPos += 4;
  doc.text(meta.preparedByPosition || 'Program Head, BTVTED', leftX, yPos);
  doc.text(meta.approvedByPosition || 'School President', rightX, yPos);

  // Save or Return Preview URL
  if (options?.preview) {
    return doc.output('bloburl');
  }

  doc.save(`${meta.courseName}-${meta.yearLevel}-Schedule.pdf`);
};
