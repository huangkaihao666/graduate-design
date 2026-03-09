import React, { useState } from 'react'
import { Card, Form, Input, Button, Select, Space, message, Upload, Image } from 'antd'
import { PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as roomApi from '@/api/rooms'
import './CreateCase.less'

const CreateCase: React.FC = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string>('')

  // 获取所有 Agents
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: roomApi.getAllAgents,
    staleTime: Infinity,
  })

  const agentList = (agentsData as unknown as any[] | undefined) || []
  const agentOptions = agentList.map((agent: any) => ({
    label: `${agent.name} - ${agent.description}`,
    value: agent.id,
  }))

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      await roomApi.createRoom({
        title: values.title,
        content: values.content,
        image: previewImage,
        agents: values.agents || [],
      })
      message.success('案件创建成功！')
      navigate('/cases')
    } catch (error: any) {
      message.error(error?.message || '创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e: any) => {
    const file = e.file
    if (file.status === 'done' || file.originFileObj) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string)
      }
      reader.readAsDataURL(file.originFileObj || file)
    }
  }

  return (
    <div className="create-case-page">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/cases')}
        className="back-button"
      >
        返回
      </Button>

      <div className="create-case-header">
        <h1>🎭 创建新案件</h1>
        <p>发起您的辩论话题，邀请 AI Agent 参与讨论</p>
      </div>

      <Card className="create-case-card">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          {/* 标题 */}
          <Form.Item
            label="案件标题"
            name="title"
            rules={[
              { required: true, message: '请输入案件标题' },
              { min: 5, message: '标题至少 5 个字符' },
              { max: 100, message: '标题不超过 100 个字符' },
            ]}
          >
            <Input
              size="large"
              placeholder="输入一个吸引人的案件标题"
              maxLength={100}
            />
          </Form.Item>

          {/* 描述 */}
          <Form.Item
            label="案件描述"
            name="content"
            rules={[
              { required: true, message: '请输入案件描述' },
              { min: 10, message: '描述至少 10 个字符' },
              { max: 1000, message: '描述不超过 1000 个字符' },
            ]}
          >
            <Input.TextArea
              rows={6}
              placeholder="详细描述您的案件背景和讨论点"
              maxLength={1000}
              showCount
            />
          </Form.Item>

          {/* 参与的 Agents */}
          <Form.Item
            label="选择参与的 AI Agent"
            name="agents"
            rules={[
              {
                validator: (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error('请至少选择一个 Agent'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="选择 1 个或多个 Agent"
              options={agentOptions}
            />
          </Form.Item>

          {/* 封面图片 */}
          <Form.Item label="案件封面（可选）">
            <Upload
              maxCount={1}
              onChange={handleImageUpload}
              beforeUpload={() => false}
            >
              <Button icon={<PlusOutlined />}>上传图片</Button>
            </Upload>
            {previewImage && (
              <div className="preview-image">
                <Image src={previewImage} width="100%" />
              </div>
            )}
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item>
            <Space style={{ width: '100%' }} direction="vertical">
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={loading}
                block
              >
                创建案件
              </Button>
              <Button size="large" onClick={() => navigate('/cases')} block>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default CreateCase
