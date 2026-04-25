import React, { useState } from 'react'
import {
  Button, DatePicker, Form, Input, Modal, Popconfirm, Space, Tag, message, Skeleton, Empty,
} from 'antd'
import {
  DeleteOutlined, NotificationOutlined, PlusOutlined, SendOutlined,
  ClockCircleOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '@/api/admin'
import dayjs from 'dayjs'
import './AnnouncementsAdmin.less'

const AnnouncementsAdmin: React.FC = () => {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-announcements', page],
    queryFn: () => adminApi.getAdminAnnouncements({ page, pageSize: 10 }),
    staleTime: 0,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })

  const createMutation = useMutation({
    mutationFn: adminApi.createAnnouncement,
    onSuccess: () => {
      message.success('公告已发布，正在推送给所有活跃用户')
      setModalOpen(false)
      form.resetFields()
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteAnnouncement,
    onSuccess: () => { message.success('公告已删除'); invalidate() },
  })

  const handleSubmit = async () => {
    const values = await form.validateFields()
    createMutation.mutate({
      title: values.title,
      content: values.content,
      expireAt: values.expireAt ? values.expireAt.toISOString() : undefined,
    })
  }

  const announcements: any[] = (data as any)?.data ?? []
  const pagination = (data as any)?.pagination ?? {}
  const total = pagination.total ?? 0

  const isExpired = (expireAt: string | null) => expireAt ? new Date(expireAt) < new Date() : false

  return (
    <div className="an-page">
      {/* ── Banner ── */}
      <div className="an-banner">
        <div className="an-banner-bg" />
        <div className="an-banner-content">
          <div className="an-banner-left">
            <div className="an-banner-icon"><NotificationOutlined /></div>
            <div>
              <div className="an-banner-title">系统公告管理</div>
              <div className="an-banner-sub">向所有活跃用户推送平台通知，公告将出现在用户的消息中心</div>
            </div>
          </div>
          <Button
            className="an-create-btn"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            发布公告
          </Button>
        </div>
      </div>

      {/* ── 公告列表 ── */}
      <div className="an-list">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="an-item an-item-skeleton">
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ))
        ) : announcements.length === 0 ? (
          <div className="an-empty">
            <Empty
              image={<NotificationOutlined style={{ fontSize: 56, color: '#c7d2fe' }} />}
              description={<span style={{ color: '#94a3b8' }}>暂无公告，点击上方按钮发布</span>}
            />
          </div>
        ) : (
          announcements.map((item: any) => {
            const expired = isExpired(item.expireAt)
            return (
              <div key={item.id} className={`an-item ${expired ? 'an-item-expired' : ''}`}>
                <div className="an-item-header">
                  <div className="an-item-title-row">
                    <span className="an-item-title">{item.title}</span>
                    {item.expireAt ? (
                      expired
                        ? <Tag color="default" style={{ borderRadius: 6 }}>已过期</Tag>
                        : <Tag color="green" style={{ borderRadius: 6 }}><CheckCircleOutlined /> 有效</Tag>
                    ) : (
                      <Tag color="blue" style={{ borderRadius: 6 }}>永久有效</Tag>
                    )}
                  </div>
                  <div className="an-item-meta">
                    <span className="an-item-time">
                      <SendOutlined style={{ marginRight: 4 }} />
                      发布于 {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                    </span>
                    {item.expireAt && (
                      <span className={`an-item-expire ${expired ? 'expired' : ''}`}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {expired ? '已于' : '过期于'} {dayjs(item.expireAt).format('YYYY-MM-DD')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="an-item-content">{item.content}</div>
                <div className="an-item-footer">
                  <Popconfirm
                    title="确认删除该公告？"
                    onConfirm={() => deleteMutation.mutate(item.id)}
                    okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
                  >
                    <button className="an-delete-btn">
                      <DeleteOutlined style={{ marginRight: 4 }} />
                      删除公告
                    </button>
                  </Popconfirm>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── 分页 ── */}
      {total > 10 && (
        <div className="an-pagination">
          {Array.from({ length: Math.ceil(total / 10) }).map((_, i) => (
            <button
              key={i}
              className={`an-page-btn ${page === i + 1 ? 'active' : ''}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* ── 发布弹窗 ── */}
      <Modal
        open={modalOpen}
        title={
          <Space>
            <SendOutlined style={{ color: '#6366F1' }} />
            <span>发布系统公告</span>
          </Space>
        }
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={handleSubmit}
        okText="发布并推送"
        cancelText="取消"
        confirmLoading={createMutation.isPending}
        width={560}
        destroyOnClose
      >
        <div className="an-modal-warning">
          ⚠️ 发布后将向所有活跃用户推送站内通知，请确认内容后再发布。
        </div>
        <Form form={form} layout="vertical" style={{ marginTop: 4 }}>
          <Form.Item name="title" label="公告标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="如：平台升级通知、功能更新说明" maxLength={100} showCount />
          </Form.Item>
          <Form.Item name="content" label="公告内容" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={5} placeholder="公告详细内容…" maxLength={2000} showCount />
          </Form.Item>
          <Form.Item name="expireAt" label="过期时间（不填则永久有效）">
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="选择过期时间（可选）"
              disabledDate={(d) => d.isBefore(dayjs())}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AnnouncementsAdmin
