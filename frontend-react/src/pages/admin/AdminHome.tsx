import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Skeleton } from 'antd'
import ReactECharts from 'echarts-for-react'
import { UserOutlined, AlertOutlined } from '@ant-design/icons'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import * as adminApi from '@/api/admin'
import './AdminHome.less'

// 标签颜色映射（与 DB 的 color 字段对应）
const TAG_PALETTE = [
  '#6366f1','#f97316','#10b981','#3b82f6','#f59e0b',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16','#ef4444',
]

const AdminHome: React.FC = () => {
  const { user } = useAdminAuthStore()
  const navigate = useNavigate()

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.getAdminOverview(),
  })
  const { data: trends } = useQuery({
    queryKey: ['admin-trends'],
    queryFn: () => adminApi.getAdminTrends(14),
  })
  const { data: hotTopics } = useQuery({
    queryKey: ['admin-hot-topics'],
    queryFn: () => adminApi.getAdminHotTopics(8),
  })
  const { data: alertStats } = useQuery({
    queryKey: ['admin-alert-stats'],
    queryFn: () => adminApi.getAdminAlertStats(),
  })
  const { data: tagsData } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: () => adminApi.getAdminTags(),
  })

  const ov = overview as any
  const al = alertStats as any
  const tags: any[] = Array.isArray(tagsData) ? tagsData : []
  const hotRows = useMemo(() => (Array.isArray(hotTopics) ? hotTopics : []), [hotTopics])

  // ── 热门话题横向柱状图 ────────────────────────────────────────
  const hotOption = useMemo(() => {
    const list = hotRows.slice(0, 8)
    // 截断过长标题
    const labels = list.map((r: any) => r.title.length > 12 ? r.title.slice(0, 12) + '…' : r.title)
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'none' },
        backgroundColor: '#faf8f4',
        borderColor: 'rgba(26,22,18,0.1)',
        textStyle: { color: '#1a1612', fontSize: 12 },
        formatter: (params: any[]) => {
          const r = list[params[0].dataIndex]
          return `<b>${r.title}</b><br/>围观 ${r.viewCount} · 弹幕 ${r.danmuCount ?? 0} · 评论 ${r.commentCount} · 投票 ${r.voteCount}`
        },
      },
      grid: { left: 10, right: 44, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        data: labels,
        inverse: true,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#6b6459', fontSize: 11, fontWeight: 600 },
      },
      series: [
        {
          name: '围观',
          type: 'bar',
          stack: 'hot',
          data: list.map((r: any) => r.viewCount),
          barWidth: 14,
          itemStyle: { color: '#6366f1' },
          label: { show: false },
        },
        {
          name: '弹幕',
          type: 'bar',
          stack: 'hot',
          data: list.map((r: any) => r.danmuCount ?? 0),
          itemStyle: { color: '#3b82f6' },
          label: { show: false },
        },
        {
          name: '评论',
          type: 'bar',
          stack: 'hot',
          data: list.map((r: any) => r.commentCount),
          itemStyle: { color: '#10b981' },
          label: { show: false },
        },
        {
          name: '投票',
          type: 'bar',
          stack: 'hot',
          data: list.map((r: any) => r.voteCount),
          itemStyle: { color: '#f59e0b', borderRadius: [0, 6, 6, 0] },
          label: {
            show: true,
            position: 'right',
            color: '#b0a89c',
            fontSize: 11,
            fontWeight: 700,
            formatter: (p: any) => {
              const r = list[p.dataIndex]
              return (r.viewCount ?? 0) + (r.danmuCount ?? 0) + (r.commentCount ?? 0) + (r.voteCount ?? 0)
            },
          },
        },
      ],
    }
  }, [hotRows])

  // ── 4 个核心数字 ─────────────────────────────────────────────
  const coreStats = [
    { label: '注册用户', value: ov?.totalUsers ?? 0, sub: `今日 +${ov?.todayUsers ?? 0}`, color: '#6366f1' },
    { label: '辩论案件', value: ov?.totalRooms ?? 0, sub: `进行中 ${ov?.liveRooms ?? 0}`, color: '#f97316', badge: (ov?.liveRooms ?? 0) > 0 },
    { label: '总投票数', value: ov?.totalVotes ?? 0, sub: `今日 +${ov?.todayVotes ?? 0}`, color: '#10b981' },
    { label: '未处理预警', value: al?.totalUnhandled ?? 0, sub: al?.highCount > 0 ? `高风险 ${al.highCount} 条` : '暂无高风险', color: (al?.totalUnhandled ?? 0) > 0 ? '#ef4444' : '#b0a89c', onClick: () => navigate('/admin/emotion-alerts') },
  ]

  // ── 趋势折线图 ────────────────────────────────────────────────
  const trendOption = useMemo(() => {
    const list = Array.isArray(trends) ? trends : []
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#faf8f4', borderColor: 'rgba(26,22,18,0.1)', textStyle: { color: '#1a1612', fontSize: 12 } },
      legend: { data: ['新增案件', '新增用户', '新增投票'], bottom: 0, textStyle: { color: '#6b6459', fontSize: 11 } },
      grid: { left: 36, right: 16, top: 12, bottom: 44 },
      xAxis: {
        type: 'category',
        data: list.map((i: any) => i.date?.slice(5)),
        axisLabel: { fontSize: 11, color: '#b0a89c' },
        axisLine: { lineStyle: { color: 'rgba(26,22,18,0.1)' } },
        axisTick: { show: false },
      },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#b0a89c', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(26,22,18,0.06)' } } },
      series: [
        { name: '新增案件', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: list.map((i: any) => i.rooms ?? 0), areaStyle: { color: 'rgba(99,102,241,0.07)' }, lineStyle: { color: '#6366f1', width: 2 }, itemStyle: { color: '#6366f1' } },
        { name: '新增用户', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: list.map((i: any) => i.users ?? 0), areaStyle: { color: 'rgba(16,185,129,0.07)' }, lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981' } },
        { name: '新增投票', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: list.map((i: any) => i.votes ?? 0), areaStyle: { color: 'rgba(245,158,11,0.07)' }, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
      ],
    }
  }, [trends])

  // ── 案件标签分布 → 玫瑰图（南丁格尔）────────────────────────
  const tagOption = useMemo(() => {
    const sorted = [...tags].filter(t => t.roomCount > 0).sort((a, b) => b.roomCount - a.roomCount).slice(0, 10)
    if (sorted.length === 0) return null
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#faf8f4',
        borderColor: 'rgba(26,22,18,0.1)',
        textStyle: { color: '#1a1612', fontSize: 12 },
        formatter: (p: any) => `<b>${p.name}</b><br/>${p.value} 个案件 · ${p.percent}%`,
      },
      legend: { show: false },
      series: [{
        type: 'pie',
        radius: ['18%', '80%'],
        center: ['50%', '52%'],
        roseType: 'area',
        itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,253,249,0.9)' },
        label: {
          show: true,
          formatter: '{b}\n{c}',
          fontSize: 10,
          fontWeight: 600,
          color: '#6b6459',
          lineHeight: 15,
        },
        labelLine: { length: 6, length2: 8, smooth: true },
        emphasis: { scale: true, scaleSize: 5, itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.12)' } },
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDuration: 900,
        data: sorted.map((t, i) => ({
          name: t.name,
          value: t.roomCount,
          itemStyle: { color: t.color || TAG_PALETTE[i % TAG_PALETTE.length] },
        })),
      }],
    }
  }, [tags])

  // ── 运营数据 → 雷达图 ────────────────────────────────────────
  const opsOption = useMemo(() => {
    const danmu   = ov?.totalDanmu ?? 0
    const comment = ov?.totalComments ?? 0
    const banned  = ov?.bannedUsers ?? 0
    const pending = ov?.pendingAgents ?? 0
    const announce= ov?.totalAnnouncements ?? 0
    const weekUser= ov?.weekUsers ?? 0
    // 各维度最大值：取实际值的 1.5 倍作为轴最大值，至少为 1 避免除零
    const maxVal = (v: number) => Math.max(Math.ceil(v * 1.5), 1)
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#faf8f4',
        borderColor: 'rgba(26,22,18,0.1)',
        textStyle: { color: '#1a1612', fontSize: 12 },
      },
      radar: {
        center: ['50%', '52%'],
        radius: '70%',
        axisName: { color: '#6b6459', fontSize: 11, fontWeight: 700 },
        splitLine: { lineStyle: { color: 'rgba(26,22,18,0.07)' } },
        splitArea: { areaStyle: { color: ['rgba(26,22,18,0.015)', 'rgba(26,22,18,0.03)'] } },
        axisLine: { lineStyle: { color: 'rgba(26,22,18,0.1)' } },
        indicator: [
          { name: '弹幕', max: maxVal(danmu) },
          { name: '评论', max: maxVal(comment) },
          { name: '本周新用户', max: maxVal(weekUser) },
          { name: '系统公告', max: maxVal(announce) },
          { name: '待审智能体', max: maxVal(pending) },
          { name: '封禁账号', max: maxVal(banned) },
        ],
      },
      series: [{
        type: 'radar',
        data: [{
          value: [danmu, comment, weekUser, announce, pending, banned],
          name: '运营数据',
          symbol: 'circle',
          symbolSize: 5,
          itemStyle: { color: '#6366f1' },
          lineStyle: { color: '#6366f1', width: 2 },
          areaStyle: { color: 'rgba(99,102,241,0.12)' },
        }],
        animationDuration: 800,
      }],
    }
  }, [ov])

  return (
    <div className="ah-page">

      {/* ── 头部 Banner ── */}
      <div className="ah-banner">
        <div className="ah-banner-inner">
          <div>
            <h2 className="ah-banner-title">数据概览</h2>
            <p className="ah-banner-sub">平台运营核心指标一览</p>
          </div>
          <div className="ah-banner-right">
            <Avatar size={30} src={(user as any)?.avatar} icon={<UserOutlined />} style={{ background: '#e8e4dc' }} />
            <div>
              <div className="ah-banner-username">{(user as any)?.name || (user as any)?.email}</div>
              <div className="ah-banner-role">管理员</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 未处理预警提示条 ── */}
      {(al?.totalUnhandled ?? 0) > 0 && (
        <div className="ah-alert-strip" onClick={() => navigate('/admin/emotion-alerts')}>
          <AlertOutlined style={{ color: '#dc2626', fontSize: 14 }} />
          <span>当前有 <strong>{al.totalUnhandled}</strong> 条情绪预警待处理{al.highCount > 0 && <>，其中 <strong style={{ color: '#dc2626' }}>{al.highCount}</strong> 条高风险</>}</span>
          <span className="ah-alert-strip-link">立即处理 →</span>
        </div>
      )}

      {/* ── 4 个核心数字 ── */}
      <div className="ah-core-row">
        {ovLoading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="ah-core-card"><Skeleton active paragraph={{ rows: 1 }} /></div>)
          : coreStats.map((c) => (
            <div key={c.label}
              className={`ah-core-card ${c.onClick ? 'ah-core-card--link' : ''}`}
              style={{ '--core-color': c.color } as React.CSSProperties}
              onClick={c.onClick}
            >
              {c.badge && <span className="ah-core-live-dot" />}
              <div className="ah-core-value" style={{ color: c.color }}>{c.value}</div>
              <div className="ah-core-label">{c.label}</div>
              <div className="ah-core-sub">{c.sub}</div>
            </div>
          ))
        }
      </div>

      {/* ── 图表三列 ── */}
      <div className="ah-charts-grid">

        {/* 近14天趋势（宽） */}
        <div className="ah-chart-card ah-chart-card--span2">
          <div className="ah-chart-hd"><h3 className="ah-chart-title">近 14 天趋势</h3></div>
          <div className="ah-chart-body">
            <ReactECharts option={trendOption as any} style={{ height: 240 }} opts={{ renderer: 'svg' }} />
          </div>
        </div>

        {/* 案件标签分布 */}
        <div className="ah-chart-card">
          <div className="ah-chart-hd">
            <h3 className="ah-chart-title">案件标签分布</h3>
            <span className="ah-chart-sub">按话题类型</span>
          </div>
          <div className="ah-chart-body">
            {!tagOption
              ? <div className="ah-chart-empty">暂无标签数据</div>
              : <ReactECharts option={tagOption as any} style={{ height: 240 }} opts={{ renderer: 'svg' }} />
            }
          </div>
        </div>

        {/* 运营数据 */}
        <div className="ah-chart-card">
          <div className="ah-chart-hd">
            <h3 className="ah-chart-title">运营数据</h3>
            <span className="ah-chart-sub">内容 & 用户</span>
          </div>
          <div className="ah-chart-body">
            {ovLoading
              ? <div className="ah-chart-empty"><Skeleton active paragraph={{ rows: 4 }} /></div>
              : <ReactECharts option={opsOption as any} style={{ height: 240 }} opts={{ renderer: 'svg' }} />
            }
          </div>
        </div>

        {/* 案件状态环形 */}
        <div className="ah-chart-card">
          <div className="ah-chart-hd">
            <h3 className="ah-chart-title">案件状态</h3>
            <span className="ah-chart-sub">实时分布</span>
          </div>
          <div className="ah-chart-body">
            {(ov?.totalRooms ?? 0) === 0
              ? <div className="ah-chart-empty">暂无案件</div>
              : <ReactECharts
                  opts={{ renderer: 'svg' }}
                  style={{ height: 240 }}
                  option={{
                    backgroundColor: 'transparent',
                    tooltip: { trigger: 'item', backgroundColor: '#faf8f4', borderColor: 'rgba(26,22,18,0.1)', textStyle: { color: '#1a1612', fontSize: 12 }, formatter: (p: any) => `${p.name}<br/>${p.value} 个 · ${p.percent}%` },
                    legend: { show: false },
                    series: [{
                      type: 'pie', radius: ['44%', '70%'], center: ['50%', '50%'],
                      avoidLabelOverlap: true,
                      itemStyle: { borderWidth: 2, borderColor: 'transparent' },
                      label: { show: true, position: 'outside', formatter: '{b}\n{d}%', fontSize: 11, fontWeight: 700, color: '#6b6459', lineHeight: 16 },
                      labelLine: { length: 8, length2: 10, smooth: true },
                      emphasis: { scale: true, scaleSize: 5 },
                      animationType: 'scale', animationEasing: 'elasticOut', animationDuration: 800,
                      data: [
                        { value: ov?.liveRooms ?? 0,    name: '进行中', itemStyle: { color: '#3b82f6' } },
                        { value: ov?.waitingRooms ?? 0, name: '待开始', itemStyle: { color: '#f59e0b' } },
                        { value: ov?.closedRooms ?? 0,  name: '已结案', itemStyle: { color: '#10b981' } },
                      ].filter(d => d.value > 0),
                    }],
                  }}
                />
            }
          </div>
        </div>

        {/* 热门话题横向堆叠柱状图 */}
        <div className="ah-chart-card">
          <div className="ah-chart-hd">
            <h3 className="ah-chart-title">热门话题</h3>
            <span className="ah-chart-sub">围观 · 弹幕 · 评论 · 投票</span>
          </div>
          <div className="ah-chart-body">
            {hotRows.length === 0
              ? <div className="ah-chart-empty">暂无话题数据</div>
              : <ReactECharts option={hotOption as any} style={{ height: 240 }} opts={{ renderer: 'svg' }} />
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminHome
