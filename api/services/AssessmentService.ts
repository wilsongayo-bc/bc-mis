import { AppDataSource } from '../config/database';
import { Fee } from '../entities/Fee';
import { Course } from '../entities/Course';
import { Subject } from '../entities/Subject';
import { Enrollment } from '../entities/Enrollment';

export interface AssessmentResult {
  fees: {
    id: string;
    name: string;
    amount: number;
    type: string;
    description?: string;
  }[];
  summary: {
    tuition: number;
    miscellaneous: number;
    laboratory: number;
    other: number;
    total: number;
    totalUnits: number;
  };
}

export class AssessmentService {
  private feeRepository = AppDataSource.getRepository(Fee);
  private subjectRepository = AppDataSource.getRepository(Subject);
  private courseRepository = AppDataSource.getRepository(Course);

  /**
   * Calculate fees for a set of subjects and student context
   */
  async calculateAssessment(
    courseId: string,
    yearLevel: number,
    subjectIds: string[]
  ): Promise<AssessmentResult> {
    // 1. Fetch Subjects to calculate total units
    const subjects = await this.subjectRepository.findByIds(subjectIds);
    const totalUnits = subjects.reduce((sum, sub) => sum + Number(sub.units), 0);
    const hasLab = subjects.some(sub => sub.labHours > 0); // Assuming labHours > 0 means it's a lab subject

    // 2. Fetch Applicable Fees
    // Fees can be:
    // - Global (courseId is null, yearLevel is null)
    // - Course Specific (courseId matches)
    // - Year Level Specific (yearLevel matches)
    // - Specific combinations
    const fees = await this.feeRepository.createQueryBuilder('fee')
      .where('fee.isActive = :isActive', { isActive: true })
      .andWhere(
        '(fee.courseId = :courseId OR fee.courseId IS NULL)',
        { courseId }
      )
      .andWhere(
        '(fee.yearLevel = :yearLevel OR fee.yearLevel IS NULL)',
        { yearLevel }
      )
      .getMany();

    // 3. Calculate Amounts
    const calculatedFees = fees.map(fee => {
      let amount = Number(fee.amount);
      
      if (fee.isPerUnit) {
        amount = amount * totalUnits;
      }

      // Logic for Lab fees could be complex (per lab subject vs per student)
      // For now, if fee.type is LAB and student has NO lab subjects, maybe exclude it?
      // Or if it is a specific lab fee linked to a subject (which our Fee entity doesn't support yet directly, 
      // but usually Lab Fees are generic or attached to subject metadata. 
      // Let's assume generic "Laboratory Fee" applies if any lab subject exists, 
      // or if it's just a standard fee for that course/year.)
      
      return {
        id: fee.id,
        name: fee.name,
        amount: amount,
        type: fee.type,
        description: fee.description
      };
    });

    // 4. Summarize
    const summary = {
      tuition: 0,
      miscellaneous: 0,
      laboratory: 0,
      other: 0,
      total: 0,
      totalUnits
    };

    calculatedFees.forEach(fee => {
      const amt = fee.amount;
      summary.total += amt;
      switch (fee.type) {
        case 'TUITION': summary.tuition += amt; break;
        case 'MISC': summary.miscellaneous += amt; break;
        case 'LAB': summary.laboratory += amt; break;
        default: summary.other += amt; break;
      }
    });

    return {
      fees: calculatedFees,
      summary
    };
  }
}
