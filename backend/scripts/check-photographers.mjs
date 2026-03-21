import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
try {
  const rows = await prisma.photographer.findMany({ orderBy: { id: 'asc' } });
  console.log('photographers 表记录数:', rows.length);
  for (const r of rows) {
    console.log(
      `- id=${r.id} name=${r.name} enabled=${r.enabled} title=${r.title ?? ''}`,
    );
  }
} catch (e) {
  console.error('查询失败:', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
