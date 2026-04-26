import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据...');

  // 清空现有数据（可选）
  // await prisma.agent.deleteMany()

  // 创建三个 Agent
  const agents = await Promise.all([
    prisma.agent.upsert({
      where: { id: 'bot_A' },
      update: {
        name: '毒舌现实主义者',
        personality: '犀利直接，说话不留情面',
        description:
          '一位以犀利著称的评论家，不相信委婉，只相信事实。在辩论中用最直接的语言给出最现实的建议，擅长揭示选择背后的真实代价和风险。',
        signature: '现实就是这样残酷，接受它才能改变它。',
      },
      create: {
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
    }),
    prisma.agent.upsert({
      where: { id: 'bot_B' },
      update: {
        name: '温柔共情者',
        personality: '温暖理解，充满同理心',
        description:
          '一位懂大学生心理的情感支持者，总是能理解每个人内心的需求和痛点。在辩论中更看重人性和情感，擅长从心理健康和价值观角度分析问题。',
        signature: '每个选择背后，都有深层的原因值得被理解。',
      },
      create: {
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
    }),
    prisma.agent.upsert({
      where: { id: 'bot_C' },
      update: {
        name: '中立观察者',
        personality: '客观公正，平和清晰',
        description:
          '一位冷静客观的学生事务顾问，擅长在两种声音之间找到平衡点。不站队、不说教，只帮你看清问题的全貌，给出真正可操作的建议。',
        signature: '看清全貌，才能做出真正属于你的选择。',
      },
      create: {
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
    }),
  ]);

  console.log(
    '✅ Agent 创建成功:',
    agents.map((a) => a.name),
  );

  // 创建测试用户
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'testuser',
      password: 'hashed_password_here',
      bio: '这是一个测试用户',
      role: 'USER',
    },
  });

  console.log('✅ 测试用户创建成功:', testUser.email);

  // 创建几个示例案件
  const sampleRooms = await Promise.all([
    prisma.room.create({
      data: {
        title: '应该先买房还是先结婚？',
        content:
          '现在房价这么高，作为年轻人，我在纠结是应该先存钱买房，还是先找到合适的人结婚。两者似乎无法兼得，但我又不想放弃任何一个。想听听大家的建议。',
        image:
          'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=500&h=300&fit=crop',
        status: 'LIVE',
        ownerId: testUser.id,
        agents: JSON.stringify(['bot_A', 'bot_B', 'bot_C']),
        viewCount: 1250,
        commentCount: 89,
      },
    }),
    prisma.room.create({
      data: {
        title: '跳槽还是稳定？职业发展的十字路口',
        content:
          '在现在的公司已经待了 3 年，最近有一个大厂的机会向我招手。高薪、大平台、但要放弃现有的舒适区。现在很迷茫，不知道是该稳定还是该冒险。',
        image:
          'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop',
        status: 'LIVE',
        ownerId: testUser.id,
        agents: JSON.stringify(['bot_A', 'bot_C']),
        viewCount: 892,
        commentCount: 56,
      },
    }),
    prisma.room.create({
      data: {
        title: '年迈父母想住在一起，但我独立生活已久',
        content:
          '爸妈年纪大了，想让我和他们住在一起。但我已经习惯了独立生活，有自己的节奏和隐私。这个决定困扰了我很久，既不想让他们失望，也不想牺牲自己的生活质量。',
        image:
          'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=500&h=300&fit=crop',
        status: 'LIVE',
        ownerId: testUser.id,
        agents: JSON.stringify(['bot_B', 'bot_C']),
        viewCount: 765,
        commentCount: 124,
      },
    }),
    prisma.room.create({
      data: {
        title: '值不值得为爱好放弃高薪工作？',
        content:
          '我现在做着高薪工作但没有激情，而我真正热爱的事情是写作和设计。我在考虑是否应该辞职去追求自己的梦想。但现实中有各种压力和风险。',
        image:
          'https://images.unsplash.com/photo-1520881427-8ab617e06d8f?w=500&h=300&fit=crop',
        status: 'CLOSED',
        ownerId: testUser.id,
        agents: JSON.stringify(['bot_A', 'bot_B']),
        viewCount: 2150,
        commentCount: 178,
      },
    }),
  ]);

  console.log('✅ 示例案件创建成功:', sampleRooms.length, '个案件');

  // 创建示例投票数据
  const votes = await Promise.all([
    prisma.vote.create({
      data: {
        userId: testUser.id,
        roomId: sampleRooms[0].id,
        agentId: 'bot_A',
      },
    }),
    prisma.vote.create({
      data: {
        userId: testUser.id,
        roomId: sampleRooms[1].id,
        agentId: 'bot_C',
      },
    }),
  ]);

  console.log('✅ 投票数据创建成功:', votes.length, '条投票');

  // 创建初始话题标签
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { name: '学业压力' },
      update: {},
      create: { name: '学业压力', color: '#6366F1', weight: 10 },
    }),
    prisma.tag.upsert({
      where: { name: '感情困惑' },
      update: {},
      create: { name: '感情困惑', color: '#EC4899', weight: 10 },
    }),
    prisma.tag.upsert({
      where: { name: '职业规划' },
      update: {},
      create: { name: '职业规划', color: '#F97316', weight: 9 },
    }),
    prisma.tag.upsert({
      where: { name: '家庭矛盾' },
      update: {},
      create: { name: '家庭矛盾', color: '#8B5CF6', weight: 8 },
    }),
    prisma.tag.upsert({
      where: { name: '人际关系' },
      update: {},
      create: { name: '人际关系', color: '#10B981', weight: 8 },
    }),
    prisma.tag.upsert({
      where: { name: '消费决策' },
      update: {},
      create: { name: '消费决策', color: '#EAB308', weight: 7 },
    }),
    prisma.tag.upsert({
      where: { name: '法律权益' },
      update: {},
      create: { name: '法律权益', color: '#3B82F6', weight: 7 },
    }),
    prisma.tag.upsert({
      where: { name: '心理健康' },
      update: {},
      create: { name: '心理健康', color: '#14B8A6', weight: 9 },
    }),
    prisma.tag.upsert({
      where: { name: '就业求职' },
      update: {},
      create: { name: '就业求职', color: '#F43F5E', weight: 8 },
    }),
    prisma.tag.upsert({
      where: { name: '留学出国' },
      update: {},
      create: { name: '留学出国', color: '#0EA5E9', weight: 6 },
    }),
  ]);

  console.log('✅ 话题标签创建成功:', tags.map((t) => t.name).join(' / '));

  console.log('\n✨ 数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
