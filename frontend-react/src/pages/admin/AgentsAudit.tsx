import React, { useState } from 'react'
import {
  Avatar, Button, Input, Modal, Space, Table, Tag, message, Typography,
} from 'antd'
import {
  CheckOutlined, CloseOutlined, RobotOutlined, SearchOutlined, UserOutlined,
  CodeOutlined, BookOutlined, FileTextOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '@/api/admin'
import './AgentsAudit.less'

const { Paragraph } = Typography

const AgentsAudit: React.FC = () => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [rejectModal, setRejectModal] = useState<{ open: boolean; agentId: string; name: string }>({
    open: false, agentId: '', name: '',
  })
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-agents-pending', page, search],
    queryFn: () => adminApi.getPendingAgents({ page, pageSize: 10, search: search || undefined }),
    staleTime: 0,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-agents-pending'] })

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveAgent(id),
    onSuccess: () => { message.success('审核通过，智能体已公开展示'); invalidate() },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectAgent(id, reason),
    onSuccess: () => {
      message.success('已拒绝并通知创建者')
      setRejectModal({ open: false, agentId: '', name: '' })
      setRejectReason('')
      invalidate()
    },
  })

  const agents = (data as any)?.data ?? []
  const pagination = (data as any)?.pagination ?? {}
  const total = pagination.total ?? 0

  const columns = [
    {
      title: '智能体',
      key: 'agent',
      width: 220,
      render: (_: any, r: any) => (
        <Space size={10}>
          <Avatar src={r.avatar} icon={<RobotOutlined />} size={38} className="aa-agent-avatar" />
          <div className="aa-col-agent">
            <div className="aa-agent-name">{r.name}</div>
            <div className="aa-agent-personality">{r.personality || '未设置人设'}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 260,
      ellipsis: true,
      render: (v: string) => <span className="aa-col-desc">{v || <span style={{ color: '#cbd5e1' }}>暂无描述</span>}</span>,
    },
    {
      title: '擅长领域',
      dataIndex: 'domains',
      width: 180,
      render: (v: string) =>
        v ? (
          <Space size={4} wrap>
            {v.split(',').filter(Boolean).map((d) => (
              <Tag key={d} color="blue" className="aa-domain-tag">{d}</Tag>
            ))}
          </Space>
        ) : <span style={{ color: '#cbd5e1' }}>—</span>,
    },
    {
      title: '创建者',
      key: 'creator',
      width: 130,
      render: (_: any, r: any) => (
        <Space size={6}>
          <Avatar src={r.creator?.avatar} icon={<UserOutlined />} size={24} />
          <span className="aa-col-creator">{r.creator?.name ?? '未知'}</span>
        </Space>
      ),
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 110,
      render: (v: string) => (
        <span className="aa-col-time">{new Date(v).toLocaleDateString('zh-CN')}</span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={6}>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            loading={approveMutation.isPending}
            onClick={() => approveMutation.mutate(r.id)}
            className="aa-approve-btn"
          >
            通过
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseOutlined />}
            onClick={() => setRejectModal({ open: true, agentId: r.id, name: r.name })}
            className="aa-reject-btn"
          >
            拒绝
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="aa-page">
      {/* ── Banner ── */}
      <div className="aa-banner">
        <div className="aa-banner-bg" />
        <div className="aa-banner-content">
          <div className="aa-banner-left">
            <div className="aa-banner-icon"><RobotOutlined /></div>
            <div>
              <div className="aa-banner-title">智能体审核</div>
              <div className="aa-banner-sub">审核用户创建的自定义 AI 智能体，通过后将在 AI 图鉴公开展示</div>
            </div>
          </div>
          <div className="aa-banner-stat">
            <div className="aa-stat-num">{total}</div>
            <div className="aa-stat-label">待审核</div>
          </div>
        </div>
      </div>

      {/* ── 工具栏 ── */}
      <div className="aa-toolbar">
        <Input
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="搜索智能体名称或描述…"
          allowClear
          className="aa-search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
        <span className="aa-count">{total > 0 ? `共 ${total} 条待审核` : '暂无待审核'}</span>
      </div>

      {/* ── 表格 ── */}
      <div className="aa-table-wrap">
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={agents}
          columns={columns}
          className="aa-table"
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            total,
            pageSize: 10,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
          }}
          expandable={{
            expandedRowRender: (r: any) => (
              <div className="aa-expand-row">
                {r.description && (
                  <div className="aa-expand-block">
                    <div className="aa-expand-label">完整描述</div>
                    <div className="aa-expand-text">{r.description}</div>
                  </div>
                )}
                {r.knowledgeBase && (
                  <div className="aa-expand-block">
                    <div className="aa-expand-label">
                      <BookOutlined style={{ marginRight: 6 }} />
                      绑定知识库：{r.knowledgeBase.name}
                      {r.knowledgeBase.description && (
                        <span className="aa-kb-desc">— {r.knowledgeBase.description}</span>
                      )}
                    </div>
                    {r.knowledgeBase.documents?.length > 0 ? (
                      <div className="aa-kb-docs">
                        {r.knowledgeBase.documents.map((doc: any) => (
                          <div key={doc.id} className="aa-kb-doc-item">
                            <FileTextOutlined className="aa-kb-doc-icon" />
                            <span className="aa-kb-doc-name">{doc.filename}</span>
                            <span className="aa-kb-doc-size">
                              {doc.size > 1024 * 1024
                                ? `${(doc.size / 1024 / 1024).toFixed(1)} MB`
                                : `${(doc.size / 1024).toFixed(0)} KB`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="aa-expand-text" style={{ color: '#94a3b8' }}>知识库暂无文档</div>
                    )}
                  </div>
                )}
                {r.prompt && (
                  <div className="aa-expand-block">
                    <div className="aa-expand-label">
                      <CodeOutlined style={{ marginRight: 6 }} />System Prompt
                    </div>
                    <Paragraph
                      className="aa-prompt-code"
                      copyable={{ text: r.prompt }}
                    >
                      {r.prompt}
                    </Paragraph>
                  </div>
                )}
              </div>
            ),
            rowExpandable: (r: any) => !!(r.description || r.prompt || r.knowledgeBase),
          }}
        />
      </div>

      {/* ── 拒绝弹窗 ── */}
      <Modal
        open={rejectModal.open}
        title={
          <Space>
            <CloseOutlined style={{ color: '#EF4444' }} />
            <span>拒绝「{rejectModal.name}」</span>
          </Space>
        }
        onCancel={() => { setRejectModal({ open: false, agentId: '', name: '' }); setRejectReason('') }}
        onOk={() => rejectMutation.mutate({ id: rejectModal.agentId, reason: rejectReason || '不符合平台规范' })}
        okButtonProps={{ danger: true, loading: rejectMutation.isPending }}
        okText="确认拒绝"
        cancelText="取消"
        width={480}
        destroyOnClose
      >
        <div className="aa-reject-warning">
          拒绝后将发送站内通知给创建者，请填写具体原因。
        </div>
        <Input.TextArea
          rows={4}
          placeholder="如：内容不符合社区规范、人设描述不清晰等…"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={200}
          showCount
        />
      </Modal>
    </div>
  )
}

export default AgentsAudit
