import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Upload, Progress, Modal } from 'antd'
import { ArrowLeftOutlined, InboxOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UploadFile, RcFile } from 'antd/es/upload/interface'
import { AgentSelector } from '@/components/AgentSelector'
import * as roomApi from '@/api/rooms'
import './CreateCase.less'

const { TextArea } = Input
const { Dragger } = Upload

const CreateCase: React.FC = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [imageFile, setImageFile] = useState<UploadFile | null>(null)
  const [previewImage, setPreviewImage] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [titleLength, setTitleLength] = useState(0)
  const [contentLength, setContentLength] = useState(0)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdRoomId, setCreatedRoomId] = useState<number | null>(null)

  // 获取所有 Agents
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: roomApi.getAllAgents,
    staleTime: Infinity,
  })

  const agentList = (agentsData as unknown as any[] | undefined) || []

  // 创建案件 Mutation
  const createRoomMutation = useMutation({
    mutationFn: (data: any) => roomApi.createRoom(data),
    onSuccess: (data: any) => {
      setCreatedRoomId(data.id)
      setShowSuccessModal(true)
      form.resetFields()
      setSelectedAgents([])
      setImageFile(null)
      setPreviewImage('')
      
      // 让查询缓存失效，以便列表页能看到新案件
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['my-cases'] })
    },
    onError: (error: any) => {
      message.error(error?.message || '创建失败，请重试')
    },
  })

  const handleSubmit = async (values: any) => {
    // 验证 Agent 选择
    if (selectedAgents.length !== 3) {
      message.warning('请选择 3 个 AI Agent')
      return
    }

    // 模拟上传进度
    setUploadProgress(20)
    setTimeout(() => setUploadProgress(50), 300)
    setTimeout(() => setUploadProgress(80), 600)

    try {
      await createRoomMutation.mutateAsync({
        title: values.title,
        content: values.content,
        image: previewImage || undefined, // Base64 图片数据
        agents: selectedAgents,
      })
      setUploadProgress(100)
    } catch (error) {
      console.error('创建案件失败:', error)
      setUploadProgress(0)
    }
  }

  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('只能上传图片文件！')
      return Upload.LIST_IGNORE
    }

    const isLt5M = file.size / 1024 / 1024 < 5
    if (!isLt5M) {
      message.error('图片大小不能超过 5MB！')
      return Upload.LIST_IGNORE
    }

    return false // 阻止自动上传
  }

  const handleImageChange = (info: any) => {
    const file = info.file as UploadFile
    setImageFile(file)

    // 生成预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string)
    }
    reader.readAsDataURL(file as RcFile)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setPreviewImage('')
  }

  const handleGoToRoom = () => {
    if (createdRoomId) {
      navigate(`/cases/${createdRoomId}`)
    }
  }

  const handleGoHome = () => {
    setShowSuccessModal(false)
    navigate('/cases')
  }

  return (
    <div className="create-case-page">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/cases')}
        className="back-button"
      >
        返回首页
      </Button>

      <div className="create-case-header">
        <h1 className="page-title">🎭 创建新案件</h1>
        <p className="page-subtitle">发起您的辩论话题，邀请 AI Agent 参与激烈讨论</p>
      </div>

      <Card className="create-case-card">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          {/* 标题输入 */}
          <Form.Item
            label={
              <div className="form-label-with-count">
                <span className="label-text">📝 案件标题</span>
                <span className="char-count">
                  {titleLength} / 100
                </span>
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
              placeholder="请输入你的困境标题..."
              maxLength={100}
              onChange={(e) => setTitleLength(e.target.value.length)}
              className="title-input"
            />
          </Form.Item>

          {/* 内容描述 */}
          <Form.Item
            label={
              <div className="form-label-with-count">
                <span className="label-text">📄 案件内容</span>
                <span className="char-count">
                  {contentLength} / 1000 {contentLength < 50 && contentLength > 0 && <span className="warning">(至少 50 字)</span>}
                </span>
              </div>
            }
            name="content"
            rules={[
              { required: true, message: '请输入案件内容' },
              { min: 50, message: '内容至少 50 个字符' },
              { max: 1000, message: '内容不超过 1000 个字符' },
            ]}
          >
            <TextArea
              rows={8}
              placeholder="详细描述您的案件背景、争议点和期望讨论的问题..."
              maxLength={1000}
              onChange={(e) => setContentLength(e.target.value.length)}
              className="content-textarea"
            />
          </Form.Item>

          {/* AI Agent 选择器 */}
          <AgentSelector
            agents={agentList}
            selectedAgents={selectedAgents}
            onChange={setSelectedAgents}
            maxSelect={3}
            minSelect={3}
          />

          {/* 图片上传 */}
          <Form.Item
            label={<span className="label-text">🖼️ 案件封面（可选）</span>}
          >
            <Dragger
              maxCount={1}
              beforeUpload={beforeUpload}
              onChange={handleImageChange}
              onRemove={handleRemoveImage}
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
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽图片到此区域上传</p>
                  <p className="ant-upload-hint">
                    支持 JPG、PNG、GIF 格式，文件大小不超过 5MB
                  </p>
                </div>
              )}
            </Dragger>
          </Form.Item>

          {/* 上传进度 */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="upload-progress">
              <Progress percent={uploadProgress} status="active" strokeColor={{
                '0%': '#667eea',
                '100%': '#764ba2',
              }} />
            </div>
          )}

          {/* 提交按钮 */}
          <Form.Item>
            <div className="submit-buttons">
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={createRoomMutation.isPending}
                disabled={selectedAgents.length !== 3}
                className="submit-button"
                block
              >
                {createRoomMutation.isPending ? '创建中...' : '🚀 创建案件并开始辩论'}
              </Button>
              <Button
                size="large"
                onClick={() => navigate('/cases')}
                className="cancel-button"
                block
              >
                取消
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>

      {/* 成功提示 Modal */}
      <Modal
        open={showSuccessModal}
        footer={null}
        closable={false}
        centered
        className="success-modal"
      >
        <div className="success-content">
          <div className="success-icon">
            <CheckCircleOutlined />
          </div>
          <h2 className="success-title">案件创建成功！</h2>
          <p className="success-message">
            您的案件已成功创建，AI 辩论即将开始
          </p>
          <div className="success-buttons">
            <Button
              type="primary"
              size="large"
              onClick={handleGoToRoom}
              className="goto-room-button"
            >
              进入辩论室
            </Button>
            <Button
              size="large"
              onClick={handleGoHome}
              className="goto-home-button"
            >
              返回首页
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default CreateCase
