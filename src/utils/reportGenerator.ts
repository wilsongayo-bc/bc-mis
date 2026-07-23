import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Schedule } from '../store/slices/schedulingSlice';

// Interface for jsPDF with autoTable plugin
interface AutoTableDoc extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

const formatTimeCompact = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}${period}`;
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

const formatYearLevelShort = (yearLevel: string) => {
  const normalized = yearLevel.trim().toLowerCase();
  if (normalized === 'first year') return '1st Year';
  if (normalized === 'second year') return '2nd Year';
  if (normalized === 'third year') return '3rd Year';
  if (normalized === 'fourth year') return '4th Year';
  return yearLevel;
};

const formatSemesterShort = (semester: string) => {
  const normalized = semester.trim().toLowerCase();
  if (normalized === 'first semester') return '1st Semester';
  if (normalized === 'second semester') return '2nd Semester';
  return semester;
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
    endorsedBy?: string;
    endorsedByPosition?: string;
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
  const pageHeight = doc.internal.pageSize.height;
  const courseCode = meta.courseCode || (meta.courseName.includes('Bachelor') 
    ? meta.courseName.replace('Bachelor of ', '').split(' ').map(w => w[0]).join('') 
    : meta.courseName);
  
  let yPos = 10;
  if (meta.logoUrl) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'Anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = meta.logoUrl!;
      });

      let format = 'JPEG';
      if (meta.logoUrl && meta.logoUrl.toLowerCase().endsWith('.png')) {
        format = 'PNG';
      }

      const logoSize = 18;
      const logoX = pageWidth / 2 - logoSize / 2;
      doc.addImage(img, format, logoX, yPos, logoSize, logoSize);
      yPos += logoSize + 4;
    } catch {
      void 0;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text((meta.schoolName || 'BENEDICTO COLLEGE').toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (meta.schoolAddress) {
    const addressLines = meta.schoolAddress.split('\n').map(s => s.trim()).filter(Boolean);
    for (const line of addressLines) {
      doc.text(line, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4.5;
    }
  }

  if (meta.schoolEmail) {
    doc.setTextColor(0, 51, 204);
    doc.text(meta.schoolEmail, pageWidth / 2, yPos, { align: 'center' });
    const textWidth = doc.getTextWidth(meta.schoolEmail);
    doc.line(pageWidth / 2 - textWidth / 2, yPos + 1, pageWidth / 2 + textWidth / 2, yPos + 1);
    doc.setTextColor(0, 0, 0);
    yPos += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${formatSemesterShort(meta.semester).toUpperCase()}, SY ${meta.academicYear}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  doc.setFontSize(11);
  doc.text('CLASS SCHEDULE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(11);
  doc.text(meta.courseName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(10);
  doc.text(formatYearLevelShort(meta.yearLevel), pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  const sorted = [...schedules].sort((a, b) => (a.subject?.code || '').localeCompare(b.subject?.code || ''));
  const totalUnits = sorted.reduce((sum, s) => sum + (s.subject?.units || 0), 0);

  autoTable(doc, {
    startY: yPos,
    head: [[
      'COURSE CODE',
      'COURSE DESCRIPTION',
      'NO. OF UNITS',
      'DAY',
      'TIME',
      'ROOM'
    ]],
    body: sorted.map(s => ([
      s.subject?.code || '',
      s.subject?.name || '',
      String(s.subject?.units ?? ''),
      mapDays(s.dayOfWeek),
      `${formatTimeCompact(s.startTime)} - ${formatTimeCompact(s.endTime)}`,
      s.room || ''
    ])),
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 1.2,
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      halign: 'center',
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 28 },
      1: { halign: 'left', cellWidth: 70 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'center', cellWidth: 36 },
      5: { halign: 'center', cellWidth: 16 }
    },
    margin: { left: 14, right: 14 }
  });

  yPos = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Total Number of Units  >>>', 14, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(String(totalUnits), pageWidth - 14, yPos, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  const footerTop = Math.max(yPos + 15, pageHeight - 42);
  const leftX = 14;
  const rightX = pageWidth / 2 + 10;
  const lineWidth = 70;

  const endorsedBy = meta.endorsedBy || meta.preparedBy || '';
  const endorsedByPosition = meta.endorsedByPosition || meta.preparedByPosition || '';
  const approvedBy = meta.approvedBy || '';
  const approvedByPosition = meta.approvedByPosition || '';

  doc.setFontSize(10);
  doc.text('Endorsed by:', leftX, footerTop);
  doc.text('Approved by:', rightX, footerTop);

  const lineY = footerTop + 18;
  doc.line(leftX, lineY, leftX + lineWidth, lineY);
  doc.line(rightX, lineY, rightX + lineWidth, lineY);

  doc.setFont('helvetica', 'bold');
  doc.text(endorsedBy.toUpperCase(), leftX, lineY + 6);
  doc.text(approvedBy.toUpperCase(), rightX, lineY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(endorsedByPosition, leftX, lineY + 11);
  doc.text(approvedByPosition, rightX, lineY + 11);

  // Save or Return Preview URL
  if (options?.preview) {
    return doc.output('bloburl');
  }

  doc.save(`${courseCode}-${meta.yearLevel}-Schedule.pdf`);
};
