import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Subject } from '../entities/Subject';

async function main() {
  await AppDataSource.initialize();

  const repo = AppDataSource.getRepository(Subject);

  const count = await repo
    .createQueryBuilder('subject')
    .where('subject.yearLevel BETWEEN :min AND :max', { min: 13, max: 16 })
    .getCount();

  await repo
    .createQueryBuilder()
    .update(Subject)
    .set({ yearLevel: () => 'yearLevel - 12' } as any)
    .where('yearLevel BETWEEN :min AND :max', { min: 13, max: 16 })
    .execute();

  console.log(JSON.stringify({ updated: count }));

  await AppDataSource.destroy();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await AppDataSource.destroy();
  } catch {
    void 0;
  }
  process.exit(1);
});
