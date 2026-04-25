import React, { useState } from 'react'
import {
  Button, ColorPicker, Form, Input, InputNumber, Modal, Popconfirm,
  Space, Tag, message, Skeleton, Empty,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, TagsOutlined, FireOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '@/api/admin'
import './TagsAdmin.less'

const TagsAdmin: React.FC = () => {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [modal, setModal] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: adminApi.getAdminTags,
  })
  const tags: any[] = (data as any) ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-tags'] })

  const createMutation = useMutation({
    mutationFn: adminApi.createAdminTag,
    onSuccess: () => { message.success('标签已创建'); closeModal(); invalidate() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.updateAdminTag(id, data),
    onSuccess: () => { message.success('标签已更新'); closeModal(); invalidate() },
  })

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteAdminTag,
    onSuccess: () => { message.success('已删除'); invalidate() },
  })

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ color: '#6366F1', weight: 0 })
    setModal({ open: true, editing: null })
  }

  const openEdit = (tag: any) => {
    form.setFieldsValue({ name: tag.name, color: tag.color, weight: tag.weight })
    setModal({ open: true, editing: tag })
  }

  const closeModal = () => setModal({ open: false, editing: null })

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const color = typeof values.color === 'string' ? values.color : values.color?.toHexString?.() ?? '#6366F1'
    if (modal.editing) {
      updateMutation.mutate({ id: modal.editing.id, data: { ...values, color } })
    } else {
      createMutation.mutate({ ...values, color })
    }
  }

  const maxRoomCount = Math.max(...tags.map((t) => t.roomCount ?? 0), 1)

  return (
    <div className="ta-page">
      {/* ── Banner ── */}
      <div className="ta-banner">
        <div className="ta-banner-bg" />
        <div className="ta-banner-content">
          <div className="ta-banner-left">
            <div className="ta-banner-icon"><TagsOutlined /></div>
            <div>
              <div className="ta-banner-title">话题标签管理</div>
              <div className="ta-banner-sub">管理辩论广场的话题分类标签，标签热度影响案件曝光排序</div>
            </div>
          </div>
          <Button
            className="ta-create-btn"
            icon={<PlusOutlined />}
            onClick={openCreate}
          >
            新建标签
          </Button>
        </div>
      </div>

      {/* ── 标签网格 ── */}
      {isLoading ? (
        <div className="ta-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="ta-card ta-card-skeleton">
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div className="ta-empty">
          <Empty
            image={<TagsOutlined style={{ fontSize: 56, color: '#c7d2fe' }} />}
            description={<span style={{ color: '#94a3b8' }}>暂无话题标签，点击上方按钮创建</span>}
          />
        </div>
      ) : (
        <div className="ta-grid">
          {tags.map((tag: any) => {
            const barWidth = Math.max(Math.round((tag.roomCount / maxRoomCount) * 100), 4)
            return (
              <div key={tag.id} className="ta-card">
                <div className="ta-card-top">
                  <Tag
                    color={tag.color}
                    className="ta-tag-preview"
                  >
                    {tag.name}
                  </Tag>
                  <Space size={4}>
                    <button className="ta-icon-btn" onClick={() => openEdit(tag)} title="编辑">
                      <EditOutlined />
                    </button>
                    <Popconfirm
                      title="确认删除该标签？关联案件的标签也会同步移除。"
                      onConfirm={() => deleteMutation.mutate(tag.id)}
                      okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
                    >
                      <button className="ta-icon-btn ta-icon-btn-danger" title="删除">
                        <DeleteOutlined />
                      </button>
                    </Popconfirm>
                  </Space>
                </div>

                <div className="ta-card-stats">
                  <div className="ta-stat-row">
                    <FireOutlined style={{ color: tag.color, fontSize: 13 }} />
                    <span className="ta-stat-label">关联案件</span>
                    <span className="ta-stat-val" style={{ color: tag.color }}>{tag.roomCount}</span>
                  </div>
                  <div className="ta-bar-track">
                    <div
                      className="ta-bar-fill"
                      style={{ width: `${barWidth}%`, background: tag.color }}
                    />
                  </div>
                </div>

                <div className="ta-card-footer">
                  <div className="ta-color-dot" style={{ background: tag.color }} />
                  <span className="ta-color-hex">{tag.color}</span>
                  <span className="ta-weight">权重 {tag.weight}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 编辑/创建弹窗 ── */}
      <Modal
        open={modal.open}
        title={
          <Space>
            <TagsOutlined style={{ color: '#6366F1' }} />
            <span>{modal.editing ? '编辑标签' : '新建标签'}</span>
          </Space>
        }
        onCancel={closeModal}
        onOk={handleSubmit}
        okText={modal.editing ? '保存' : '创建'}
        cancelText="取消"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={440}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="name" label="标签名称" rules={[{ required: true, message: '请输入标签名称' }]}>
            <Input placeholder="如：职场困惑、感情问题" maxLength={20} showCount />
          </Form.Item>
          <Form.Item name="color" label="标签颜色">
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item name="weight" label="权重（数值越大越靠前展示）">
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TagsAdmin
