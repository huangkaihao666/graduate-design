import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Avatar, Badge, Button, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import { AlertOutlined, CheckCircleOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons'
import * as adminApi from '@/api/admin'
import './EmotionAlertsAdmin.less'

const RISK_COLORS: Record<string, string> = {
  HIGH: 'red',
  MEDIUM: 'orange',
}

const RISK_LABELS: Record<string, string> = {
  HIGH: '高风险',
  MEDIUM: '中风险',
}

const EmotionAlertsAdmin: React.FC = () => {
  const [riskLevel, setRiskLevel] = useState<string | undefined>()
  const [isHandled, setIsHandled] = useState<string | undefined>('false')
  const [page, setPage] = useState(1)
  const [handleTarget, setHandleTarget] = useState<any>(null)
  const [handleNote, setHandleNote] = useState('')
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-alerts', riskLevel, isHandled, page],
    queryFn: () => adminApi.getAdminAlerts({ riskLevel, isHandled, page, pageSize: 20 }),
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-alert-stats'],
    queryFn: () => adminApi.getAdminAlertStats(),
    refetchInterval: 30000,
  })

  const handleMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      adminApi.handleAdminAlert(id, note),
    onSuccess: () => {
      message.success('已标记为已处理')
      setHandleTarget(null)
      setHandleNote('')
      void qc.invalidateQueries({ queryKey: ['admin-alerts'] })
      void qc.invalidateQueries({ queryKey: ['admin-alert-stats'] })
    },
    onError: () => message.error('操作失败，请重试'),
  })

  const rows = (data as any)?.items || []
  const total = (data as any)?.total || 0
  const st = stats as any

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    {
      title: '用户',
      dataIndex: 'user',
      width: 180,
      render: (u: any) => (
        <Space>
          <Avatar size={28} src={u?.avatar} icon={<UserOutlined />} />
          <span style={{ fontWeight: 500 }}>{u?.name || `用户${u?.id}`}</span>
        </Space>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      width: 100,
      render: (v: string) => (
        <Tag color={RISK_COLORS[v] || 'default'} style={{ borderRadius: 6, fontWeight: 700 }}>
          {RISK_LABELS[v] || v}
        </Tag>
      ),
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'isHandled',
      width: 90,
      render: (v: boolean) =>
        v ? (
          <Tag color="green" style={{ borderRadius: 6 }}>已处理</Tag>
        ) : (
          <Badge status="error" text={<span style={{ fontSize: 12, color: '#dc2626' }}>待处理</span>} />
        ),
    },
    {
      title: '处理备注',
      dataIndex: 'handleNote',
      width: 180,
      ellipsis: true,
      render: (v: string) => v || <span style={{ color: '#b0a89c' }}>—</span>,
    },
    {
      title: '预警时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 110,
      render: (_: any, r: any) =>
        r.isHandled ? (
          <span style={{ color: '#b0a89c', fontSize: 12 }}>已处理</span>
        ) : (
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            style={{ borderRadius: 7, fontWeight: 600, fontSize: 12 }}
            onClick={() => {
              setHandleTarget(r)
              setHandleNote('')
            }}
          >
            处理
          </Button>
        ),
    },
  ]

  return (
    <div className="ea-page">
      {/* 顶部 Banner + 统计 */}
      <div className="ea-banner">
        <div className="ea-banner-left">
          <AlertOutlined className="ea-banner-icon" />
          <div>
            <h2 className="ea-banner-title">情绪预警</h2>
            <p className="ea-banner-sub">AI 实时监测用户情绪风险，高风险预警需及时跟进。</p>
          </div>
        </div>
        <div className="ea-stat-row">
          <div className="ea-stat-item ea-stat-high">
            <span className="ea-stat-num">{st?.highCount ?? '—'}</span>
            <span className="ea-stat-label">高风险待处理</span>
          </div>
          <div className="ea-stat-item ea-stat-medium">
            <span className="ea-stat-num">{st?.mediumCount ?? '—'}</span>
            <span className="ea-stat-label">中风险待处理</span>
          </div>
          <div className="ea-stat-item ea-stat-total">
            <span className="ea-stat-num">{st?.totalUnhandled ?? '—'}</span>
            <span className="ea-stat-label">全部待处理</span>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="ea-toolbar">
        <Select
          allowClear
          placeholder="风险等级"
          style={{ width: 130 }}
          value={riskLevel}
          onChange={(v) => { setRiskLevel(v); setPage(1) }}
          options={[
            { label: '高风险', value: 'HIGH' },
            { label: '中风险', value: 'MEDIUM' },
          ]}
        />
        <Select
          style={{ width: 130 }}
          value={isHandled ?? 'all'}
          onChange={(v) => { setIsHandled(v === 'all' ? undefined : v); setPage(1) }}
          options={[
            { label: '待处理', value: 'false' },
            { label: '已处理', value: 'true' },
            { label: '全部', value: 'all' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} style={{ borderRadius: 9 }}>
          刷新
        </Button>
      </div>

      {/* 表格 */}
      <div className="ea-table-wrap">
        <Table
          className="ea-table"
          rowKey="id"
          loading={isLoading}
          dataSource={rows}
          columns={columns as any}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: (p) => setPage(p),
            showTotal: (t) => `共 ${t} 条`,
          }}
          rowClassName={(r: any) =>
            !r.isHandled && r.riskLevel === 'HIGH' ? 'ea-row-high' : ''
          }
        />
      </div>

      {/* 处理 Modal */}
      <Modal
        open={!!handleTarget}
        title={
          <Space>
            <AlertOutlined style={{ color: '#dc2626' }} />
            处理情绪预警 #{handleTarget?.id}
          </Space>
        }
        okText="确认处理"
        cancelText="取消"
        onCancel={() => setHandleTarget(null)}
        onOk={() => {
          if (!handleTarget) return
          handleMutation.mutate({ id: handleTarget.id, note: handleNote })
        }}
        confirmLoading={handleMutation.isPending}
      >
        <div className="ea-modal-body">
          <div className="ea-modal-info">
            <span className="ea-modal-label">用户：</span>
            <span>{handleTarget?.user?.name || `用户${handleTarget?.user?.id}`}</span>
          </div>
          <div className="ea-modal-info">
            <span className="ea-modal-label">风险等级：</span>
            <Tag color={RISK_COLORS[handleTarget?.riskLevel] || 'default'}>
              {RISK_LABELS[handleTarget?.riskLevel] || handleTarget?.riskLevel}
            </Tag>
          </div>
          <div className="ea-modal-info ea-modal-summary">
            <span className="ea-modal-label">预警摘要：</span>
            <span style={{ color: '#6b6459' }}>{handleTarget?.summary}</span>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="ea-modal-label" style={{ marginBottom: 6 }}>处理备注（可选）：</div>
            <Input.TextArea
              rows={3}
              placeholder="记录处理情况，如：已联系用户、转介心理咨询等"
              value={handleNote}
              onChange={(e) => setHandleNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default EmotionAlertsAdmin
