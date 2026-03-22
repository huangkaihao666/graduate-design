export type VirtualTryOnSubjectRole = 'female' | 'male' | 'couple';

export const VTO_SUBJECT_OPTIONS: {
  value: VirtualTryOnSubjectRole;
  label: string;
  short: string;
  desc: string;
}[] = [
  {
    value: 'female',
    label: '女生（新娘）',
    short: '女生',
    desc: '单人出镜，生成新娘/女性婚纱造型效果',
  },
  {
    value: 'male',
    label: '男生（新郎）',
    short: '男生',
    desc: '单人出镜，生成新郎/男性西装或婚礼男装效果',
  },
  {
    value: 'couple',
    label: '双人合影',
    short: '双人',
    desc: '新郎新娘同框，建议上传双人合照；单人照将尽量生成双人构图',
  },
];

export const VTO_SUBJECT_LABELS: Record<VirtualTryOnSubjectRole, string> = {
  female: '女生（新娘）',
  male: '男生（新郎）',
  couple: '双人合影',
};
