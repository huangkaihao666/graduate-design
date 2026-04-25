import React, { useEffect, useRef, useState } from 'react'
import {
  Avatar, Button, Input, Modal, Popconfirm, Space, Table, Tag, message, Typography,
} from 'antd'
import {
  BookOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, EyeOutlined,
  FileTextOutlined, SearchOutlined, UserOutlined, RobotOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '@/api/admin'
import './KnowledgeBaseAdmin.less'

const { Text } = Typography

// ── PDF/文本预览组件（用 Blob URL 绕过 CSP 限制） ──────────────

const DocPreview: React.FC<{ filename: string; mimeType: string; content: string }> = ({ filename, mimeType, content }) => {
  const blobUrlRef = useRef<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    const bytes = Uint8Array.from(atob(content), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: mimeType })
    const url = URL.createObjectURL(blob)
    blobUrlRef.current = url
    setBlobUrl(url)
    return () => { URL.revokeObjectURL(url) }
  }, [content, mimeType])

  const isPdf = mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')
  const isText = mimeType === 'text/plain' || filename.toLowerCase().endsWith('.txt')

  if (isPdf) {
    return blobUrl ? (
      <iframe
        src={blobUrl}
        style={{ width: '100%', height: 600, border: 'none', borderRadius: 8 }}
        title={filename}
      />
    ) : null
  }

  if (isText) {
    try {
      const text = new TextDecoder('utf-8').decode(
        Uint8Array.from(atob(content), (c) => c.charCodeAt(0))
      )
      return (
        <pre style={{
          maxHeight: 560, overflow: 'auto', background: '#f8fafc',
          padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.7,
          whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0,
        }}>
          {text}
        </pre>
      )
    } catch {
      return <div style={{ color: '#ef4444', padding: 16 }}>文本解码失败</div>
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
      <FileTextOutlined style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
      该文件格式（{mimeType}）暂不支持在线预览
    </div>
  )
}

// 文档状态配置
const DOC_STATUS: Record<string, { color: string; label: string }> = {
  PENDING:  { color: 'gold',    label: '待审核' },
  APPROVED: { color: 'green',   label: '已通过' },
  REJECTED: { color: 'red',     label: '已拒绝' },
}

const KnowledgeBaseAdmin: React.FC = () => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [previewDoc, setPreviewDoc] = useState<{ id: number; filename: string; mimeType: string; content: string | null } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const handlePreview = async (doc: any) => {
    setLoadingPreview(true)
    try {
      const result = await adminApi.getKnowledgeDocumentContent(doc.id)
      if (!result.content) {
        message.warning('该文件为历史数据，未存储内容，请让用户重新上传以支持预览')
        return
      }
      setPreviewDoc({ id: result.id, filename: result.filename, mimeType: result.mimeType, content: result.content })
    } catch {
      message.error('内容加载失败')
    } finally {
      setLoadingPreview(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-kbs', page, search],
    queryFn: () => adminApi.getAdminKnowledgeBases({ page, pageSize: 10, search: search || undefined }),
    staleTime: 0,
  })

  const deleteKbMutation = useMutation({
    mutationFn: adminApi.deleteAdminKnowledgeBase,
    onSuccess: () => {
      message.success('知识库已删除，关联智能体已自动解绑')
      queryClient.invalidateQueries({ queryKey: ['admin-kbs'] })
    },
  })

  const deleteDocMutation = useMutation({
    mutationFn: adminApi.deleteAdminKnowledgeDocument,
    onSuccess: () => {
      message.success('文档已删除')
      queryClient.invalidateQueries({ queryKey: ['admin-kbs'] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: adminApi.approveKnowledgeDocument,
    onSuccess: () => {
      message.success('文档已通过审核，已同步到 Coze 知识库')
      queryClient.invalidateQueries({ queryKey: ['admin-kbs'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: adminApi.rejectKnowledgeDocument,
    onSuccess: () => {
      message.success('文档已拒绝')
      queryClient.invalidateQueries({ queryKey: ['admin-kbs'] })
    },
  })

  const kbs = (data as any)?.data ?? []
  const pagination = (data as any)?.pagination ?? {}
  const total = pagination.total ?? 0

  const columns = [
    {
      title: '知识库',
      key: 'kb',
      width: 200,
      render: (_: any, r: any) => (
        <div className="kb-col-name">
          <div className="kb-name-text">{r.name}</div>
          {r.description && <Text type="secondary" className="kb-desc-text">{r.description}</Text>}
        </div>
      ),
    },
    {
      title: '所有者',
      key: 'user',
      width: 140,
      render: (_: any, r: any) => (
        <Space size={6}>
          <Avatar src={r.user?.avatar} icon={<UserOutlined />} size={24} />
          <span className="kb-user-name">{r.user?.name ?? '-'}</span>
        </Space>
      ),
    },
    {
      title: '文档',
      dataIndex: 'docCount',
      width: 80,
      render: (v: number) => (
        <Tag color={v === 0 ? 'default' : 'blue'} style={{ borderRadius: 6, fontWeight: 600 }}>
          {v} 份
        </Tag>
      ),
    },
    {
      title: '绑定智能体',
      key: 'agents',
      width: 200,
      render: (_: any, r: any) =>
        r.boundAgents?.length > 0 ? (
          <Space size={4} wrap>
            {r.boundAgents.map((a: any) => (
              <Tag
                key={a.id}
                icon={<RobotOutlined />}
                color={a.status === 'APPROVED' ? 'green' : a.status === 'PENDING' ? 'gold' : 'default'}
                style={{ borderRadius: 6 }}
              >
                {a.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>未绑定</Text>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 110,
      render: (v: string) => <span className="kb-time">{new Date(v).toLocaleDateString('zh-CN')}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Popconfirm
          title="删除整个知识库？"
          description="将删除所有文档并自动解绑关联智能体，不可恢复。"
          onConfirm={() => deleteKbMutation.mutate(r.id)}
          okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
        >
          <Button danger size="small" icon={<DeleteOutlined />}>删除知识库</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div className="kba-page">
      {/* ── Banner ── */}
      <div className="kba-banner">
        <div className="kba-banner-bg" />
        <div className="kba-banner-content">
          <div className="kba-banner-left">
            <div className="kba-banner-icon"><BookOutlined /></div>
            <div>
              <div className="kba-banner-title">知识库审核</div>
              <div className="kba-banner-sub">审核用户上传的知识库文档内容，可删除违规文档或整个知识库</div>
            </div>
          </div>
          <div className="kba-banner-stat">
            <div className="kba-stat-num">{total}</div>
            <div className="kba-stat-label">知识库</div>
          </div>
        </div>
      </div>

      {/* ── 工具栏 ── */}
      <div className="kba-toolbar">
        <Input
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="搜索知识库名称…"
          allowClear
          className="kba-search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* ── 表格 ── */}
      <div className="kba-table-wrap">
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={kbs}
          columns={columns}
          className="kba-table"
          scroll={{ x: 820 }}
          pagination={{
            current: page,
            total,
            pageSize: 10,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 个知识库`,
          }}
          expandable={{
            expandedRowRender: (r: any) => (
              <div className="kba-expand-row">
                <div className="kba-expand-header">
                  <FileTextOutlined style={{ color: '#0ea5e9', marginRight: 6 }} />
                  <span>文档列表（预览内容后进行审核）</span>
                </div>
                {r.documents?.length === 0 ? (
                  <div className="kba-expand-empty">该知识库暂无文档</div>
                ) : (
                  <div className="kba-doc-list">
                    {r.documents?.map((doc: any) => {
                      const st = DOC_STATUS[doc.status] ?? DOC_STATUS.PENDING
                      return (
                        <div key={doc.id} className="kba-doc-item">
                          <FileTextOutlined className="kba-doc-icon" />
                          <span className="kba-doc-name">{doc.filename}</span>
                          <span className="kba-doc-size">
                            {doc.size > 1024 * 1024
                              ? `${(doc.size / 1024 / 1024).toFixed(1)} MB`
                              : `${(doc.size / 1024).toFixed(0)} KB`}
                          </span>
                          <Tag color={st.color} style={{ borderRadius: 6, fontWeight: 600 }}>{st.label}</Tag>
                          <span className="kba-doc-time">
                            {new Date(doc.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                          <Space size={4} className="kba-doc-actions">
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              loading={loadingPreview}
                              onClick={() => handlePreview(doc)}
                            >
                              预览
                            </Button>
                            {doc.status !== 'APPROVED' && (
                              <Button
                                size="small"
                                type="primary"
                                icon={<CheckOutlined />}
                                loading={approveMutation.isPending}
                                onClick={() => approveMutation.mutate(doc.id)}
                                className="kba-approve-btn"
                              >
                                通过
                              </Button>
                            )}
                            {doc.status !== 'REJECTED' && (
                              <Popconfirm
                                title="拒绝该文档？"
                                description="文档将被标记为拒绝，不会同步到知识库。"
                                onConfirm={() => rejectMutation.mutate(doc.id)}
                                okText="拒绝" cancelText="取消" okButtonProps={{ danger: true }}
                              >
                                <Button size="small" danger icon={<CloseOutlined />}>拒绝</Button>
                              </Popconfirm>
                            )}
                            <Popconfirm
                              title="删除该文档？"
                              description="操作不可恢复。"
                              onConfirm={() => deleteDocMutation.mutate(doc.id)}
                              okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ),
            rowExpandable: () => true,
          }}
        />
      </div>

      {/* ── 文档预览弹窗 ── */}
      <Modal
        open={!!previewDoc}
        onCancel={() => setPreviewDoc(null)}
        footer={<Button onClick={() => setPreviewDoc(null)}>关闭</Button>}
        title={
          <Space>
            <EyeOutlined style={{ color: '#0ea5e9' }} />
            <span>{previewDoc?.filename}</span>
          </Space>
        }
        width={800}
        style={{ top: 40 }}
        destroyOnClose
      >
        {previewDoc && (
          previewDoc.content
            ? <DocPreview filename={previewDoc.filename} mimeType={previewDoc.mimeType} content={previewDoc.content} />
            : <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                <FileTextOutlined style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
                暂无内容
              </div>
        )}
      </Modal>
    </div>
  )
}

export default KnowledgeBaseAdmin
