import React, { useState } from 'react'
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
  Spin,
} from 'antd'
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  GlobalOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SendOutlined,
  SyncOutlined,
  ToolOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/customAgents'
import type { CustomAgent, KnowledgeBase, CozeDocument } from '@/api/customAgents'
import './CreateAgent.less'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Option } = Select

const DOMAIN_OPTIONS = [
  '职场', '感情', '学业', '消费', '家庭', '法律',
  '心理', '健康', '创业', '理财', '技术', '艺术',
]

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  PRIVATE:  { color: 'default', label: '私有' },
  PENDING:  { color: 'gold',    label: '审核中' },
  APPROVED: { color: 'green',   label: '已公开' },
  REJECTED: { color: 'red',     label: '审核拒绝' },
}

const DOC_STATUS_MAP: Record<number, { color: string; label: string }> = {
  0: { color: 'processing', label: '处理中' },
  1: { color: 'success',    label: '已就绪' },
  2: { color: 'error',      label: '处理失败' },
}

export const CreateAgent: React.FC = () => {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [kbForm] = Form.useForm()

  const [editingAgent, setEditingAgent] = useState<CustomAgent | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [kbModalOpen, setKbModalOpen] = useState(false)
  const [activeKbId, setActiveKbId] = useState<number | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [syncingKbId, setSyncingKbId] = useState<number | null>(null)
  const [cozeDocs, setCozeDocs] = useState<CozeDocument[]>([])
  const [cozeDocsOpen, setCozeDocsOpen] = useState(false)

  // ─── Queries ────────────────────────────────────────────────

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['my-agents'],
    queryFn: api.getMyAgents,
  })

  const { data: kbList = [], isLoading: kbLoading } = useQuery({
    queryKey: ['my-knowledge-bases'],
    queryFn: api.getMyKnowledgeBases,
  })

  const { data: workspaces = [] } = useQuery({
    queryKey: ['coze-workspaces'],
    queryFn: api.getWorkspaces,
    staleTime: 5 * 60 * 1000,
  })

  const activeKb = kbList.find((k) => k.id === activeKbId) || null

  // ─── Mutations ───────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: api.createAgent,
    onSuccess: () => {
      message.success('智能体创建成功！已在 Coze 平台发布')
      queryClient.invalidateQueries({ queryKey: ['my-agents'] })
      setModalOpen(false)
      form.resetFields()
      setIsPublic(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateAgent(id, data),
    onSuccess: () => {
      message.success('智能体更新成功！')
      queryClient.invalidateQueries({ queryKey: ['my-agents'] })
      setModalOpen(false)
      setEditingAgent(null)
      form.resetFields()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteAgent,
    onSuccess: () => {
      message.success('智能体已删除')
      queryClient.invalidateQueries({ queryKey: ['my-agents'] })
    },
  })

  const publishMutation = useMutation({
    mutationFn: api.publishAgent,
    onSuccess: () => {
      message.success('已提交审核，等待管理员审核')
      queryClient.invalidateQueries({ queryKey: ['my-agents'] })
    },
  })

  const cozePublishMutation = useMutation({
    mutationFn: api.cozePublishBot,
    onSuccess: (res) => {
      message.success(res.message || 'Bot 已重新发布到 Coze API 渠道')
    },
    onError: () => {
      message.error('Coze 发布失败，请检查 Bot 是否存在')
    },
  })

  const createKbMutation = useMutation({
    mutationFn: api.createKnowledgeBase,
    onSuccess: (kb) => {
      message.success('知识库创建成功！')
      queryClient.invalidateQueries({ queryKey: ['my-knowledge-bases'] })
      setKbModalOpen(false)
      kbForm.resetFields()
      setActiveKbId(kb.id)
    },
  })

  const uploadMutation = useMutation({
    mutationFn: ({ kbId, file }: { kbId: number; file: File }) =>
      api.uploadDocument(kbId, file),
    onSuccess: () => {
      message.success('文档已提交，等待管理员审核后将自动同步到知识库')
      queryClient.invalidateQueries({ queryKey: ['my-knowledge-bases'] })
      setPendingFile(null)
    },
    onError: () => {
      message.error('文档上传失败，请重试')
    },
  })

  const deleteDocMutation = useMutation({
    mutationFn: ({ kbId, docId }: { kbId: number; docId: number }) =>
      api.deleteDocument(kbId, docId),
    onSuccess: () => {
      message.success('文档已删除')
      queryClient.invalidateQueries({ queryKey: ['my-knowledge-bases'] })
    },
  })

  const bindKbMutation = useMutation({
    mutationFn: ({ agentId, kbId }: { agentId: string; kbId: number }) =>
      api.bindKnowledgeBase(agentId, kbId),
    onSuccess: () => {
      message.success('知识库已绑定并同步到智能体')
      queryClient.invalidateQueries({ queryKey: ['my-agents'] })
    },
  })

  const unbindKbMutation = useMutation({
    mutationFn: api.unbindKnowledgeBase,
    onSuccess: () => {
      message.success('知识库已解绑')
      queryClient.invalidateQueries({ queryKey: ['my-agents'] })
    },
  })

  const deleteKbMutation = useMutation({
    mutationFn: (kbId: number) => api.deleteKnowledgeBase(kbId),
    onSuccess: () => {
      message.success('知识库已删除，绑定该知识库的智能体已自动解绑')
      queryClient.invalidateQueries({ queryKey: ['my-knowledge-bases'] })
      queryClient.invalidateQueries({ queryKey: ['my-agents'] })
      setActiveKbId(null)
    },
    onError: () => {
      message.error('删除失败，请重试')
    },
  })

  // ─── Handlers ───────────────────────────────────────────────

  const openCreate = () => {
    setEditingAgent(null)
    form.resetFields()
    setIsPublic(false)
    setModalOpen(true)
  }

  const openEdit = (agent: CustomAgent) => {
    setEditingAgent(agent)
    form.setFieldsValue({
      name: agent.name,
      personality: agent.personality,
      description: agent.description,
      prompt: agent.prompt,
      domains: agent.domainsArr || [],
    })
    setIsPublic(agent.isPublic)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const payload = {
      ...values,
      domains: Array.isArray(values.domains) ? values.domains.join(',') : '',
      isPublic,
    }
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleUpload = async () => {
    if (!activeKbId || !pendingFile) return
    uploadMutation.mutate({ kbId: activeKbId, file: pendingFile })
  }

  const handleSyncCoze = async (kb: KnowledgeBase) => {
    setSyncingKbId(kb.id)
    setCozeDocs([])
    try {
      const docs = await api.syncCozeDocuments(kb.id)
      setCozeDocs(docs)
      setCozeDocsOpen(true)
    } catch {
      message.error('同步失败，请检查网络或 API Key')
    } finally {
      setSyncingKbId(null)
    }
  }

  const personalSpace = workspaces.find((w) => w.workspace_type === 'personal')
  const hasWorkspace = workspaces.length > 0

  return (
    <div className="create-agent-page">
      {/* ── Hero ── */}
      <div className="agent-hero">
        <div className="hero-bg-orb orb-1" />
        <div className="hero-bg-orb orb-2" />
        <div className="hero-content">
          <h1 className="hero-title">创建智能体</h1>
          <p className="hero-sub">
            自定义 AI 人设与知识库，打造专属辩论专家，参与你的每一场决策
          </p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          className="hero-create-btn"
          onClick={openCreate}
        >
          创建新智能体
        </Button>
      </div>

      {/* ── 工作空间状态提示 ── */}
      {workspaces.length > 0 && (
        <div className="workspace-bar">
          <CheckCircleOutlined className="workspace-ok-icon" />
          <span>
            已连接 Coze 工作空间：
            <strong>{personalSpace?.name || workspaces[0]?.name}</strong>
            （{workspaces.length} 个可用）
          </span>
          <div className="workspace-chips">
            {workspaces.slice(0, 3).map((w) => (
              <Tag key={w.id} className={`ws-chip ${w.workspace_type === 'personal' ? 'ws-chip-personal' : ''}`}>
                {w.workspace_type === 'personal' ? '👤' : '👥'} {w.name}
              </Tag>
            ))}
          </div>
        </div>
      )}

      <Row gutter={[24, 24]} className="page-body">
        {/* ── 左侧：我的智能体 ── */}
        <Col xs={24} lg={14}>
          <Card
            className="section-card"
            title={
              <Space>
                <RobotOutlined />
                <span>我的智能体</span>
                <Tag color="blue">{agents.length}</Tag>
              </Space>
            }
            loading={agentsLoading}
          >
            {agents.length === 0 ? (
              <Empty
                image={<div className="empty-bot-icon">🤖</div>}
                description={
                  <div className="empty-desc">
                    <div>还没有自建智能体</div>
                    <Text type="secondary">创建你的第一个专属 AI，参与辩论决策</Text>
                  </div>
                }
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  立即创建
                </Button>
              </Empty>
            ) : (
              <div className="agents-list">
                {agents.map((agent) => {
                  const statusInfo = STATUS_MAP[agent.status] || STATUS_MAP.PRIVATE
                  const boundKb = kbList.find((k) => k.id === agent.knowledgeBaseId)
                  return (
                    <div key={agent.id} className="agent-item">
                      <div className="agent-item-left">
                        <Avatar size={48} src={agent.avatar} className="agent-avatar">
                          {!agent.avatar ? agent.name[0] : ''}
                        </Avatar>
                        <div className="agent-info">
                          {/* 第一行：名字 + 状态 */}
                          <div className="agent-name-row">
                            <span className="agent-name">{agent.name}</span>
                            <Tag color={statusInfo.color} className="status-tag">
                              {agent.isPublic ? <GlobalOutlined /> : <LockOutlined />}{' '}
                              {statusInfo.label}
                            </Tag>
                          </div>
                          {/* 第二行：性格描述 */}
                          {agent.personality && (
                            <Text type="secondary" className="agent-personality">
                              <span className="agent-field-label">性格：</span>{agent.personality}
                            </Text>
                          )}
                          {/* 第三行：领域标签 + 知识库绑定 + Bot ID */}
                          <div className="agent-meta-row">
                            {agent.domainsArr && agent.domainsArr.length > 0 && (
                              <div className="agent-domains">
                                <span className="agent-field-label">领域：</span>
                                {agent.domainsArr.slice(0, 3).map((d) => (
                                  <Tag key={d} className="domain-tag">{d}</Tag>
                                ))}
                              </div>
                            )}
                            {boundKb ? (
                              <div className="kb-bound-badge">
                                <CheckCircleOutlined />
                                <span>已绑定：{boundKb.name}</span>
                                <Popconfirm
                                  title="解绑知识库？"
                                  onConfirm={() => unbindKbMutation.mutate(agent.id)}
                                  okText="解绑"
                                  okButtonProps={{ danger: true }}
                                >
                                  <Button type="link" size="small" danger style={{ padding: '0 4px' }}>
                                    解绑
                                  </Button>
                                </Popconfirm>
                              </div>
                            ) : (
                              <div className="kb-unbound-badge">
                                <ExclamationCircleOutlined />
                                <span>未绑定知识库</span>
                              </div>
                            )}
                            <div className="agent-coze-id" style={{ marginTop: 0 }}>
                              Bot ID: <code>{agent.id}</code>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="agent-item-actions">
                        <Tooltip title="编辑">
                          <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(agent)} />
                        </Tooltip>
                        <Tooltip title="重新发布到 Coze API">
                          <Button
                            type="text"
                            icon={<CloudUploadOutlined />}
                            size="small"
                            loading={cozePublishMutation.isPending}
                            onClick={() => cozePublishMutation.mutate(agent.id)}
                          />
                        </Tooltip>
                        {agent.status === 'PRIVATE' && (
                          <Tooltip title="申请公开">
                            <Button
                              type="text"
                              icon={<GlobalOutlined />}
                              size="small"
                              onClick={() => publishMutation.mutate(agent.id)}
                              loading={publishMutation.isPending}
                            />
                          </Tooltip>
                        )}
                        <Popconfirm
                          title="确认删除此智能体？"
                          description="删除后无法恢复，已参与的辩论记录不受影响。"
                          onConfirm={() => deleteMutation.mutate(agent.id)}
                          okText="删除"
                          okButtonProps={{ danger: true }}
                          cancelText="取消"
                        >
                          <Button type="text" icon={<DeleteOutlined />} size="small" danger />
                        </Popconfirm>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* ── 右侧：知识库管理 ── */}
        <Col xs={24} lg={10}>
          <Card
            className="section-card kb-card"
            title={
              <Space>
                <FileTextOutlined />
                <span>私有知识库</span>
              </Space>
            }
            extra={
              <Button size="small" icon={<PlusOutlined />} onClick={() => setKbModalOpen(true)}>
                新建
              </Button>
            }
            loading={kbLoading}
          >
            {kbList.length === 0 ? (
              <Empty
                description={
                  <div>
                    <div>暂无知识库</div>
                    <Text type="secondary">上传 PDF/TXT 文档，让智能体掌握专业知识</Text>
                  </div>
                }
              />
            ) : (
              <div className="kb-list">
                {kbList.map((kb) => (
                  <div
                    key={kb.id}
                    className={`kb-item ${activeKbId === kb.id ? 'kb-item-active' : ''}`}
                    onClick={() => setActiveKbId(kb.id)}
                  >
                    <div className="kb-item-head">
                      <div className="kb-name">{kb.name}</div>
                      <Space size={4}>
                        <Tag>{kb.documents.length} 文档</Tag>
                        <Tooltip title="同步文档状态">
                          <Button
                            type="text"
                            size="small"
                            icon={syncingKbId === kb.id ? <SyncOutlined spin /> : <ReloadOutlined />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSyncCoze(kb)
                            }}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="删除知识库"
                          description="删除后绑定该知识库的智能体将自动解绑，且无法恢复。确认删除？"
                          onConfirm={(e) => {
                            e?.stopPropagation()
                            deleteKbMutation.mutate(kb.id)
                          }}
                          onCancel={(e) => e?.stopPropagation()}
                          okText="删除"
                          okButtonProps={{ danger: true }}
                          cancelText="取消"
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={deleteKbMutation.isPending}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </Space>
                    </div>
                    {kb.description && (
                      <Text type="secondary" className="kb-desc">{kb.description}</Text>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 选中知识库的文档管理 */}
            {activeKb && (
              <>
                <Divider className="kb-divider" />
                <div className="kb-docs-section">
                  <div className="kb-docs-header">
                    <Text strong>{activeKb.name}</Text>
                    {/* 用原生 input 直接拿 File，100% 真实对象 */}
                    <label className="file-input-label">
                      <UploadOutlined />
                      <span>选择文件</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 20 * 1024 * 1024) {
                            message.error('文件大小不能超过 20MB')
                            return
                          }
                          setPendingFile(file)
                          // 清空 input value，允许重复选同一文件
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>

                  {pendingFile && (
                    <div className="upload-preview">
                      <FileTextOutlined />
                      <Text className="upload-filename">{pendingFile.name}</Text>
                      <Button
                        type="primary"
                        size="small"
                        icon={<SendOutlined />}
                        loading={uploadMutation.isPending}
                        onClick={handleUpload}
                      >
                        上传
                      </Button>
                      <Button size="small" onClick={() => setPendingFile(null)}>取消</Button>
                    </div>
                  )}

                  {uploadMutation.isPending && (
                    <Progress percent={99} status="active" size="small" showInfo={false} />
                  )}

                  <div className="docs-list">
                    {activeKb.documents.length === 0 ? (
                      <Text type="secondary" className="docs-empty">
                        暂无文档，上传 PDF/TXT 让智能体学习专业知识
                      </Text>
                    ) : (
                      activeKb.documents.map((doc) => (
                        <div key={doc.id} className="doc-item">
                          <FileTextOutlined className="doc-icon" />
                          <div className="doc-info">
                            <div className="doc-name">{doc.filename}</div>
                            <Space size={6}>
                              <Text type="secondary" className="doc-size">
                                {(doc.size / 1024).toFixed(1)} KB
                              </Text>
                              <Tag
                                color={
                                  doc.status === 'APPROVED' ? 'green' :
                                  doc.status === 'REJECTED' ? 'red' : 'gold'
                                }
                                style={{ borderRadius: 4, fontSize: 11 }}
                              >
                                {doc.status === 'APPROVED' ? '已通过' :
                                 doc.status === 'REJECTED' ? '已拒绝' : '审核中'}
                              </Tag>
                            </Space>
                          </div>
                          <Popconfirm
                            title="删除此文档？"
                            onConfirm={() =>
                              deleteDocMutation.mutate({ kbId: activeKb.id, docId: doc.id })
                            }
                            okText="删除"
                            okButtonProps={{ danger: true }}
                          >
                            <Button type="text" icon={<DeleteOutlined />} size="small" danger />
                          </Popconfirm>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 绑定到智能体 */}
                  {agents.length > 0 && (
                    <div className="bind-section">
                      <Text type="secondary">绑定到智能体：</Text>
                      <Select
                        placeholder="选择智能体"
                        size="small"
                        style={{ flex: 1 }}
                        loading={bindKbMutation.isPending}
                        onChange={(agentId: string) =>
                          bindKbMutation.mutate({ agentId, kbId: activeKb.id })
                        }
                      >
                        {agents.map((a) => (
                          <Option key={a.id} value={a.id}>
                            {a.name}
                            {a.knowledgeBaseId === activeKb.id && ' ✓ 已绑定'}
                          </Option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── 创建/编辑智能体 Modal ── */}
      <Modal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditingAgent(null)
          form.resetFields()
        }}
        title={
          <div className="modal-title">
            <RobotOutlined />
            <span>{editingAgent ? '编辑智能体' : '创建新智能体'}</span>
          </div>
        }
        footer={null}
        width={680}
        destroyOnClose
        className="agent-modal"
      >
        {!hasWorkspace && (
          <Alert
            type="warning"
            showIcon
            message="未检测到 Coze 工作空间"
            description="请在后端 .env 中设置 COZE_SPACE_ID，或确认 COZE_API_KEY 有效。"
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} layout="vertical" className="agent-form">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="智能体名称"
                rules={[
                  { required: true, message: '请输入名称' },
                  { max: 50, message: '最多50字' },
                ]}
              >
                <Input placeholder="例：理性派律师、感性派心理师" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="personality"
                label="性格特点"
                rules={[{ max: 50, message: '最多50字' }]}
              >
                <Input placeholder="例：冷静理性、擅长逻辑" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="人设简介"
            rules={[{ max: 500, message: '最多500字' }]}
          >
            <TextArea rows={2} placeholder="简要描述这个智能体的背景和专长" showCount maxLength={500} />
          </Form.Item>

          <Form.Item
            name="prompt"
            label={
              <Space>
                <span>System Prompt</span>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                  定义智能体的思维方式和辩论风格
                </Text>
              </Space>
            }
            rules={[
              { required: true, message: '请填写 System Prompt' },
              { max: 4000, message: '最多4000字' },
            ]}
          >
            <TextArea
              rows={6}
              placeholder={`你是一位擅长从法律角度分析问题的顾问。\n\n在辩论中，你总是：\n1. 引用具体法条或判例支持观点\n2. 用严谨的逻辑推理反驳对方\n3. 保持客观中立，不偏向任何一方`}
              showCount
              maxLength={4000}
              className="prompt-textarea"
            />
          </Form.Item>

          <Form.Item name="domains" label="擅长领域">
            <Select
              mode="multiple"
              placeholder="选择擅长领域（最多5个）"
              maxTagCount={5}
              options={DOMAIN_OPTIONS.map((d) => ({ value: d, label: d }))}
            />
          </Form.Item>

          <div className="visibility-section">
            <div className="visibility-row">
              <div>
                <div className="visibility-label">
                  {isPublic ? <GlobalOutlined /> : <LockOutlined />}{' '}
                  {isPublic ? '申请公开' : '仅自己使用'}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {isPublic
                    ? '提交审核后，审核通过的智能体会出现在 AI 图鉴，所有用户均可在 AI 共情师中选择使用'
                    : '仅自己可在 AI 共情师中选择此智能体作为辅导师'}
                </Text>
              </div>
              <Switch checked={isPublic} onChange={setIsPublic} />
            </div>
            {isPublic && (
              <div className="visibility-tip">
                提交后将进入审核队列，管理员审核通过后公开展示。审核期间智能体仍可正常使用。
              </div>
            )}
          </div>

          <div className="form-footer">
            <Button onClick={() => { setModalOpen(false); setEditingAgent(null); form.resetFields() }}>
              取消
            </Button>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
            >
              {editingAgent ? '保存修改' : '创建并发布到 Coze'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── 创建知识库 Modal ── */}
      <Modal
        open={kbModalOpen}
        onCancel={() => { setKbModalOpen(false); kbForm.resetFields() }}
        title="新建知识库"
        footer={null}
        width={480}
        destroyOnClose
      >
        <Form form={kbForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="知识库名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="例：职场法律知识库、心理学理论库" />
          </Form.Item>
          <Form.Item name="description" label="描述（可选）">
            <TextArea rows={2} placeholder="简要说明这个知识库的内容" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setKbModalOpen(false)}>取消</Button>
            <Button
              type="primary"
              loading={createKbMutation.isPending}
              onClick={async () => {
                const values = await kbForm.validateFields()
                createKbMutation.mutate(values)
              }}
            >
              创建知识库
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Coze 文档同步 Modal ── */}
      <Modal
        open={cozeDocsOpen}
        onCancel={() => setCozeDocsOpen(false)}
        title={
          <Space>
            <SyncOutlined />
            <span>Coze 平台文档状态</span>
          </Space>
        }
        footer={<Button onClick={() => setCozeDocsOpen(false)}>关闭</Button>}
        width={560}
      >
        {cozeDocs.length === 0 ? (
          <Empty description="Coze 平台暂无文档记录" />
        ) : (
          <div className="coze-docs-list">
            {cozeDocs.map((doc) => {
              const statusInfo = DOC_STATUS_MAP[doc.status] || { color: 'default', label: '未知' }
              return (
                <div key={doc.document_id} className="coze-doc-item">
                  <FileTextOutlined className="doc-icon" />
                  <div className="doc-info">
                    <div className="doc-name">{doc.name}</div>
                    <Text type="secondary" className="doc-size">
                      {(doc.size / 1024).toFixed(1)} KB · {doc.type.toUpperCase()}
                    </Text>
                  </div>
                  <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
                </div>
              )
            })}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CreateAgent
