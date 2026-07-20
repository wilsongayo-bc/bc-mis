import 'reflect-metadata';
import { Book } from '../entities/Book';
import { BorrowRecord } from '../entities/BorrowRecord';
import { AppDataSource } from '../config/database';

async function cleanBooksTable() {
  console.log('🚀 Starting books table cleanup...');
  
  try {
    // Connect to database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('✅ Database connection established');

    // Get repositories
    const bookRepository = AppDataSource.getRepository(Book);
    const borrowRecordRepository = AppDataSource.getRepository(BorrowRecord);

    // Check for active borrow records
    const activeBorrowRecords = await borrowRecordRepository
      .createQueryBuilder('br')
      .where('br.status IN (:...statuses)', { 
        statuses: ['BORROWED', 'OVERDUE'] 
      })
      .getCount();

    if (activeBorrowRecords > 0) {
      console.log(`⚠️  Warning: Found ${activeBorrowRecords} active borrow records`);
      console.log('📋 Options:');
      console.log('1. Delete all borrow records (DESTRUCTIVE - will lose borrowing history)');
      console.log('2. Cancel cleanup and handle active borrows first');
      console.log('');
      console.log('💡 Recommendation: Return all borrowed books first, then run cleanup');
      
      // For now, we'll proceed with option 1 but warn the user
      console.log('🔄 Proceeding with cleanup - this will delete ALL borrow records...');
      
      // Delete all borrow records first (due to foreign key constraint)
      const deletedBorrowRecords = await borrowRecordRepository
        .createQueryBuilder()
        .delete()
        .execute();
      
      console.log(`🗑️  Deleted ${deletedBorrowRecords.affected} borrow records`);
    }

    // Now delete all books
    const deletedBooks = await bookRepository
      .createQueryBuilder()
      .delete()
      .execute();

    console.log(`📚 Deleted ${deletedBooks.affected} books`);

    // Close connection
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
    
    console.log('');
    console.log('🎉 Books table cleanup completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Run the ebook extraction script to re-import books');
    console.log('   2. Verify the import was successful');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanBooksTable();
}