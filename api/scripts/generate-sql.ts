
import { newBooksData } from './newbooks-seed-data';
import { randomUUID } from 'crypto';

// Helper to escape SQL strings
const escape = (str: string | number | null | undefined): string => {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'number') return str.toString();
  // Basic escaping for single quotes
  return `'${String(str).replace(/'/g, "''")}'`;
};

async function generateSQL() {
  const books = [
    // Include the original books from seed-data.ts logic if needed, 
    // but here we focus on the newBooksData as requested for the bulk insert
    ...newBooksData
  ];

  console.log('-- SQL Seed Script for Books Table');
  console.log('-- Generated automatically');
  console.log('SET FOREIGN_KEY_CHECKS = 0;');
  console.log('TRUNCATE TABLE books;'); // Optional: Clear existing data
  console.log('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('');
  
  console.log('INSERT INTO books (id, isbn, title, author, publisher, publishedYear, category, totalCopies, availableCopies, location, description, language, pages, edition, createdAt, updatedAt) VALUES');

  const values = books.map((book, index) => {
    const isLast = index === books.length - 1;
    const row = `('${randomUUID()}', ${escape(book.isbn)}, ${escape(book.title)}, ${escape(book.author)}, ${escape(book.publisher)}, ${book.publishedYear}, ${escape(book.category)}, ${book.totalCopies}, ${book.availableCopies}, ${escape(book.location || 'Library')}, ${escape(book.description || '')}, ${escape(book.language || 'English')}, ${book.pages || 0}, ${escape(book.edition || '1st Edition')}, NOW(), NOW())`;
    return `  ${row}${isLast ? ';' : ','}`;
  });

  console.log(values.join('\n'));
}

generateSQL();
