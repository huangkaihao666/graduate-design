import React, { useMemo, useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd'
import { SaveOutlined, UploadOutlined, LockOutlined, DeleteOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useAuthStore } from '@/store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as usersApi from '@/api/users'
import * as roomApi from '@/api/rooms'
import './Profile.less'

const { Text } = Typography

const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()

  const userId = user?.id
  const [profileForm] = Form.useForm()
  const [pwdForm] = Form.useForm()

  const [avatarFileList, setAvatarFileList] = useState<UploadFile[]>([])
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(user?.avatar || undefined)
  const [pwdModalOpen, setPwdModalOpen] = useState(false)

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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['me-stats', userId],
    queryFn: () => usersApi.getMyStats(Number(userId)),
    enabled: !!userId,
  })

  const myRooms = (myRoomsResp as any)?.data || []
  const myRoomsSummary = (myRoomsResp as any)?.summary || null
  const myVotes = (myVotesResp as any)?.data || []

  const radarOption = useMemo(() => {
    const radar = (diagnosis as any)?.radar || []
    const indicators = radar.map((r: any) => ({ name: r.name, max: 100 }))
    const values = radar.map((r: any) => r.value)
    return {
      tooltip: {},
      radar: {
        indicator: indicators,
        radius: '65%',
        splitNumber: 4,
        axisName: { color: '#0f172a', fontWeight: 700 },
        splitLine: { lineStyle: { color: ['#e2e8f0'] } },
        splitArea: { areaStyle: { color: ['rgba(99,102,241,0.04)', 'rgba(99,102,241,0.02)'] } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: '画像',
              areaStyle: { color: 'rgba(99,102,241,0.20)' },
              lineStyle: { color: '#667eea', width: 2 },
              itemStyle: { color: '#667eea' },
            },
          ],
        },
      ],
    }
  }, [diagnosis])

  const initProfileForm = () => {
    profileForm.setFieldsValue({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
    })
    setAvatarDataUrl(user?.avatar || undefined)
    setAvatarFileList([])
  }

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsDataURL(file)
    })

  const handleAvatarBeforeUpload = async (file: File) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('只能上传图片文件')
      return Upload.LIST_IGNORE
    }
    const maxSize = 200 * 1024
    if (file.size > maxSize) {
      message.error('图片过大（请小于 200KB）')
      return Upload.LIST_IGNORE
    }
    const url = await fileToDataUrl(file)
    setAvatarDataUrl(url)
    setAvatarFileList([
      {
        uid: file.name,
        name: file.name,
        status: 'done',
        url,
      },
    ])
    return Upload.LIST_IGNORE
  }

  const handleSaveProfile = async () => {
    if (!userId) return
    const values = await profileForm.validateFields()
    const resp = await usersApi.updateProfile(Number(userId), {
      name: values.name,
      bio: values.bio,
      avatar: avatarDataUrl,
    })
    updateUser({
      name: (resp as any)?.name,
      avatar: (resp as any)?.avatar,
      bio: (resp as any)?.bio,
    })
    message.success('个人信息已更新')
  }

  const handleChangePassword = async () => {
    if (!userId) return
    const values = await pwdForm.validateFields()
    await usersApi.updatePassword(Number(userId), {
      oldPassword: values.oldPassword,
      newPassword: values.newPassword,
    })
    message.success('密码修改成功')
    setPwdModalOpen(false)
    pwdForm.resetFields()
  }

  const handleDeleteRoom = async (roomId: number) => {
    Modal.confirm({
      title: '确认删除案件？',
      content: '删除后无法恢复。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await roomApi.deleteRoom(roomId)
        message.success('已删除')
        await refetchMyRooms()
        void queryClient.invalidateQueries({ queryKey: ['case-detail', String(roomId)] })
      },
    })
  }

  if (!userId) {
    return (
      <div className="profile-page">
        <Card className="profile-card">
          <p style={{ textAlign: 'center' }}>未登录</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <Card className="profile-card profile-tabs-card">
        <Tabs
          defaultActiveKey="profile"
          items={[
            {
              key: 'profile',
              label: '资料',
              children: (
                <div className="profile-grid">
                  <Card className="inner-card" title="头像与基本信息" extra={<Button onClick={initProfileForm}>重置</Button>}>
                    <div className="avatar-row">
                      <Avatar size={96} src={avatarDataUrl} style={{ backgroundColor: '#667eea', fontWeight: 900 }}>
                        {!avatarDataUrl ? String(user?.name || 'U')[0] : ''}
                      </Avatar>

                      <Upload.Dragger
                        className="avatar-dragger"
                        multiple={false}
                        fileList={avatarFileList}
                        beforeUpload={handleAvatarBeforeUpload as any}
                        onRemove={() => {
                          setAvatarDataUrl(undefined)
                          setAvatarFileList([])
                        }}
                      >
                        <p className="ant-upload-drag-icon">
                          <UploadOutlined />
                        </p>
                        <p className="ant-upload-text">拖拽图片到这里，或点击上传</p>
                        <p className="ant-upload-hint">仅支持图片，建议小于 200KB</p>
                      </Upload.Dragger>
                    </div>

                    <Divider />

                    <Form
                      form={profileForm}
                      layout="vertical"
                      initialValues={{ name: user?.name || '', email: user?.email || '', bio: user?.bio || '' }}
                    >
                      <Form.Item name="name" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
                        <Input placeholder="输入昵称" maxLength={100} />
                      </Form.Item>
                      <Form.Item name="email" label="邮箱">
                        <Input disabled />
                      </Form.Item>
                      <Form.Item name="bio" label="个人简介 / 签名">
                        <Input.TextArea placeholder="写点自我介绍吧…" rows={4} maxLength={1000} />
                      </Form.Item>
                      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveProfile}>
                          保存
                        </Button>
                        <Button icon={<LockOutlined />} onClick={() => setPwdModalOpen(true)}>
                          修改密码
                        </Button>
                      </Space>
                    </Form>
                  </Card>

                  <Card className="inner-card" title="个人统计">
                    {statsLoading ? (
                      <SkeletonLike />
                    ) : (
                      <Space wrap>
                        <Tag color="blue">发布案件：{(stats as any)?.roomsCount ?? 0}</Tag>
                        <Tag color="green">参与投票：{(stats as any)?.votesCount ?? 0}</Tag>
                        <Tag color="purple">围观量：{(stats as any)?.views ?? 0}</Tag>
                        <Tag color="default">评论量：{(stats as any)?.comments ?? 0}</Tag>
                        <Tag color={(stats as any)?.level?.color || 'default'}>
                          等级：{(stats as any)?.level?.name || '青铜'}
                        </Tag>
                      </Space>
                    )}

                    <Divider />
                    <div>
                      <Text strong>成就</Text>
                      <div style={{ marginTop: 10 }}>
                        <Space wrap>
                          {((stats as any)?.badges || []).map((b: any) => (
                            <Tag key={b.key} color={b.achieved ? 'gold' : 'default'}>
                              {b.name}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    </div>
                  </Card>
                </div>
              ),
            },
            {
              key: 'rooms',
              label: '我的案件',
              children: (
                <Card className="inner-card" title="我发布的案件" extra={myRoomsSummary ? `总发布 ${myRoomsSummary.totalPublished} · 总围观 ${myRoomsSummary.totalViews}` : undefined}>
                  <Table
                    rowKey="id"
                    loading={myRoomsLoading}
                    dataSource={myRooms}
                    pagination={false}
                    columns={[
                      { title: 'ID', dataIndex: 'id', width: 80 },
                      { title: '标题', dataIndex: 'title' },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        width: 110,
                        render: (v: string) => (
                          <Tag color={v === 'LIVE' ? 'blue' : v === 'WAITING' ? 'gold' : 'default'}>
                            {v === 'LIVE' ? '进行中' : v === 'WAITING' ? '待开始' : '已结束'}
                          </Tag>
                        ),
                      },
                      {
                        title: '创建时间',
                        dataIndex: 'createdAt',
                        width: 160,
                        render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
                      },
                      {
                        title: '操作',
                        key: 'actions',
                        width: 120,
                        render: (_: any, record: any) => (
                          <Space>
                            <Button
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteRoom(record.id)}
                            >
                              删除
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Card>
              ),
            },
            {
              key: 'votes',
              label: '投票历史',
              children: (
                <Card className="inner-card" title="我参与投票的案件（按时间倒序）">
                  <Table
                    rowKey="id"
                    loading={myVotesLoading}
                    dataSource={myVotes}
                    pagination={false}
                    columns={[
                      { title: '时间', dataIndex: 'createdAt', width: 170, render: (v: string) => new Date(v).toLocaleString() },
                      { title: '案件', dataIndex: ['room', 'title'] },
                      {
                        title: '我支持',
                        dataIndex: 'agent',
                        width: 220,
                        render: (a: any) => (
                          <Space>
                            <Avatar size={22} src={a?.avatar} />
                            <span>{a?.name || a?.id}</span>
                            {a?.personality && <Tag color="blue">{a.personality}</Tag>}
                          </Space>
                        ),
                      },
                      {
                        title: '案件状态',
                        dataIndex: ['room', 'status'],
                        width: 110,
                        render: (v: string) => (
                          <Tag color={v === 'LIVE' ? 'blue' : v === 'WAITING' ? 'gold' : 'default'}>
                            {v === 'LIVE' ? '进行中' : v === 'WAITING' ? '待开始' : '已结束'}
                          </Tag>
                        ),
                      },
                    ]}
                  />
                </Card>
              ),
            },
            {
              key: 'radar',
              label: '性格诊断',
              children: (
                <Card
                  className="inner-card"
                  title="性格诊断雷达图（基于投票倾向）"
                  extra={<Tag color="purple">投票数 {(diagnosis as any)?.totalVotes ?? 0}</Tag>}
                >
                  {diagnosisLoading ? (
                    <SkeletonLike />
                  ) : (
                    <div className="radar-wrap">
                      <ReactECharts option={radarOption as any} style={{ height: 380 }} />
                      {(diagnosis as any)?.tips && (
                        <div style={{ marginTop: 10, color: '#64748b' }}>{(diagnosis as any).tips}</div>
                      )}
                    </div>
                  )}
                </Card>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={pwdModalOpen}
        onCancel={() => setPwdModalOpen(false)}
        onOk={handleChangePassword}
        okText="确认修改"
        cancelText="取消"
        title="修改密码"
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true, message: '请输入旧密码' }]}>
            <Input.Password placeholder="请输入旧密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '至少 6 位' },
            ]}
          >
            <Input.Password placeholder="至少 6 位" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认新密码"
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

const SkeletonLike = () => (
  <div style={{ padding: 8, color: '#64748b' }}>
    <div style={{ height: 10, background: '#f1f5f9', borderRadius: 6, marginBottom: 10 }} />
    <div style={{ height: 10, background: '#f1f5f9', borderRadius: 6, marginBottom: 10, width: '85%' }} />
    <div style={{ height: 10, background: '#f1f5f9', borderRadius: 6, width: '70%' }} />
  </div>
)

export default Profile
