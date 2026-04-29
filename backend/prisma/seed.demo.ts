/**
 * seed.demo.ts — 演示数据初始化脚本
 *
 * 包含平台完整演示所需的：标签、系统智能体、演示用户、案件数据
 * 不含真实用户的密码/头像等敏感信息。
 *
 * 运行方式：
 *   npx ts-node -P tsconfig.json prisma/seed.demo.ts
 *
 * 注意：脚本使用 upsert，重复执行安全，不会产生重复数据。
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始写入演示数据...\n');

  // ── 1. 话题标签 ─────────────────────────────────────────────
  const tagDefs = [
    { name: '学业压力', color: '#6366F1', weight: 10 },
    { name: '感情困惑', color: '#EC4899', weight: 10 },
    { name: '职业规划', color: '#F97316', weight: 9 },
    { name: '家庭矛盾', color: '#8B5CF6', weight: 8 },
    { name: '人际关系', color: '#10B981', weight: 8 },
    { name: '消费决策', color: '#EAB308', weight: 7 },
    { name: '法律权益', color: '#3B82F6', weight: 7 },
    { name: '心理健康', color: '#14B8A6', weight: 9 },
    { name: '就业求职', color: '#F43F5E', weight: 8 },
    { name: '留学出国', color: '#0EA5E9', weight: 6 },
  ];

  const tags: Record<string, any> = {};
  for (const t of tagDefs) {
    const tag = await prisma.tag.upsert({
      where: { name: t.name },
      update: { color: t.color, weight: t.weight },
      create: t,
    });
    tags[t.name] = tag;
  }
  console.log('✅ 话题标签:', Object.keys(tags).join(' / '));

  // ── 2. 系统智能体 ────────────────────────────────────────────
  const agentDefs = [
    {
      id: 'bot_A',
      name: '毒舌现实主义者',
      personality: '犀利直接，说话不留情面',
      description:
        '一位以犀利著称的评论家，不相信委婉，只相信事实。在辩论中用最直接的语言给出最现实的建议，擅长揭示选择背后的真实代价和风险。',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bot_A',
      signature: '现实就是这样残酷，接受它才能改变它。',
      winRate: 0.65,
      participateCount: 24,
      fans: 328,
    },
    {
      id: 'bot_B',
      name: '温柔共情者',
      personality: '温暖理解，充满同理心',
      description:
        '一位懂大学生心理的情感支持者，总是能理解每个人内心的需求和痛点。在辩论中更看重人性和情感，擅长从心理健康和价值观角度分析问题。',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bot_B',
      signature: '每个选择背后，都有深层的原因值得被理解。',
      winRate: 0.58,
      participateCount: 19,
      fans: 412,
    },
    {
      id: 'bot_C',
      name: '中立观察者',
      personality: '客观公正，平和清晰',
      description:
        '一位冷静客观的学生事务顾问，擅长在两种声音之间找到平衡点。不站队、不说教，只帮你看清问题的全貌，给出真正可操作的建议。',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bot_C',
      signature: '看清全貌，才能做出真正属于你的选择。',
      winRate: 0.72,
      participateCount: 31,
      fans: 567,
    },
  ];

  for (const a of agentDefs) {
    await prisma.agent.upsert({
      where: { id: a.id },
      update: {
        name: a.name,
        personality: a.personality,
        description: a.description,
        signature: a.signature,
      },
      create: { ...a, isSystem: true, isPublic: true, status: 'APPROVED' },
    });
  }
  console.log('✅ 系统智能体: 毒舌现实主义者 / 温柔共情者 / 中立观察者');

  // ── 3. 演示用户 ──────────────────────────────────────────────
  // 密码均为 demo123456（已 bcrypt 加密）
  const demoPassword = await bcrypt.hash('demo123456', 10);
  const adminPassword = await bcrypt.hash('admin123456', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@debate.local' },
    update: {},
    create: {
      email: 'demo@debate.local',
      name: '演示用户',
      password: demoPassword,
      bio: '这是演示账号，可以体验平台全部功能',
      role: 'USER',
      level: 2,
      exp: 420,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@debate.local' },
    update: {},
    create: {
      email: 'admin@debate.local',
      name: '管理员',
      password: adminPassword,
      role: 'ADMIN',
      level: 5,
      exp: 9999,
    },
  });

  console.log(`✅ 演示用户: ${demoUser.email} (密码: demo123456)`);
  console.log(`✅ 管理员:   ${adminUser.email} (密码: admin123456)`);

  // ── 4. 演示案件 ──────────────────────────────────────────────
  const roomDefs = [
    {
      title: '考研值不值得全力以赴',
      content:
        '每年数百万人参加考研，但上岸率不到三成。在这个"学历贬值"的时代，花上一两年备考、放弃工作机会和社会经验，究竟是一场值得的投资，还是一种对现实的逃避？',
      image:
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
      status: 'CLOSED',
      tagIds: ['职业规划'],
      agents: ['bot_A', 'bot_B', 'bot_C'],
      viewCount: 94,
      commentCount: 1,
      createdAt: new Date('2026-04-27T08:39:07.839Z'),
    },
    {
      title: '我要不要和异地恋的他/她分手',
      content:
        '在一起三年，异地快一年了，感觉越来越疏远，争吵也越来越多。他说等他毕业就回来，但还有两年。我不知道自己能不能撑下去，又怕分手后后悔。感情还是要将就还是放手？',
      image:
        'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80',
      status: 'CLOSED',
      tagIds: ['感情困惑', '人际关系'],
      agents: ['bot_A', 'bot_B', 'bot_C'],
      viewCount: 25,
      commentCount: 0,
      createdAt: new Date('2026-04-26T14:22:18.343Z'),
    },
    {
      title: '大三要不要休学创业',
      content:
        '我和两个朋友做了一个小程序，最近有投资人愿意谈，但需要全职投入。学校还有一年半，放弃了就要办休学。父母反对，说创业太冒险，先把学历拿到手。但我觉得机会不等人，你们怎么看？',
      image:
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
      status: 'CLOSED',
      tagIds: ['职业规划', '就业求职'],
      agents: ['bot_A', 'bot_B', 'bot_C'],
      viewCount: 16,
      commentCount: 1,
      createdAt: new Date('2026-04-27T08:54:00.573Z'),
    },
    {
      title: '父母催婚压力大，要不要妥协相亲',
      content:
        '今年25岁，刚工作一年，父母已经开始催婚，每次回家都要被逼着相亲。我觉得自己还没准备好，职业也才起步。但他们说女生年纪大了就难嫁。我该顺从还是坚持自己的节奏？',
      image:
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
      status: 'CLOSED',
      tagIds: ['家庭矛盾', '感情困惑'],
      agents: ['bot_A', 'bot_B', 'bot_C'],
      viewCount: 27,
      commentCount: 1,
      createdAt: new Date('2026-04-27T10:19:18.619Z'),
    },
    {
      title: '毕业后要去大城市打拼还是回小城市躺平',
      content:
        '即将毕业，收到了北京一家互联网公司的 offer，薪资不错但压力极大；同时老家那边有一份稳定的国企岗位。前者意味着高压高薪、租房漂泊；后者意味着安稳低薪、离家近。两条路都有人过得很好，也有人后悔，我该怎么选？',
      image:
        'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
      status: 'CLOSED',
      tagIds: ['职业规划', '就业求职'],
      agents: ['bot_A', 'bot_B', 'bot_C'],
      viewCount: 18,
      commentCount: 0,
      createdAt: new Date('2026-04-29T14:10:03.776Z'),
    },
    {
      title: '室友严重影响我学习，要不要申请换宿舍',
      content:
        '室友每天凌晨打游戏、外卖不收、堆一屋子垃圾，多次沟通无效。我的睡眠和学习状态越来越差，期末考试快到了。但换宿舍可能破坏整个宿舍关系，也不知道新宿舍会不会更差。该忍还是换？',
      image:
        'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
      status: 'LIVE',
      tagIds: ['人际关系', '心理健康'],
      agents: ['bot_A', 'bot_B', 'bot_C'],
      viewCount: 12,
      commentCount: 0,
      createdAt: new Date('2026-04-29T14:10:03.784Z'),
    },
    {
      title: '要不要花六千块买一台相机追求摄影爱好',
      content:
        '一直对摄影很感兴趣，但现在每月生活费只有两千，买相机要动用近三个月的积蓄，还是父母辛苦给的。手机拍照也能用，但总觉得不够专业。这笔钱花还是不花？兴趣值不值得这么大代价？',
      image:
        'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=800&q=80',
      status: 'WAITING',
      tagIds: ['消费决策', '学业压力'],
      agents: ['bot_A', 'bot_B', 'bot_C'],
      viewCount: 8,
      commentCount: 0,
      createdAt: new Date('2026-04-29T14:10:03.788Z'),
    },
    {
      title: '发现好友在背后说我坏话，要不要当面质问',
      content:
        '偶然看到好友和其他人的聊天记录，发现她说了很多关于我的负面评价，包括嫌弃我性格和一些私密的事。我们认识七年了，我一直把她当最好的朋友。要不要告诉她我看到了？还是假装不知道继续维持关系？',
      image:
        'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80',
      status: 'CLOSED',
      tagIds: ['人际关系', '感情困惑'],
      agents: ['bot_A', 'bot_B', 'bot_C'],
      viewCount: 22,
      commentCount: 0,
      createdAt: new Date('2026-04-29T14:10:03.791Z'),
    },
    {
      title: '焦虑症确诊了，要不要告诉父母和老师',
      content:
        '最近去心理咨询，被诊断为轻度焦虑症，医生建议定期复诊。但我不知道要不要告诉父母，怕他们过度担心或觉得我矫情；也不确定要不要告诉辅导员，怕影响评优或被特殊对待。应该公开还是自己默默治疗？',
      image:
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
      status: 'CLOSED',
      tagIds: ['心理健康', '家庭矛盾'],
      agents: ['bot_A', 'bot_B', 'bot_C'],
      viewCount: 15,
      commentCount: 0,
      createdAt: new Date('2026-04-29T14:10:03.794Z'),
    },
  ];

  for (const r of roomDefs) {
    // 检查是否已存在（按标题+owner去重）
    const existing = await prisma.room.findFirst({
      where: { title: r.title, ownerId: demoUser.id },
    });
    if (existing) {
      console.log(`  ⏭  已存在，跳过: ${r.title.slice(0, 25)}`);
      continue;
    }

    const room = await prisma.room.create({
      data: {
        title: r.title,
        content: r.content,
        image: r.image,
        status: r.status,
        ownerId: demoUser.id,
        agents: JSON.stringify(r.agents),
        viewCount: r.viewCount,
        commentCount: r.commentCount,
        createdAt: r.createdAt,
        tags: {
          create: r.tagIds.map((name) => ({ tagId: tags[name].id })),
        },
      },
    });
    console.log(`  ✅ 案件: ${room.title.slice(0, 30)}`);
  }

  console.log('\n✨ 演示数据写入完成！');
  console.log('\n📋 登录账号：');
  console.log('  普通用户: demo@debate.local  / demo123456');
  console.log('  管理员:   admin@debate.local / admin123456');
}

main()
  .catch((e) => {
    console.error('❌ 写入失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
