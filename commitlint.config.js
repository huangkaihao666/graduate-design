export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',      // 新功能
        'fix',       // 错误修复
        'docs',      // 文档更新
        'style',     // 代码风格调整（不影响代码功能）
        'refactor',  // 代码重构（不是新增功能也不是修复）
        'perf',      // 性能优化
        'test',      // 测试相关
        'chore',     // 构建、依赖等杂务
        'ci',        // CI/CD 配置
        'revert',    // 回滚提交
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],           // type 必须小写
    'type-empty': [2, 'never'],                         // type 不能为空
    'scope-empty': [0],                                 // scope 可选
    'scope-case': [2, 'always', 'lower-case'],          // scope 必须小写
    'subject-empty': [2, 'never'],                      // subject 不能为空
    'subject-full-stop': [2, 'never', '.'],             // subject 不能以句号结尾
    'subject-case': [0],                                // subject 大小写不做限制
    'header-max-length': [2, 'always', 100],            // header 最大长度 100
    'body-leading-blank': [2, 'always'],                // body 前面必须有空行
    'footer-leading-blank': [2, 'always'],              // footer 前面必须有空行
  },
};
