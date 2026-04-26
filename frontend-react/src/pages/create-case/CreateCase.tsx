import React, { useState } from 'react'
import { Form, Input, Button, message, Upload, Progress, Modal, Tag } from 'antd'
import {
  InboxOutlined,
  CheckCircleOutlined,
  TagOutlined,
  EditOutlined,
  FileTextOutlined,
  TeamOutlined,
  PictureOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UploadFile, RcFile } from 'antd/es/upload/interface'
import { AgentSelector } from '@/components/AgentSelector'
import * as roomApi from '@/api/rooms'
import * as tagsApi from '@/api/tags'
import './CreateCase.less'

const { TextArea } = Input
const { Dragger } = Upload

const AGENTS_PREVIEW = [
  { emoji: '⚡', name: '直言现实者', desc: '博弈论 · 谬误识别', cls: 'agent-a' },
  { emoji: '💚', name: '共情辅导师', desc: '心理学 · NVC', cls: 'agent-b' },
  { emoji: '⚖️', name: '理性律师', desc: '民法 · 劳动法', cls: 'agent-c' },
]

const TIPS = [
  '标题应简洁概括核心困境，让 AI 快速理解场景',
  '内容越详细，AI 分析越精准，建议描述背景、矛盾点和你的顾虑',
  '选择与话题相关的标签，有助于其他用户发现你的案件',
  '封面图片可选，上传后会展示在案件列表卡片中',
]

const CreateCase: React.FC = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [imageFile, setImageFile] = useState<UploadFile | null>(null)
  const [previewImage, setPreviewImage] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [titleLength, setTitleLength] = useState(0)
  const [contentLength, setContentLength] = useState(0)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdRoomId, setCreatedRoomId] = useState<number | null>(null)

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: roomApi.getAllAgents,
    staleTime: Infinity,
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getTags,
    staleTime: 5 * 60 * 1000,
  })
  const tagList = tagsData || []
  const agentList = (agentsData as unknown as any[] | undefined) || []

  const createRoomMutation = useMutation({
    mutationFn: (data: any) => roomApi.createRoom(data),
    onSuccess: (data: any) => {
      setCreatedRoomId(data.id)
      setShowSuccessModal(true)
      form.resetFields()
      setSelectedAgents([])
      setSelectedTagIds([])
      setImageFile(null)
      setPreviewImage('')
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['my-cases'] })
    },
    onError: (error: any) => {
      message.error(error?.message || '创建失败，请重试')
    },
  })

  const handleSubmit = async (values: any) => {
    if (selectedAgents.length !== 3) {
      message.warning('请选择 3 个 AI Agent')
      return
    }
    setUploadProgress(20)
    setTimeout(() => setUploadProgress(50), 300)
    setTimeout(() => setUploadProgress(80), 600)
    try {
      await createRoomMutation.mutateAsync({
        title: values.title,
        content: values.content,
        image: previewImage || undefined,
        agents: selectedAgents,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      })
      setUploadProgress(100)
    } catch {
      setUploadProgress(0)
    }
  }

  const beforeUpload = (file: RcFile) => {
    if (!file.type.startsWith('image/')) {
      message.error('只能上传图片文件！')
      return Upload.LIST_IGNORE
    }
    if (file.size / 1024 / 1024 >= 5) {
      message.error('图片大小不能超过 5MB！')
      return Upload.LIST_IGNORE
    }
    return false
  }

  const handleImageChange = (info: any) => {
    const file = info.file as UploadFile
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setPreviewImage(e.target?.result as string)
    reader.readAsDataURL(file as RcFile)
  }

  return (
    <div className="create-case-page">
      {/* ── 页头 ── */}
      <div className="create-case-header">
        <div className="header-left">
          <h1 className="page-title">发起辩论</h1>
          <p className="page-subtitle">
            描述你的困境，三位 AI 专家将从逻辑、情感、法律多维度为你分析，提供参考意见
          </p>
        </div>
        <div className="header-steps">
          {['填写案件', '选择 Agent', '发布辩论'].map((label, i) => (
            <div key={i} className="header-step">
              <span className="step-num">{i + 1}</span>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 两列主体 ── */}
      <div className="create-case-body">

        {/* 左侧主表单 */}
        <div className="create-case-main">
          <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">

            {/* 分区1：标题 + 内容 */}
            <div className="form-section">
              <div className="form-section-header">
                <div className="section-icon"><EditOutlined style={{ color: '#fff', fontSize: 13 }} /></div>
                <span className="section-title">案件描述</span>
              </div>
              <div className="form-section-body">
                <Form.Item
                  label={
                    <div className="form-label-with-count">
                      <span className="label-text">案件标题</span>
                      <span className="char-count">{titleLength} / 100</span>
                    </div>
                  }
                  name="title"
                  rules={[
                    { required: true, message: '请输入案件标题' },
                    { min: 5, message: '标题至少 5 个字符' },
                    { max: 100, message: '标题不超过 100 个字符' },
                  ]}
                >
                  <Input
                    size="large"
                    placeholder="用一句话描述你的困境..."
                    maxLength={100}
                    onChange={(e) => setTitleLength(e.target.value.length)}
                    className="title-input"
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <div className="form-label-with-count">
                      <span className="label-text">详细描述</span>
                      <span className="char-count">
                        {contentLength} / 1000
                        {contentLength < 50 && contentLength > 0 && (
                          <span className="warning">（至少 50 字）</span>
                        )}
                      </span>
                    </div>
                  }
                  name="content"
                  rules={[
                    { required: true, message: '请输入案件内容' },
                    { min: 50, message: '内容至少 50 个字符' },
                    { max: 1000, message: '内容不超过 1000 个字符' },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <TextArea
                    rows={7}
                    placeholder="详细描述案件背景、争议点和你的顾虑，AI 分析越精准..."
                    maxLength={1000}
                    onChange={(e) => setContentLength(e.target.value.length)}
                    className="content-textarea"
                  />
                </Form.Item>
              </div>
            </div>

            {/* 分区2：Agent 选择 */}
            <div className="form-section">
              <div className="form-section-header">
                <div className="section-icon"><TeamOutlined style={{ color: '#fff', fontSize: 13 }} /></div>
                <span className="section-title">选择 AI 辩手</span>
                <span className="section-hint">必须选 3 位</span>
              </div>
              <div className="form-section-body">
                <AgentSelector
                  agents={agentList}
                  selectedAgents={selectedAgents}
                  onChange={setSelectedAgents}
                  maxSelect={3}
                  minSelect={3}
                />
              </div>
            </div>

            {/* 分区3：标签 + 封面（并排） */}
            <div className="form-section">
              <div className="form-section-header">
                <div className="section-icon"><FileTextOutlined style={{ color: '#fff', fontSize: 13 }} /></div>
                <span className="section-title">补充信息</span>
                <span className="section-hint">可选</span>
              </div>
              <div className="form-section-body">
                {/* 话题标签 */}
                {tagList.length > 0 && (
                  <Form.Item
                    label={
                      <div className="form-label-with-count">
                        <span className="label-text"><TagOutlined style={{ marginRight: 4 }} />话题标签</span>
                        <span className="char-count">{selectedTagIds.length} / 3</span>
                      </div>
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <div className="tag-selector">
                      {tagList.map((tag) => {
                        const selected = selectedTagIds.includes(tag.id)
                        return (
                          <Tag
                            key={tag.id}
                            color={selected ? tag.color : undefined}
                            className={`tag-option ${selected ? 'tag-selected' : ''}`}
                            onClick={() => {
                              if (selected) {
                                setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id))
                              } else if (selectedTagIds.length < 3) {
                                setSelectedTagIds([...selectedTagIds, tag.id])
                              } else {
                                message.warning('最多选择 3 个标签')
                              }
                            }}
                          >
                            {tag.name}
                          </Tag>
                        )
                      })}
                    </div>
                  </Form.Item>
                )}

                {/* 封面上传 */}
                <Form.Item
                  label={
                    <span className="label-text">
                      <PictureOutlined style={{ marginRight: 4 }} />封面图片
                    </span>
                  }
                  style={{ marginBottom: 0 }}
                >
                  <Dragger
                    maxCount={1}
                    beforeUpload={beforeUpload}
                    onChange={handleImageChange}
                    onRemove={() => { setImageFile(null); setPreviewImage('') }}
                    fileList={imageFile ? [imageFile] : []}
                    accept="image/*"
                    className="image-uploader"
                  >
                    {previewImage ? (
                      <div className="image-preview">
                        <img src={previewImage} alt="preview" />
                      </div>
                    ) : (
                      <div className="upload-area">
                        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                        <p className="ant-upload-text">点击或拖拽图片上传</p>
                        <p className="ant-upload-hint">JPG / PNG / GIF，最大 5MB</p>
                      </div>
                    )}
                  </Dragger>
                </Form.Item>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="upload-progress">
                    <Progress percent={uploadProgress} status="active" strokeColor={{ '0%': '#1a4a8a', '100%': '#0891b2' }} />
                  </div>
                )}
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="submit-buttons">
              <Button
                type="primary"
                htmlType="submit"
                loading={createRoomMutation.isPending}
                disabled={selectedAgents.length !== 3}
                className="submit-button"
              >
                {createRoomMutation.isPending ? '创建中...' : '发布案件，开始辩论'}
              </Button>
            </div>
          </Form>
        </div>

        {/* 右侧信息栏 */}
        <div className="create-case-sidebar">
          {/* AI 专家介绍 */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <TeamOutlined />
              AI 辩手团队
            </div>
            <div className="sidebar-card-body">
              <div className="sidebar-agents">
                {AGENTS_PREVIEW.map((a) => (
                  <div key={a.name} className={`sidebar-agent-item ${a.cls}`}>
                    <span className="agent-emoji">{a.emoji}</span>
                    <div className="agent-info">
                      <span className="agent-name">{a.name}</span>
                      <span className="agent-desc">{a.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 创建提示 */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <BulbOutlined />
              填写建议
            </div>
            <div className="sidebar-card-body">
              <ul className="tips-list">
                {TIPS.map((tip, i) => (
                  <li key={i} className="tip-item">
                    <span className="tip-dot" />
                    <span className="tip-text">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 成功弹窗 */}
      <Modal open={showSuccessModal} footer={null} closable={false} centered className="success-modal">
        <div className="success-content">
          <div className="success-icon"><CheckCircleOutlined /></div>
          <h2 className="success-title">案件创建成功！</h2>
          <p className="success-message">AI 辩手已就位，辩论即将开始</p>
          <div className="success-buttons">
            <Button type="primary" size="large" onClick={() => createdRoomId && navigate(`/cases/${createdRoomId}`)} className="goto-room-button">
              进入辩论室
            </Button>
            <Button size="large" onClick={() => { setShowSuccessModal(false); navigate('/cases') }} className="goto-home-button">
              返回广场
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default CreateCase
