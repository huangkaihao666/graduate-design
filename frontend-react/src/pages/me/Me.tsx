import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar, Button, Divider, Form, Input, Modal,
  Space, Table, Tag, Tabs, Upload, message,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  LockOutlined, DeleteOutlined, UploadOutlined,
  FileTextOutlined, LikeOutlined, EyeOutlined,
  CommentOutlined, TrophyOutlined, EditOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as usersApi from '@/api/users'
import * as roomApi from '@/api/rooms'
import './Me.less'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  LIVE:    { label: '进行中', color: 'blue' },
  WAITING: { label: '待开始', color: 'gold' },
  CLOSED:  { label: '已结束', color: 'default' },
}

const Me: React.FC = () => {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()
  const userId = user?.id

  const [profileForm] = Form.useForm()
  const [pwdForm] = Form.useForm()
  const [avatarFileList, setAvatarFileList] = useState<UploadFile[]>([])
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(user?.avatar || undefined)
  const [pwdModalOpen, setPwdModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)

  const { data: myRoomsResp, isLoading: myRoomsLoading, refetch: refetchMyRooms } = useQuery({
    queryKey: ['me-rooms', userId],
    queryFn: () => usersApi.getMyRooms(Number(userId), { page: 1, pageSize: 50 }),
    enabled: !!userId,
  })
  const { data: myVotesResp, isLoading: myVotesLoading } = useQuery({
    queryKey: ['me-votes', userId],
    queryFn: () => usersApi.getMyVotes(Number(userId), { page: 1, pageSize: 50 }),
    enabled: !!userId,
  })
  const { data: stats } = useQuery({
    queryKey: ['me-stats', userId],
    queryFn: () => usersApi.getMyStats(Number(userId)),
    enabled: !!userId,
  })
  const { data: followCounts } = useQuery({
    queryKey: ['follow-counts', userId],
    queryFn: () => usersApi.getFollowCounts(Number(userId)),
    enabled: !!userId,
  })

  const followCountsData = followCounts as any
  const myRooms = (myRoomsResp as any)?.data || []
  const myVotes = (myVotesResp as any)?.data || []
  const st = stats as any

  const statItems = [
    { icon: <FileTextOutlined />, label: '发布案件', value: st?.roomsCount ?? 0, color: '#1a4a8a' },
    { icon: <LikeOutlined />,     label: '参与投票', value: st?.votesCount ?? 0, color: '#059669' },
    { icon: <EyeOutlined />,      label: '总围观量', value: st?.views ?? 0,      color: '#0891b2' },
    { icon: <CommentOutlined />,  label: '评论数',   value: st?.comments ?? 0,   color: '#b45309' },
  ]

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsDataURL(file)
    })

  const handleAvatarBeforeUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { message.error('只能上传图片文件'); return Upload.LIST_IGNORE }
    if (file.size > 200 * 1024) { message.error('图片过大（请小于 200KB）'); return Upload.LIST_IGNORE }
    const url = await fileToDataUrl(file)
    setAvatarDataUrl(url)
    setAvatarFileList([{ uid: file.name, name: file.name, status: 'done', url }])
    return Upload.LIST_IGNORE
  }

  const handleSaveProfile = async () => {
    if (!userId) return
    const values = await profileForm.validateFields()
    const resp = await usersApi.updateProfile(Number(userId), { name: values.name, bio: values.bio, avatar: avatarDataUrl })
    updateUser({ name: (resp as any)?.name, avatar: (resp as any)?.avatar, bio: (resp as any)?.bio })
    message.success('个人信息已更新')
    setEditingProfile(false)
  }

  const handleChangePassword = async () => {
    if (!userId) return
    const values = await pwdForm.validateFields()
    await usersApi.updatePassword(Number(userId), { oldPassword: values.oldPassword, newPassword: values.newPassword })
    message.success('密码修改成功')
    setPwdModalOpen(false)
    pwdForm.resetFields()
  }

  const handleDeleteRoom = async (roomId: number) => {
    Modal.confirm({
      title: '确认删除案件？', content: '删除后无法恢复。',
      okText: '删除', okButtonProps: { danger: true }, cancelText: '取消',
      onOk: async () => {
        await roomApi.deleteRoom(roomId)
        message.success('已删除')
        await refetchMyRooms()
        void queryClient.invalidateQueries({ queryKey: ['case-detail', String(roomId)] })
      },
    })
  }

  // 案件表格列
  const roomColumns = [
    {
      title: 'ID', dataIndex: 'id', width: 56,
      render: (v: number) => <span style={{ color: '#6b85a0', fontSize: 12 }}>#{v}</span>,
    },
    {
      title: '标题', dataIndex: 'title', ellipsis: true,
      render: (v: string, record: any) => (
        <span
          className="table-title-link"
          onClick={() => navigate(record.status === 'LIVE' ? `/debate/${record.id}` : `/cases/${record.id}`)}
        >
          {v}
        </span>
      ),
    },
    {
      title: '状态', dataIndex: 'status', width: 88,
      render: (v: string) => {
        const cfg = STATUS_MAP[v] || STATUS_MAP.CLOSED
        return <Tag color={cfg.color} style={{ borderRadius: 6, fontSize: 11 }}>{cfg.label}</Tag>
      },
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 160,
      render: (v: string) => v ? (
        <span style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#6b85a0' }}>
          {new Date(v).toLocaleString('zh-CN')}
        </span>
      ) : '-',
    },
    {
      title: '操作', key: 'actions', width: 64,
      render: (_: any, record: any) => (
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteRoom(record.id)} />
      ),
    },
  ]

  // 投票表格列
  const voteColumns = [
    {
      title: '时间', dataIndex: 'createdAt', width: 160,
      render: (v: string) => (
        <span style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#6b85a0' }}>
          {new Date(v).toLocaleString('zh-CN')}
        </span>
      ),
    },
    {
      title: '案件', dataIndex: ['room', 'title'], ellipsis: true,
      render: (v: string, record: any) => (
        <span
          className="table-title-link"
          onClick={() => navigate(`/cases/${record.room?.id}`)}
        >
          {v}
        </span>
      ),
    },
    {
      title: '支持的 Agent', dataIndex: 'agent', width: 260,
      render: (a: any) => (
        <Space size={6} style={{ flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
          <Avatar size={22} src={a?.avatar} style={{ background: 'linear-gradient(135deg,#1a4a8a,#0891b2)', fontSize: 11, flexShrink: 0 }}>
            {!a?.avatar ? (a?.name?.[0] || '?') : ''}
          </Avatar>
          <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{a?.name || a?.id}</span>
          {a?.personality && (
            <Tag color="blue" style={{ fontSize: 11, borderRadius: 4, whiteSpace: 'nowrap', marginInlineEnd: 0 }}>
              {a.personality}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '案件状态', dataIndex: ['room', 'status'], width: 88,
      render: (v: string) => {
        const cfg = STATUS_MAP[v] || STATUS_MAP.CLOSED
        return <Tag color={cfg.color} style={{ borderRadius: 6, fontSize: 11 }}>{cfg.label}</Tag>
      },
    },
  ]

  return (
    <div className="me-page">
      <div className="me-container">

        {/* ── Hero Banner：头像 + 基本信息 + 操作按钮 ── */}
        <div className="me-hero">
          <div className="me-hero-avatar">
            <Avatar size={72} src={avatarDataUrl}>
              {!avatarDataUrl ? String(user?.name || 'U')[0] : ''}
            </Avatar>
            {st?.level && (
              <span className="me-level-badge" style={{ background: st.level.color || '#1a4a8a' }}>
                {st.level.name}
              </span>
            )}
          </div>

          <div className="me-hero-info">
            <div className="me-hero-name">{user?.name || '未设置昵称'}</div>
            <div className="me-hero-email">{user?.email}</div>
            {user?.bio && <div className="me-hero-bio">{user.bio}</div>}
            <div className="me-follow-counts" onClick={() => navigate('/feed')}>
              <strong>{followCountsData?.following ?? 0}</strong> 关注
              <span className="me-follow-sep">·</span>
              <strong>{followCountsData?.followers ?? 0}</strong> 粉丝
            </div>
          </div>

          <div className="me-hero-actions">
            <Button
              icon={<EditOutlined />}
              className="me-edit-btn"
              onClick={() => {
                profileForm.setFieldsValue({ name: user?.name || '', email: user?.email || '', bio: user?.bio || '' })
                setAvatarDataUrl(user?.avatar || undefined)
                setAvatarFileList([])
                setEditingProfile(true)
              }}
            >
              编辑资料
            </Button>
            <Button icon={<LockOutlined />} className="me-pwd-btn" onClick={() => setPwdModalOpen(true)}>
              修改密码
            </Button>
          </div>
        </div>

        {/* ── 两列主体 ── */}
        <div className="me-layout">

          {/* 左侧：统计 + 成就 */}
          <aside className="me-sidebar">
            <div className="me-stats-card">
              {statItems.map((item) => (
                <div key={item.label} className="me-stat-item">
                  <span className="me-stat-icon" style={{ color: item.color }}>{item.icon}</span>
                  <div className="me-stat-info">
                    <div className="me-stat-value" style={{ color: item.color }}>{item.value}</div>
                    <div className="me-stat-label">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {(st?.badges || []).length > 0 && (
              <div className="me-badges-card" onClick={() => navigate('/achievements')}>
                <div className="me-card-title">
                  <TrophyOutlined />
                  成就
                  <span style={{ fontSize: 11, color: '#1a4a8a', marginLeft: 4 }}>查看全部 →</span>
                </div>
                <div className="me-badges">
                  {(st.badges || []).map((b: any) => (
                    <span key={b.key} className={`me-badge ${b.achieved ? 'achieved' : ''}`}>{b.name}</span>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* 右侧：案件 + 投票历史 */}
          <main className="me-main">
            <div className="me-tabs-card">
              <Tabs
                className="me-tabs"
                defaultActiveKey="rooms"
                items={[
                  {
                    key: 'rooms',
                    label: `我的案件（${myRooms.length}）`,
                    children: (
                      <Table
                        rowKey="id"
                        loading={myRoomsLoading}
                        dataSource={myRooms}
                        pagination={false}
                        size="small"
                        className="me-table"
                        columns={roomColumns}
                        locale={{ emptyText: '暂无案件' }}
                      />
                    ),
                  },
                  {
                    key: 'votes',
                    label: `投票历史（${myVotes.length}）`,
                    children: (
                      <Table
                        rowKey="id"
                        loading={myVotesLoading}
                        dataSource={myVotes}
                        pagination={{ pageSize: 10, size: 'small', showTotal: (total) => `共 ${total} 条` }}
                        size="small"
                        className="me-table"
                        columns={voteColumns}
                        locale={{ emptyText: '暂无投票记录' }}
                      />
                    ),
                  },
                ]}
              />
            </div>
          </main>
        </div>
      </div>

      {/* 编辑资料弹窗 */}
      <Modal open={editingProfile} onCancel={() => setEditingProfile(false)} onOk={handleSaveProfile}
        okText="保存" cancelText="取消" title="编辑个人资料" width={480}>
        <div className="me-edit-avatar-row">
          <Avatar size={64} src={avatarDataUrl} style={{ background: 'linear-gradient(135deg,#1a4a8a,#0891b2)', fontSize: 22, fontWeight: 900 }}>
            {!avatarDataUrl ? String(user?.name || 'U')[0] : ''}
          </Avatar>
          <Upload.Dragger
            className="me-avatar-dragger"
            multiple={false}
            fileList={avatarFileList}
            beforeUpload={handleAvatarBeforeUpload as any}
            onRemove={() => { setAvatarDataUrl(undefined); setAvatarFileList([]) }}
          >
            <UploadOutlined style={{ fontSize: 18, color: '#1a4a8a' }} />
            <div style={{ fontSize: 12, marginTop: 4, color: '#3a5068' }}>点击或拖拽上传头像</div>
            <div style={{ fontSize: 11, color: '#6b85a0' }}>仅支持图片，小于 200KB</div>
          </Upload.Dragger>
        </div>
        <Divider style={{ margin: '12px 0' }} />
        <Form form={profileForm} layout="vertical">
          <Form.Item name="name" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
            <Input placeholder="输入昵称" maxLength={100} />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input disabled />
          </Form.Item>
          <Form.Item name="bio" label="个人简介">
            <Input.TextArea placeholder="写点自我介绍吧…" rows={3} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal open={pwdModalOpen} onCancel={() => setPwdModalOpen(false)} onOk={handleChangePassword}
        okText="确认修改" cancelText="取消" title="修改密码" width={420}>
        <Form form={pwdForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true, message: '请输入旧密码' }]}>
            <Input.Password placeholder="请输入旧密码" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true }, { min: 6, message: '至少 6 位' }]}>
            <Input.Password placeholder="至少 6 位" />
          </Form.Item>
          <Form.Item name="confirm" label="确认新密码" dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                  return Promise.reject(new Error('两次输入的新密码不一致'))
                },
              }),
            ]}>
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}


export default Me
