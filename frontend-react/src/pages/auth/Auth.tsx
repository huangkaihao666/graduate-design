import * as authApi from "@/api/auth";
import { useAuthStore } from "@/store";
import {
  ArrowRightOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  MailOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { TabsProps } from "antd";
import { Button, Form, Input, message, Tabs, Typography } from "antd";
import React, { useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./Auth.less";

const { Title, Text } = Typography;

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// 三个 Agent 角色信息
const AGENTS = [
  {
    id: "A",
    name: "直言现实者",
    emoji: "⚡",
    color: "#F97316",
    bg: "rgba(249,115,22,0.15)",
    desc: "逻辑解构，直击要害",
    tags: ["博弈论", "谬误识别", "社会学"],
  },
  {
    id: "B",
    name: "共情辅导师",
    emoji: "💚",
    color: "#10B981",
    bg: "rgba(16,185,129,0.15)",
    desc: "情感支持，疗愈成长",
    tags: ["心理学", "非暴力沟通", "NLP"],
  },
  {
    id: "C",
    name: "理性律师",
    emoji: "⚖️",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.15)",
    desc: "法律分析，客观事实",
    tags: ["民法", "劳动法", "合同法"],
  },
];

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  // 登录和注册使用独立 loading，互不干扰
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [loginForm] = Form.useForm<LoginFormData>();
  const [registerForm] = Form.useForm<RegisterFormData>();

  // 切换 Tab 时重置双方 loading，防止残留
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setLoginLoading(false);
    setRegisterLoading(false);
  };

  // 处理登录
  const handleLogin = async (values: LoginFormData) => {
    setLoginLoading(true);
    try {
      const response = await authApi.login({
        email: values.email,
        password: values.password,
      });
      const loginData = response as any;
      flushSync(() => {
        login({
          user: loginData.user,
          accessToken: loginData.accessToken,
          refreshToken: loginData.refreshToken,
        });
      });
      message.success("登录成功，智辩助手就绪！");
      navigate("/cases", { replace: true });
    } catch {
      message.error("邮箱或密码错误，请重新输入");
    } finally {
      setLoginLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async (values: RegisterFormData) => {
    // 注意：密码一致性校验已移至 Form rules，这里保留兜底
    if (values.password !== values.confirmPassword) {
      message.error("两次输入的密码不一致");
      return; // 此处直接 return，不进入 try/finally，loading 无需置位
    }
    setRegisterLoading(true);
    try {
      await authApi.register({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      // 注册成功后切换到登录 Tab，并预填邮箱
      registerForm.resetFields();
      handleTabChange("login");
      loginForm.setFieldValue("email", values.email);
      message.success({
        content: "🎉 注册成功！请使用您的邮箱和密码登录",
        duration: 4,
      });
    } catch {
      message.error("注册失败，请检查输入内容后重试");
    } finally {
      setRegisterLoading(false);
    }
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return "密码至少需要 8 个字符";
    if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      return "密码需包含大小写字母和数字";
    }
    return "";
  };

  const tabItems: TabsProps["items"] = [
    {
      key: "login",
      label: "登录",
      children: (
        <Form
          form={loginForm}
          onFinish={handleLogin}
          layout="vertical"
          autoComplete="off"
          className="auth-form"
          size="large"
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "请输入有效的邮箱地址" },
            ]}
          >
            <Input
              prefix={<MailOutlined className="input-icon" />}
              placeholder="请输入您的邮箱地址"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="input-icon" />}
              placeholder="请输入密码"
              iconRender={(visible) =>
                visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loginLoading}
              block
              className="auth-submit-btn"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: "register",
      label: "注册",
      children: (
        <Form
          form={registerForm}
          onFinish={handleRegister}
          layout="vertical"
          autoComplete="off"
          className="auth-form"
          size="large"
        >
          <Form.Item
            name="name"
            label="用户名"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 2, message: "用户名至少 2 个字符" },
            ]}
          >
            <Input
              prefix={<UserOutlined className="input-icon" />}
              placeholder="请输入用户名"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "请输入有效的邮箱地址" },
            ]}
          >
            <Input
              prefix={<MailOutlined className="input-icon" />}
              placeholder="请输入您的邮箱地址"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            tooltip="密码需至少 8 位，包含大小写字母和数字"
            rules={[
              { required: true, message: "请输入密码" },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const err = validatePassword(value);
                  return err
                    ? Promise.reject(new Error(err))
                    : Promise.resolve();
                },
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="input-icon" />}
              placeholder="至少 8 位，含大小写字母和数字"
              iconRender={(visible) =>
                visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={["password"]}
            rules={[
              { required: true, message: "请确认密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value)
                    return Promise.resolve();
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
            style={{ marginBottom: 0 }}
          >
            <Input.Password
              prefix={<LockOutlined className="input-icon" />}
              placeholder="请再次输入密码"
              iconRender={(visible) =>
                visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={registerLoading}
              block
              className="auth-submit-btn"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
            >
              创建账号
            </Button>
          </Form.Item>

          <Text type="secondary" className="auth-terms">
            注册即表示同意平台服务条款与隐私政策
          </Text>
        </Form>
      ),
    },
  ];

  return (
    <div className="auth-page">
      {/* 背景图层 */}
      <div className="auth-bg-image" />
      {/* 深色叠加层 */}
      <div className="auth-bg-overlay" />
      {/* 动态光效 */}
      <div className="auth-bg-orbs">
        <div className="auth-orb orb-1" />
        <div className="auth-orb orb-2" />
        <div className="auth-orb orb-3" />
      </div>
      {/* 网格线 */}
      <div className="auth-bg-grid" />
      {/* 扫描光束 */}
      <div className="auth-bg-scan" />

      <div className="auth-wrapper">
        {/* ── 左侧：品牌展示区 ── */}
        <div className="auth-brand">
          {/* Logo */}
          <div className="brand-logo-wrap">
            <div className="brand-logo">
              <span className="brand-logo-icon">⚖️</span>
            </div>
            <div>
              <Title level={2} className="brand-title">
                智辩助手
              </Title>
              <Text className="brand-tagline">多智能体协同 × RAG 知识增强</Text>
            </div>
          </div>

          {/* 平台简介 */}
          <p className="brand-desc">
            基于 <strong>RAG</strong> 知识增强与<strong>多智能体协同</strong>，<br />
            从逻辑、情感、法律三维视角出发，<br />
            助你理性分析生活中的两难决策。
          </p>

          {/* Agent 展示卡片 */}
          <div className="brand-agents">
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="agent-preview-card"
                style={
                  {
                    "--agent-color": agent.color,
                    "--agent-bg": agent.bg,
                  } as React.CSSProperties
                }
              >
                <div className="agent-preview-emoji">{agent.emoji}</div>
                <div className="agent-preview-info">
                  <div className="agent-preview-name">{agent.name}</div>
                  <div className="agent-preview-desc">{agent.desc}</div>
                  <div className="agent-preview-tags">
                    {agent.tags.map((tag) => (
                      <span key={tag} className="agent-preview-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 底部数据 */}
          <div className="brand-stats">
            <div className="brand-stat">
              <span className="brand-stat-num">3</span>
              <span className="brand-stat-label">AI 智能体</span>
            </div>
            <div className="brand-stat-divider" />
            <div className="brand-stat">
              <span className="brand-stat-num">RAG</span>
              <span className="brand-stat-label">知识增强</span>
            </div>
            <div className="brand-stat-divider" />
            <div className="brand-stat">
              <span className="brand-stat-num">实时</span>
              <span className="brand-stat-label">流式辩论</span>
            </div>
          </div>
        </div>

        {/* ── 右侧：表单区 ── */}
        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="auth-card-header">
              <Title level={3} className="auth-card-title">
                {activeTab === "login" ? "开始辩论之旅 ⚡" : "加入决策社区 🚀"}
              </Title>
              <Text type="secondary" className="auth-card-subtitle">
                {activeTab === "login"
                  ? "三位 AI 专家随时待命，等你发起提问"
                  : "免费注册，让 AI 帮你看清两难困境"}
              </Text>
            </div>

            <Tabs
              items={tabItems}
              activeKey={activeTab}
              onChange={handleTabChange}
              className="auth-tabs"
              centered
            />
          </div>

          <div className="auth-footer">
            © 2026 智辩助手 · 基于多智能体协同与 RAG 架构
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
