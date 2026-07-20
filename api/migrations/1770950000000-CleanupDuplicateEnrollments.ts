import { MigrationInterface, QueryRunner } from 'typeorm';

// Dweezil's Code - Migration to clean up duplicate enrollments
// This migration removes duplicate enrollment records, keeping only the most recent one
// for each student/course combination
export class CleanupDuplicateEnrollments1770950000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Starting migration: Cleanup duplicate enrollments');

    // Step 1: Find and report duplicates
    const duplicates = await queryRunner.query(`
      SELECT 
        e.studentId,
        e.courseId,
        COUNT(*) as enrollmentCount,
        GROUP_CONCAT(e.id ORDER BY e.enrollmentDate DESC) as enrollmentIds,
        GROUP_CONCAT(e.status ORDER BY e.enrollmentDate DESC) as statuses
      FROM enrollments e
      JOIN students s ON e.studentId = s.id
      WHERE e.status IN ('PENDING', 'VERIFIED', 'ENROLLED')
        AND s.registrationStatus IN ('FOR_ENROLLMENT', 'ENROLLED', 'FOR_SCHEDULING')
      GROUP BY e.studentId, e.courseId
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate enrollments found');
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate enrollment group(s)`);

    // Step 2: Delete older duplicates, keep most recent
    let totalDeleted = 0;

    for (const dup of duplicates) {
      const ids = dup.enrollmentIds.split(',');
      const statuses = dup.statuses.split(',');
      
      // Keep the first one (most recent), delete the rest
      const idsToDelete = ids.slice(1);
      
      if (idsToDelete.length > 0) {
        console.log(`   Keeping enrollment ${ids[0]} (${statuses[0]}), deleting ${idsToDelete.length} older record(s)`);
        
        for (const idToDelete of idsToDelete) {
          await queryRunner.query(
            `DELETE FROM enrollments WHERE id = ?`,
            [idToDelete.trim()]
          );
          totalDeleted++;
        }
      }
    }

    console.log(`✅ Deleted ${totalDeleted} duplicate enrollment(s)`);

    // Step 3: Verify cleanup
    const remainingDuplicates = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM (
        SELECT studentId, courseId, COUNT(*) as cnt
        FROM enrollments
        WHERE status IN ('PENDING', 'VERIFIED', 'ENROLLED')
        GROUP BY studentId, courseId
        HAVING COUNT(*) > 1
      ) as dups
    `);

    if (remainingDuplicates[0].count === 0) {
      console.log('✅ Verification passed: No duplicate enrollments remain');
    } else {
      console.log(`⚠️  Warning: ${remainingDuplicates[0].count} duplicate group(s) still exist`);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Cannot restore deleted duplicates
    console.log('⚠️  This migration cannot be reversed - deleted duplicates cannot be restored');
    console.log('   If you need to restore data, use a database backup');
  }
}
