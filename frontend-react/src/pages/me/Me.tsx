import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar, Button, Divider, Form, Input, Modal,
  Space, Table, Tag, Upload, message, Tabs,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  ArrowLeftOutlined, LockOutlined,
  DeleteOutlined, UploadOutlined, FileTextOutlined,
  LikeOutlined, EyeOutlined, CommentOutlined,
  TrophyOutlined, EditOutlined, TeamOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useAuthStore } from '@/store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as usersApi from '@/api/users'
import * as roomApi from '@/api/rooms'
import './Me.less'

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
    queryFn: () => usersApi.getMyRooms(Number(userId), { page: 1, pageSize: 20 }),
    enabled: !!userId,
  })
  const { data: myVotesResp, isLoading: myVotesLoading } = useQuery({
    queryKey: ['me-votes', userId],
    queryFn: () => usersApi.getMyVotes(Number(userId), { page: 1, pageSize: 50 }),
    enabled: !!userId,
  })
  const { data: diagnosis, isLoading: diagnosisLoading } = useQuery({
    queryKey: ['me-diagnosis', userId],
    queryFn: () => usersApi.getMyDiagnosis(Number(userId)),
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

  const radarOption = useMemo(() => {
    const radar = (diagnosis as any)?.radar || []
    if (!radar.length) return null
    return {
      tooltip: {},
      radar: {
        indicator: radar.map((r: any) => ({ name: r.name, max: 100 })),
        radius: '65%',
        splitNumber: 4,
        axisName: { color: 'var(--text-secondary)', fontWeight: 700, fontSize: 12 },
        splitLine: { lineStyle: { color: ['var(--border-color)'] } },
        splitArea: { areaStyle: { color: ['rgba(99,102,241,0.04)', 'rgba(99,102,241,0.02)'] } },
      },
      series: [{
        type: 'radar',
        data: [{
          value: radar.map((r: any) => r.value),
          name: '画像',
          areaStyle: { color: 'rgba(99,102,241,0.18)' },
          lineStyle: { color: '#6366F1', width: 2 },
          itemStyle: { color: '#6366F1' },
        }],
      }],
    }
  }, [diagnosis])

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

  const statItems = [
    { icon: <FileTextOutlined />, label: '发布案件', value: st?.roomsCount ?? 0, color: '#6366F1' },
    { icon: <LikeOutlined />, label: '参与投票', value: st?.votesCount ?? 0, color: '#10B981' },
    { icon: <EyeOutlined />, label: '总围观量', value: st?.views ?? 0, color: '#3B82F6' },
    { icon: <CommentOutlined />, label: '评论数', value: st?.comments ?? 0, color: '#F59E0B' },
  ]

  return (
    <div className="me-page">
      <div className="me-container">
        {/* 返回 */}
        <div className="me-back-row">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/cases')} className="me-back-btn">
            返回案件列表
          </Button>
        </div>

        <div className="me-layout">
          {/* ── 左侧用户卡 ── */}
          <aside className="me-sidebar">
            {/* 头像 + 基本信息 */}
            <div className="me-user-card">
              <div className="me-avatar-wrap">
                <Avatar size={80} src={avatarDataUrl} className="me-avatar">
                  {!avatarDataUrl ? String(user?.name || 'U')[0] : ''}
                </Avatar>
                {st?.level && (
                  <span className="me-level-badge" style={{ background: st.level.color || '#6366F1' }}>
                    {st.level.name}
                  </span>
                )}
              </div>
              <div className="me-user-name">{user?.name || '未设置昵称'}</div>
              <div className="me-user-email">{user?.email}</div>
              {user?.bio && <div className="me-user-bio">{user.bio}</div>}

              <div className="me-follow-counts" onClick={() => navigate('/feed')}>
                <span className="me-follow-item">
                  <strong>{followCountsData?.following ?? 0}</strong> 关注
                </span>
                <span className="me-follow-sep">·</span>
                <span className="me-follow-item">
                  <strong>{followCountsData?.followers ?? 0}</strong> 粉丝
                </span>
              </div>

              <Button
                block
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
              <Button block icon={<LockOutlined />} className="me-pwd-btn" onClick={() => setPwdModalOpen(true)}>
                修改密码
              </Button>
            </div>

            {/* 数据统计 */}
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

            {/* 成就徽章 */}
            {((st?.badges || []).length > 0) && (
              <div className="me-badges-card">
                <div className="me-card-title"><TrophyOutlined /> 成就</div>
                <div className="me-badges">
                  {(st.badges || []).map((b: any) => (
                    <span key={b.key} className={`me-badge ${b.achieved ? 'achieved' : ''}`}>{b.name}</span>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ── 右侧内容区 ── */}
          <main className="me-main">
            <div className="me-tabs-card">
              <Tabs
                defaultActiveKey="rooms"
                className="me-tabs"
                items={[
                  {
                    key: 'rooms',
                    label: `我的案件 (${myRooms.length})`,
                    children: (
                      <Table
                        rowKey="id"
                        loading={myRoomsLoading}
                        dataSource={myRooms}
                        pagination={false}
                        size="small"
                        className="me-table"
                        columns={[
                          { title: 'ID', dataIndex: 'id', width: 60 },
                          { title: '标题', dataIndex: 'title', ellipsis: true },
                          {
                            title: '状态', dataIndex: 'status', width: 90,
                            render: (v: string) => (
                              <Tag color={v === 'LIVE' ? 'blue' : v === 'WAITING' ? 'gold' : 'default'}>
                                {v === 'LIVE' ? '进行中' : v === 'WAITING' ? '待开始' : '已结束'}
                              </Tag>
                            ),
                          },
                          {
                            title: '创建时间', dataIndex: 'createdAt', width: 150,
                            render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
                          },
                          {
                            title: '操作', key: 'actions', width: 80,
                            render: (_: any, record: any) => (
                              <Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteRoom(record.id)} />
                            ),
                          },
                        ]}
                      />
                    ),
                  },
                  {
                    key: 'votes',
                    label: `投票历史 (${myVotes.length})`,
                    children: (
                      <Table
                        rowKey="id"
                        loading={myVotesLoading}
                        dataSource={myVotes}
                        pagination={false}
                        size="small"
                        className="me-table"
                        columns={[
                          {
                            title: '时间', dataIndex: 'createdAt', width: 150,
                            render: (v: string) => new Date(v).toLocaleString('zh-CN'),
                          },
                          { title: '案件', dataIndex: ['room', 'title'], ellipsis: true },
                          {
                            title: '我支持', dataIndex: 'agent', width: 180,
                            render: (a: any) => (
                              <Space size={6}>
                                <Avatar size={20} src={a?.avatar} />
                                <span>{a?.name || a?.id}</span>
                                {a?.personality && <Tag color="blue" style={{ fontSize: 11 }}>{a.personality}</Tag>}
                              </Space>
                            ),
                          },
                          {
                            title: '案件状态', dataIndex: ['room', 'status'], width: 90,
                            render: (v: string) => (
                              <Tag color={v === 'LIVE' ? 'blue' : v === 'WAITING' ? 'gold' : 'default'}>
                                {v === 'LIVE' ? '进行中' : v === 'WAITING' ? '待开始' : '已结束'}
                              </Tag>
                            ),
                          },
                        ]}
                      />
                    ),
                  },
                  {
                    key: 'radar',
                    label: '性格诊断',
                    children: (
                      <div className="me-radar-wrap">
                        {diagnosisLoading ? (
                          <div className="me-loading">加载中…</div>
                        ) : !radarOption ? (
                          <div className="me-empty-radar">
                            <div className="me-empty-icon">🧠</div>
                            <div>参与投票后即可生成性格诊断</div>
                          </div>
                        ) : (
                          <>
                            <ReactECharts option={radarOption} style={{ height: 360 }} />
                            {(diagnosis as any)?.tips && (
                              <div className="me-radar-tips">{(diagnosis as any).tips}</div>
                            )}
                          </>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </main>
        </div>
      </div>

      {/* 编辑资料弹窗 */}
      <Modal
        open={editingProfile}
        onCancel={() => setEditingProfile(false)}
        onOk={handleSaveProfile}
        okText="保存"
        cancelText="取消"
        title="编辑个人资料"
        width={480}
      >
        <div className="me-edit-avatar-row">
          <Avatar size={64} src={avatarDataUrl} className="me-avatar">
            {!avatarDataUrl ? String(user?.name || 'U')[0] : ''}
          </Avatar>
          <Upload.Dragger
            className="me-avatar-dragger"
            multiple={false}
            fileList={avatarFileList}
            beforeUpload={handleAvatarBeforeUpload as any}
            onRemove={() => { setAvatarDataUrl(undefined); setAvatarFileList([]) }}
          >
            <UploadOutlined style={{ fontSize: 18, color: 'var(--color-primary)' }} />
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-secondary)' }}>点击或拖拽上传头像</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>仅支持图片，小于 200KB</div>
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
      <Modal
        open={pwdModalOpen}
        onCancel={() => setPwdModalOpen(false)}
        onOk={handleChangePassword}
        okText="确认修改"
        cancelText="取消"
        title="修改密码"
        width={420}
      >
        <Form form={pwdForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true, message: '请输入旧密码' }]}>
            <Input.Password placeholder="请输入旧密码" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true }, { min: 6, message: '至少 6 位' }]}>
            <Input.Password placeholder="至少 6 位" />
          </Form.Item>
          <Form.Item
            name="confirm" label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                  return Promise.reject(new Error('两次输入的新密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Me
