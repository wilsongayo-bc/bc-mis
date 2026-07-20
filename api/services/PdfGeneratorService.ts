import puppeteer, { Browser } from 'puppeteer';
import * as Handlebars from 'handlebars';
import { AppDataSource } from '../config/database';
import { Course } from '../entities/Course';
import { Subject } from '../entities/Subject';
import { Department } from '../entities/Department';
import { Settings } from '../entities/Settings';

import { CourseSection } from '../entities/CourseSection';

export interface SyllabusData {
  university: string;
  program: string;
  effectiveYear: string;
  courses: CourseData[];
  totalUnits: number;
  departments: DepartmentData[];
  schoolLogo?: string;
}

export interface CourseData {
  yearLevel: string;
  semester: string;
  subjects: SubjectData[];
  yearTotalUnits: number;
  semesterTotalUnits: number;
}

export interface SubjectData {
  code: string;
  name: string;
  units: number;
  lectureHours: number;
  labHours: number;
  prerequisites: string[];
  description?: string;
}

export interface DepartmentData {
  name: string;
  code: string;
  description?: string;
}

export class PdfGeneratorService {
  private browser: Browser | null = null;

  /**
   * Fetch school settings from the database
   * @returns Object containing school name and logo URL
   */
  private async getSchoolSettings(): Promise<{ schoolName: string; schoolLogo?: string }> {
    const settingsRepository = AppDataSource.getRepository(Settings);
    
    try {
      const schoolNameSetting = await settingsRepository.findOne({
        where: { key: 'school_name' }
      });
      
      const schoolLogoSetting = await settingsRepository.findOne({
        where: { key: 'school_logo' }
      });

      return {
        schoolName: schoolNameSetting?.value || 'UNIVERSITY OF THE IMMACULATE CONCEPTION',
        schoolLogo: schoolLogoSetting?.value || undefined
      };
    } catch (error) {
      console.error('Error fetching school settings:', error);
      // Return default values if database query fails
      return {
        schoolName: 'UNIVERSITY OF THE IMMACULATE CONCEPTION',
        schoolLogo: undefined
      };
    }
  }

  async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async generateSyllabusPdf(programCode: string, academicYear: string): Promise<Buffer> {
    await this.initializeBrowser();
    
    try {
      const syllabusData = await this.getSyllabusData(programCode, academicYear);
      const htmlContent = await this.generateSyllabusHtml(syllabusData);
      
      const page = await this.browser!.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      
      await page.close();
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  async generateProspectusPdf(departmentCode: string, academicYear: string): Promise<Buffer> {
    await this.initializeBrowser();
    
    try {
      const prospectusData = await this.getProspectusData(departmentCode, academicYear);
      const htmlContent = await this.generateProspectusHtml(prospectusData);
      
      const page = await this.browser!.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '10mm',
          bottom: '15mm',
          left: '10mm'
        }
      });
      
      await page.close();
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Error generating prospectus PDF:', error);
      throw error;
    }
  }

  public async getSyllabusData(programCode: string, academicYear: string): Promise<SyllabusData> {
    const courseRepository = AppDataSource.getRepository(Course);
    const subjectRepository = AppDataSource.getRepository(Subject);

    // Get school settings
    const schoolSettings = await this.getSchoolSettings();

    // Get course by program code
    const course = await courseRepository.findOne({
      where: { courseCode: programCode, isActive: true },
      relations: ['department', 'sections']
    });

    if (!course) {
      throw new Error(`Course with code ${programCode} not found`);
    }

    // Get all subjects for the department
    const subjects = await subjectRepository.find({
      where: { departmentId: course.departmentId, isActive: true },
      relations: ['department', 'prerequisites', 'prerequisites.prerequisiteSubject']
    });

    // Get course sections to understand curriculum structure
    const courseSections = await AppDataSource.getRepository(CourseSection).find({
      where: { 
        courseId: course.id, 
        academicYear: academicYear,
        isActive: true 
      },
      relations: ['course', 'schedules', 'schedules.subject']
    });

    // Organize subjects by year and semester
    const courseData = this.organizeCourseData(courseSections, subjects);
    
    const totalUnits = subjects.reduce((sum, subject) => sum + subject.units, 0);

    return {
      university: schoolSettings.schoolName,
      program: `${course.name} (${course.courseCode})`,
      effectiveYear: academicYear,
      courses: courseData,
      totalUnits,
      departments: [{
        name: course.department.name,
        code: course.department.code,
        description: course.department.description
      }],
      schoolLogo: schoolSettings.schoolLogo
    };
  }

  public async getProspectusData(departmentCode: string, academicYear: string): Promise<SyllabusData> {
    const departmentRepository = AppDataSource.getRepository(Department);
    const courseRepository = AppDataSource.getRepository(Course);
    const subjectRepository = AppDataSource.getRepository(Subject);

    // Get school settings
    const schoolSettings = await this.getSchoolSettings();

    // Get department
    const department = await departmentRepository.findOne({
      where: { code: departmentCode, isActive: true },
      relations: ['courses', 'subjects']
    });

    if (!department) {
      throw new Error(`Department with code ${departmentCode} not found`);
    }

    // Get all courses in the department
    const courses = await courseRepository.find({
      where: { departmentId: department.id, isActive: true },
      relations: ['sections']
    });

    // Get all subjects in the department
    const subjects = await subjectRepository.find({
      where: { departmentId: department.id, isActive: true },
      relations: ['prerequisites', 'prerequisites.prerequisiteSubject']
    });

    // Get all course sections for the academic year
    const courseSections = await AppDataSource.getRepository(CourseSection).find({
      where: { 
        academicYear: academicYear,
        isActive: true 
      },
      relations: ['course', 'schedules', 'schedules.subject']
    });

    // Filter course sections for this department's courses
    const departmentCourseSections = courseSections.filter(cs => 
      courses.some(course => course.id === cs.courseId)
    );

    const courseData = this.organizeCourseData(departmentCourseSections, subjects);
    const totalUnits = subjects.reduce((sum, subject) => sum + subject.units, 0);

    return {
      university: schoolSettings.schoolName,
      program: `${department.name} Programs`,
      effectiveYear: academicYear,
      courses: courseData,
      totalUnits,
      departments: [{
        name: department.name,
        code: department.code,
        description: department.description
      }],
      schoolLogo: schoolSettings.schoolLogo
    };
  }

  private organizeCourseData(courseSections: CourseSection[], subjects: Subject[]): CourseData[] {
    const yearLevels = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];
    const semesters = ['First Semester', 'Second Semester'];
    
    const courseData: CourseData[] = [];

    for (const yearLevel of yearLevels) {
      for (const semester of semesters) {
        const semesterSections = courseSections.filter(cs => 
          cs.yearLevel === yearLevel && cs.semester === semester
        );

        if (semesterSections.length > 0) {
          const semesterSubjects: SubjectData[] = [];
          
          // Get unique subjects for this semester
          const subjectIds = new Set<string>();
          semesterSections.forEach(section => {
            section.schedules?.forEach(schedule => {
              if (schedule.subject) {
                subjectIds.add(schedule.subject.id);
              }
            });
          });

          // Convert to SubjectData
          subjectIds.forEach(subjectId => {
            const subject = subjects.find(s => s.id === subjectId);
            if (subject) {
              const prerequisites = subject.prerequisites?.map(p => p.prerequisiteSubject.code) || [];
              
              semesterSubjects.push({
                code: subject.code,
                name: subject.name,
                units: subject.units,
                lectureHours: subject.lectureHours,
                labHours: subject.labHours,
                prerequisites,
                description: subject.description
              });
            }
          });

          const semesterTotalUnits = semesterSubjects.reduce((sum, subject) => sum + subject.units, 0);

          courseData.push({
            yearLevel,
            semester,
            subjects: semesterSubjects.sort((a, b) => a.code.localeCompare(b.code)),
            yearTotalUnits: 0, // Will be calculated later
            semesterTotalUnits
          });
        }
      }
    }

    // Calculate year totals
    for (const yearLevel of yearLevels) {
      const yearSemesters = courseData.filter(cd => cd.yearLevel === yearLevel);
      const yearTotal = yearSemesters.reduce((sum, semester) => sum + semester.semesterTotalUnits, 0);
      
      yearSemesters.forEach(semester => {
        semester.yearTotalUnits = yearTotal;
      });
    }

    return courseData;
  }

  private async generateSyllabusHtml(data: SyllabusData): Promise<string> {
    const template = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{program}} - Course Syllabus</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12px;
            line-height: 1.3;
            margin: 0;
            padding: 20px;
            color: #000;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border: 2px solid #000;
            padding: 15px;
        }
        
        .school-logo {
            max-width: 60px;
            max-height: 60px;
            margin-bottom: 10px;
            object-fit: contain;
        }
        
        .school-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .program-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .effective-year {
            font-size: 12px;
            margin-top: 10px;
        }
        
        .year-section {
            margin-bottom: 25px;
            border: 1px solid #000;
            padding: 0;
        }
        
        .year-title {
            background-color: #f0f0f0;
            padding: 8px;
            font-weight: bold;
            font-size: 13px;
            text-align: center;
            border-bottom: 1px solid #000;
            margin: 0;
        }
        
        .year-content {
            padding: 15px;
        }
        
        .semester-section {
            margin-bottom: 20px;
        }
        
        .semester-title {
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 12px;
        }
        
        .subjects-list {
            margin-left: 20px;
            margin-bottom: 10px;
        }
        
        .subject-item {
            display: flex;
            padding: 3px 0;
            font-size: 11px;
            border-bottom: 1px dotted #ccc;
        }
        
        .subject-code {
            font-weight: bold;
            width: 80px;
            flex-shrink: 0;
        }
        
        .subject-name {
            flex: 1;
            margin: 0 15px;
        }
        
        .subject-units {
            width: 60px;
            text-align: right;
            flex-shrink: 0;
        }
        
        .semester-total {
            text-align: right;
            font-size: 11px;
            margin-top: 8px;
            padding-right: 60px;
            font-style: italic;
        }
        
        .total-section {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            margin-top: 30px;
            padding: 15px;
            background-color: #f8f8f8;
            border: 2px solid #000;
        }
        
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        {{#if schoolLogo}}
        <img src="{{schoolLogo}}" alt="School Logo" class="school-logo" />
        {{/if}}
        <div class="school-name">{{university}}</div>
        <div class="program-title">{{program}}</div>
        <div class="effective-year">Effective A.Y. {{effectiveYear}}</div>
    </div>

    {{#each courses}}
    {{#if @first}}
    <div class="year-section">
        <div class="year-title">{{yearLevel}}</div>
        <div class="year-content">
    {{/if}}
    
    {{#unless @first}}
    {{#ifDifferent yearLevel ../courses.[subtract @index 1].yearLevel}}
        </div>
    </div>
    <div class="year-section">
        <div class="year-title">{{yearLevel}}</div>
        <div class="year-content">
    {{/ifDifferent}}
    {{/unless}}
    
            <div class="semester-section">
                <div class="semester-title">├─ {{semester}}</div>
                <div class="subjects-list">
                    {{#each subjects}}
                    <div class="subject-item">
                        <span class="subject-code">{{code}}</span>
                        <span class="subject-name">{{name}}</span>
                        <span class="subject-units">{{units}} units</span>
                    </div>
                    {{/each}}
                </div>
                <div class="semester-total">Semester Total: {{semesterTotalUnits}} units</div>
            </div>
    
    {{#if @last}}
        </div>
    </div>
    {{/if}}
    
    {{#unless @last}}
    {{#ifDifferent yearLevel ../courses.[add @index 1].yearLevel}}
        </div>
    </div>
    {{/ifDifferent}}
    {{/unless}}
    {{/each}}

    <div class="total-section">
        TOTAL UNITS: {{totalUnits}}
    </div>

    <div class="footer">
        Generated on {{currentDate}}
    </div>
</body>
</html>`;

    // Register Handlebars helpers
    Handlebars.registerHelper('ifDifferent', function(a, b, options) {
      if (a !== b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    Handlebars.registerHelper('subtract', function(a, b) {
      return a - b;
    });

    Handlebars.registerHelper('add', function(a, b) {
      return a + b;
    });

    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate({
      ...data,
      currentDate: new Date().toLocaleDateString()
    });
  }

  private async generateProspectusHtml(data: SyllabusData): Promise<string> {
    // Similar to syllabus but with more compact layout for prospectus
    const template = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{program}} - Prospectus</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            font-size: 10px;
            line-height: 1.2;
            margin: 0;
            padding: 0;
            color: #000;
        }
        
        .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .school-logo {
            max-width: 60px;
            max-height: 60px;
            margin-bottom: 8px;
            object-fit: contain;
        }
        
        .university-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 3px;
        }
        
        .program-title {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 3px;
        }
        
        .effective-year {
            font-size: 10px;
            margin-bottom: 8px;
        }
        
        .curriculum-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .year-column {
            border: 1px solid #000;
        }
        
        .year-header {
            background-color: #000;
            color: white;
            padding: 5px;
            font-weight: bold;
            font-size: 11px;
            text-align: center;
        }
        
        .semester-block {
            border-bottom: 1px solid #ccc;
            padding: 8px;
        }
        
        .semester-header {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 5px;
            text-align: center;
            background-color: #f0f0f0;
            padding: 2px;
        }
        
        .subject-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .subject-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 9px;
        }
        
        .subject-code {
            font-weight: bold;
            width: 60px;
        }
        
        .subject-name {
            flex: 1;
            margin: 0 5px;
        }
        
        .subject-units {
            width: 20px;
            text-align: center;
        }
        
        .semester-total {
            text-align: right;
            font-weight: bold;
            margin-top: 5px;
            font-size: 9px;
            border-top: 1px solid #ccc;
            padding-top: 2px;
        }
        
        .summary-section {
            margin-top: 20px;
            text-align: center;
        }
        
        .grand-total {
            font-weight: bold;
            font-size: 12px;
            padding: 8px;
            background-color: #000;
            color: white;
        }
        
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8px;
            color: #666;
        }
        
        @media print {
            .curriculum-grid {
                display: block;
            }
            
            .year-column {
                display: inline-block;
                width: 48%;
                vertical-align: top;
                margin-right: 2%;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        {{#if schoolLogo}}
        <img src="{{schoolLogo}}" alt="School Logo" class="school-logo" />
        {{/if}}
        <div class="university-name">{{university}}</div>
        <div class="program-title">{{program}}</div>
        <div class="effective-year">Effective A.Y. {{effectiveYear}}</div>
    </div>

    <div class="curriculum-grid">
        {{#each courses}}
        {{#if @first}}
        <div class="year-column">
            <div class="year-header">{{yearLevel}}</div>
        {{/if}}
        
        {{#unless @first}}
        {{#ifDifferent yearLevel ../courses.[subtract @index 1].yearLevel}}
            </div>
            <div class="year-column">
                <div class="year-header">{{yearLevel}}</div>
        {{/ifDifferent}}
        {{/unless}}
        
            <div class="semester-block">
                <div class="semester-header">{{semester}}</div>
                <ul class="subject-list">
                    {{#each subjects}}
                    <li class="subject-item">
                        <span class="subject-code">{{code}}</span>
                        <span class="subject-name">{{name}}</span>
                        <span class="subject-units">{{units}}</span>
                    </li>
                    {{/each}}
                </ul>
                <div class="semester-total">Total: {{semesterTotalUnits}} units</div>
            </div>
        
        {{#if @last}}
        </div>
        {{/if}}
        
        {{#unless @last}}
        {{#ifDifferent yearLevel ../courses.[add @index 1].yearLevel}}
        </div>
        {{/ifDifferent}}
        {{/unless}}
        {{/each}}
    </div>

    <div class="summary-section">
        <div class="grand-total">
            TOTAL CURRICULUM UNITS: {{totalUnits}}
        </div>
    </div>

    <div class="footer">
        Generated on {{currentDate}} | {{university}}
    </div>
</body>
</html>`;

    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate({
      ...data,
      currentDate: new Date().toLocaleDateString()
    });
  }
}