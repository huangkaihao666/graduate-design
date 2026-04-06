<template>
  <div class="page">
    <div class="profile-layout">
      <aside class="profile-sider">
        <nav class="sider-nav" aria-label="个人中心">
          <button
            v-for="item in sidebarItems"
            :key="item.key"
            type="button"
            class="sider-link"
            :class="{ active: profileNav.section === item.key }"
            @click="profileNav.section = item.key"
          >
            {{ item.label }}
          </button>
        </nav>
      </aside>

      <div class="profile-main" role="main">
        <a-alert
          v-if="approvalBanner && profileNav.section === 'profile'"
          :type="approvalBanner.type as any"
          show-icon
          class="approval-alert"
        >
          <template #message>{{ approvalBanner.title }}</template>
          <template #description>
            <div>{{ approvalBanner.desc }}</div>
            <div
              v-if="approvalBanner.showSubmit && approvalProfileMissing.length"
              class="approval-missing-tip"
            >
              暂不可提交：请先点击「保存」将资料同步到服务器，并补充：{{
                approvalProfileMissing.join('、')
              }}
            </div>
            <a-button
              v-if="approvalBanner.showSubmit"
              type="primary"
              size="small"
              class="pill"
              :loading="submitApprovalLoading"
              :disabled="submitApprovalLoading || approvalProfileMissing.length > 0"
              style="margin-top: 10px"
              @click="submitApproval"
            >
              提交管理员审核
            </a-button>
          </template>
        </a-alert>

        <div v-show="profileNav.section === 'profile'" class="panel profile-panel">
          <div class="panel-h">
            <div class="panel-title profile-edit-heading">个人资料</div>
            <a-button type="primary" class="pill" :loading="saving" @click="save">保存</a-button>
          </div>
          <a-form layout="vertical" class="profile-edit-form">
            <a-row :gutter="[20, 16]" align="top" class="avatar-title-row">
              <a-col :xs="24" :lg="15">
                <a-form-item label="头像">
                  <div class="upload-row">
                    <a-upload
                      accept="image/*"
                      :show-upload-list="false"
                      :custom-request="handleAvatarUpload"
                    >
                      <a-button :loading="uploadingAvatar">
                        <template #icon><UploadOutlined /></template>
                        从本机选择并上传
                      </a-button>
                    </a-upload>
                    <span class="upload-hint">支持常见图片格式，单张不超过 5MB</span>
                  </div>
                  <div v-if="form.avatar" class="avatar-preview">
                    <a-image
                      :src="form.avatar"
                      :width="96"
                      :height="96"
                      style="object-fit: cover; border-radius: 8px"
                    />
                    <a-button type="link" danger size="small" @click="form.avatar = ''"
                      >清除头像</a-button
                    >
                  </div>
                  <a-input
                    v-model:value="form.avatar"
                    placeholder="或直接粘贴图片链接（与上传二选一或补充）"
                    allow-clear
                    class="avatar-url-fallback"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :lg="9">
                <a-form-item label="头衔">
                  <div class="title-readonly-box">
                    <span class="title-readonly">{{ mineTitleDisplay }}</span>
                  </div>
                  <div class="title-readonly-hint">
                    由管理员在后台设置；如需修改请联系门店管理员。
                  </div>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="姓名">
                  <a-input v-model:value="form.name" class="pill-input" placeholder="请输入姓名" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="职位">
                  <a-select v-model:value="form.role" class="pill-input">
                    <a-select-option value="photographer">摄影师</a-select-option>
                    <a-select-option value="makeup">妆造师</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="联系方式">
                  <a-input
                    v-model:value="form.phone"
                    class="pill-input"
                    placeholder="手机号/微信均可"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="性别">
                  <a-select
                    v-model:value="form.gender"
                    allow-clear
                    class="pill-input"
                    placeholder="可选"
                  >
                    <a-select-option value="男">男</a-select-option>
                    <a-select-option value="女">女</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="年龄">
                  <a-input-number
                    v-model:value="form.age"
                    :min="18"
                    :max="80"
                    style="width: 100%"
                    placeholder="可选"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="从业年限（年）">
                  <a-input-number
                    v-model:value="form.yearsExperience"
                    :min="0"
                    :max="60"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="擅长风格">
              <a-textarea
                v-model:value="form.style"
                :rows="2"
                placeholder="如：清透韩系 / 复古胶片 / 法式浪漫"
              />
            </a-form-item>
            <a-form-item label="擅长题材">
              <a-textarea
                v-model:value="form.specialtyTopics"
                :rows="1"
                placeholder="如：婚纱旅拍、亲子、商业形象"
              />
            </a-form-item>
            <a-form-item label="资质与获奖">
              <a-textarea
                v-model:value="form.awards"
                :rows="1"
                placeholder="如：协会会员、比赛奖项、平台认证等"
              />
            </a-form-item>
            <a-form-item label="个人简介">
              <a-textarea
                v-model:value="form.bio"
                :rows="3"
                placeholder="介绍你的风格、经验、服务流程等"
              />
            </a-form-item>
            <a-form-item label="档期说明">
              <a-textarea
                v-model:value="form.scheduleNote"
                :rows="2"
                placeholder="例如：每周二店休；节假日可约"
              />
            </a-form-item>
            <a-form-item label="可预约日期">
              <div class="title-readonly-box">
                <p class="schedule-dates-hint">
                  请移步去<router-link to="/worker/schedule" class="schedule-dates-link"
                    >档期管理</router-link
                  >页面设置预约日期
                </p>
              </div>
            </a-form-item>
            <a-form-item label="上传作品">
              <div class="title-readonly-box">
                <p class="schedule-dates-hint">
                  请移步去<router-link to="/worker/portfolio" class="schedule-dates-link"
                    >作品管理</router-link
                  >页面上传作品
                </p>
              </div>
            </a-form-item>
          </a-form>
        </div>

        <div v-show="profileNav.section === 'security'" class="panel security-panel">
          <div class="security-panel-head">
            <div class="panel-title">账号安全</div>
            <p class="security-lead">
              保护账号与接单信息安全。建议定期更新密码，并绑定本人常用手机号以便找回与通知。
            </p>
          </div>

          <div class="security-status-row" aria-label="安全项状态">
            <div class="security-status-chip ok">
              <CheckCircleFilled class="security-status-ico" />
              <span class="security-status-label">登录密码</span>
              <span class="security-status-val">已设置</span>
            </div>
            <div class="security-status-chip" :class="authStore.user?.phone ? 'ok' : 'pending'">
              <CheckCircleFilled v-if="authStore.user?.phone" class="security-status-ico" />
              <MobileOutlined v-else class="security-status-ico muted" />
              <span class="security-status-label">手机号</span>
              <span class="security-status-val">{{
                authStore.user?.phone ? `已绑定 ${authStore.user.phone}` : '未绑定'
              }}</span>
            </div>
          </div>

          <div class="security-cards">
            <div class="security-card">
              <div class="security-card-top">
                <div class="security-card-icon" aria-hidden="true">
                  <LockOutlined />
                </div>
                <div class="security-card-text">
                  <div class="security-card-title">登录密码</div>
                  <p class="security-card-desc">
                    用于工作台登录验证。若曾在公共或他人设备登录，建议尽快修改并避免与他人共用密码。
                  </p>
                </div>
              </div>
              <a-button type="primary" class="pill security-card-btn" block @click="changePassword">
                修改密码
              </a-button>
            </div>

            <div class="security-card">
              <div class="security-card-top">
                <div class="security-card-icon security-card-icon-phone" aria-hidden="true">
                  <MobileOutlined />
                </div>
                <div class="security-card-text">
                  <div class="security-card-title">绑定手机号</div>
                  <p class="security-card-desc">
                    绑定后可接收订单与平台重要通知，并作为账号安全校验方式之一。每个账号仅支持绑定一个手机号。
                  </p>
                </div>
              </div>
              <a-button type="primary" class="pill security-card-btn" block @click="bindPhone">
                {{ authStore.user?.phone ? '更换绑定手机号' : '立即绑定手机号' }}
              </a-button>
            </div>
          </div>

          <div class="security-hints">
            <div class="security-hints-title">安全小贴士</div>
            <ul class="security-hints-list">
              <li>不要将密码告诉他人或在非官方页面输入账号信息。</li>
              <li>绑定手机号后，若更换号码请及时在本页更新，避免错过订单消息。</li>
              <li>发现异常登录或订单变动，请优先修改密码并联系门店管理员。</li>
            </ul>
          </div>
        </div>

        <div
          v-show="profileNav.section === 'fixed-makeup' && form.role === 'photographer'"
          class="panel fixed-makeup-panel"
        >
          <div class="fixed-makeup-head">
            <div class="panel-title">固定合作妆造师</div>
            <p class="fixed-makeup-lead">
              你可绑定<strong>多位</strong>妆造师；当用户下单<strong>未指定妆造师</strong>且由你主拍时，平台按列表顺序依次尝试将妆造分配给<strong>已确认</strong>的搭档（前者不可约时自动试下一位）；未绑定或均不可约时由系统匹配。每位搭档需单独发起邀请并由对方在「合作邀请」中确认。
            </p>
          </div>

          <div class="fixed-makeup-status-row" aria-label="绑定状态">
            <div class="fixed-makeup-chip ok">
              <TeamOutlined class="fixed-makeup-chip-ico" />
              <span class="fixed-makeup-chip-label">已生效</span>
              <span class="fixed-makeup-chip-val">{{ photogCoopConfirmedCount }} 人</span>
            </div>
            <div class="fixed-makeup-chip subtle">
              <span class="fixed-makeup-chip-label">待对方确认</span>
              <span class="fixed-makeup-chip-val">{{ photogCoopPendingCount }} 人</span>
            </div>
            <div class="fixed-makeup-chip subtle">
              <span class="fixed-makeup-chip-label">本店可选妆造师</span>
              <span class="fixed-makeup-chip-val">{{ makeupArtistOptions.length }} 人</span>
            </div>
          </div>

          <div class="fixed-makeup-picker-card photog-add-coop-card">
            <div class="fixed-makeup-card-cap">添加合作妆造师</div>
            <p class="fixed-makeup-card-hint">
              从本店名单选择并填写邀请理由（至少 4
              个字）。若曾遭对方拒绝，可再次提交将重新进入待确认。
            </p>
            <a-form-item label="妆造师" class="fixed-makeup-form-item">
              <a-select
                v-model:value="addCoopMakeupArtistId"
                allow-clear
                size="large"
                :loading="fixedMakeupLoading"
                placeholder="选择要邀请的妆造师"
                class="fixed-makeup-select"
              >
                <a-select-option v-for="m in makeupArtistOptions" :key="m.id" :value="m.id">
                  {{ m.name }}{{ m.title ? ` · ${m.title}` : ''
                  }}{{ m.rating != null ? ` · ⭐${m.rating}` : '' }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="合作邀请理由" class="fixed-makeup-form-item" required>
              <a-textarea
                v-model:value="addCoopInviteNote"
                :rows="3"
                :maxlength="500"
                show-count
                placeholder="至少 4 个字"
                class="fixed-makeup-invite-note"
              />
            </a-form-item>
            <a-button
              type="primary"
              class="pill fixed-makeup-save-btn"
              block
              :loading="savingFixedMakeup"
              @click="submitAddMakeupCooperation"
            >
              发送邀请
            </a-button>
          </div>

          <div
            v-if="!photogCoopList.length"
            class="fixed-makeup-preview-card fixed-makeup-preview-empty photog-coop-empty"
          >
            <div class="fixed-makeup-preview-cap">合作列表</div>
            <div class="fixed-makeup-empty-inner">
              <TeamOutlined class="fixed-makeup-empty-ico" />
              <p class="fixed-makeup-empty-title">暂无固定合作妆造师</p>
              <p class="fixed-makeup-empty-desc">
                发送邀请并由对方同意后，将显示在此；未绑定时订单妆造由系统自动分配。
              </p>
            </div>
          </div>

          <div v-else class="photog-coop-list">
            <div v-for="coop in photogCoopList" :key="'pcoop-' + coop.id" class="photog-coop-card">
              <div class="photog-coop-card-top">
                <a-avatar :size="52" :src="coop.makeupArtist.avatar" class="photog-coop-avatar">
                  {{ (coop.makeupArtist.name || '妆').slice(0, 1) }}
                </a-avatar>
                <div class="photog-coop-meta">
                  <div class="photog-coop-name-row">
                    <span class="photog-coop-name">{{ coop.makeupArtist.name }}</span>
                    <a-tag v-if="coop.status === 'pending'" color="warning">待对方确认</a-tag>
                    <a-tag v-else-if="coop.status === 'confirmed'" color="success">已确认</a-tag>
                    <a-tag v-else color="default">邀请已拒绝</a-tag>
                  </div>
                  <div v-if="coop.makeupArtist.title" class="photog-coop-sub">
                    {{ coop.makeupArtist.title }}
                  </div>
                </div>
              </div>

              <div class="photog-coop-detail-block">
                <p
                  v-if="String(coop.makeupArtist.shootingStyle || '').trim()"
                  class="photog-coop-line"
                >
                  <span class="photog-coop-k">擅长风格</span>{{ coop.makeupArtist.shootingStyle }}
                </p>
                <p
                  v-if="String(coop.makeupArtist.specialtyTopics || '').trim()"
                  class="photog-coop-line"
                >
                  <span class="photog-coop-k">擅长题材</span>{{ coop.makeupArtist.specialtyTopics }}
                </p>
                <div
                  v-if="
                    coop.makeupArtist.portfolioItems?.length ||
                    coop.makeupArtist.portfolioImages?.length
                  "
                  class="photog-coop-portfolio"
                >
                  <span class="photog-coop-k">作品</span>
                  <div class="photog-coop-thumbs">
                    <a-image
                      v-for="(pic, idx) in portfolioUrlsForCoop(coop)"
                      :key="idx"
                      :src="pic"
                      :width="56"
                      :height="56"
                      class="photog-coop-thumb"
                    />
                  </div>
                </div>
                <p
                  v-if="scheduleSummaryForCoop(coop).available"
                  class="photog-coop-line photog-coop-schedule"
                >
                  <span class="photog-coop-k">可约日</span
                  >{{ scheduleSummaryForCoop(coop).available }}
                </p>
                <p
                  v-if="scheduleSummaryForCoop(coop).rest"
                  class="photog-coop-line photog-coop-schedule muted"
                >
                  <span class="photog-coop-k">休息日</span>{{ scheduleSummaryForCoop(coop).rest }}
                </p>
                <p
                  v-if="String(coop.makeupArtist.scheduleNote || '').trim()"
                  class="photog-coop-line"
                >
                  <span class="photog-coop-k">档期说明</span>{{ coop.makeupArtist.scheduleNote }}
                </p>
              </div>

              <p
                v-if="coop.status === 'pending' && String(coop.inviteNote || '').trim()"
                class="photog-coop-invite-note"
              >
                <span class="photog-coop-k">你的附言</span>{{ coop.inviteNote }}
              </p>

              <a-alert
                v-if="coop.status === 'rejected'"
                type="error"
                show-icon
                class="photog-coop-inline-alert"
              >
                <template #message>对方已拒绝邀请</template>
                <template #description>
                  <div>{{ coop.cooperationRejectReason || '—' }}</div>
                  <div v-if="coop.cooperationRejectAt" class="fixed-makeup-reject-at">
                    {{ formatNoticeTime(parseTs(coop.cooperationRejectAt)) }}
                  </div>
                </template>
              </a-alert>

              <a-alert
                v-if="
                  coop.status === 'confirmed' &&
                  coop.dissolvePending &&
                  coop.dissolveInitiator === 'photographer'
                "
                type="info"
                show-icon
                class="photog-coop-inline-alert"
              >
                <template #message>解除申请已发送</template>
                <template #description> 已申请解除与该妆造师的合作，需对方确认后生效。 </template>
              </a-alert>

              <a-alert
                v-if="
                  coop.status === 'confirmed' &&
                  coop.dissolvePending &&
                  coop.dissolveInitiator === 'makeup'
                "
                type="warning"
                show-icon
                class="photog-coop-inline-alert"
              >
                <template #message>对方申请解除合作</template>
                <template #description>
                  <p v-if="String(coop.dissolveNote || '').trim()" class="dissolve-note-in-alert">
                    说明：{{ coop.dissolveNote }}
                  </p>
                  <div class="coop-invite-actions" style="margin-top: 10px">
                    <a-button
                      type="primary"
                      class="pill"
                      :loading="dissolveRespondLoadingId === coop.id"
                      @click="photogRespondDissolveForCoop(coop.id, true)"
                    >
                      同意解除
                    </a-button>
                    <a-button
                      class="pill ghost"
                      :disabled="dissolveRespondLoadingId === coop.id"
                      @click="openPhotogDissolveRejectModalForCoop(coop.id)"
                    >
                      拒绝
                    </a-button>
                  </div>
                </template>
              </a-alert>

              <a-alert
                v-if="
                  coop.status === 'confirmed' &&
                  !coop.dissolvePending &&
                  String(coop.dissolveRejectReason || '').trim()
                "
                type="error"
                show-icon
                class="photog-coop-inline-alert"
              >
                <template #message>对方拒绝了解除申请</template>
                <template #description>
                  <div>{{ coop.dissolveRejectReason }}</div>
                  <div v-if="coop.dissolveRejectAt" class="fixed-makeup-reject-at">
                    {{ formatNoticeTime(parseTs(coop.dissolveRejectAt)) }}
                  </div>
                </template>
              </a-alert>

              <div class="photog-coop-actions">
                <a-button
                  v-if="coop.status === 'pending'"
                  class="pill ghost"
                  :loading="revokingCoopId === coop.id"
                  @click="revokeCooperation(coop.id)"
                >
                  撤销邀请
                </a-button>
                <a-button
                  v-if="
                    coop.status === 'confirmed' &&
                    !coop.dissolvePending &&
                    !String(coop.dissolveRejectReason || '').trim()
                  "
                  danger
                  class="pill dissolve-request-btn"
                  @click="openPhotogDissolveRequestModalForCoop(coop)"
                >
                  申请解除合作
                </a-button>
              </div>
            </div>
          </div>

          <div class="fixed-makeup-hints">
            <div class="fixed-makeup-hints-title">协作说明</div>
            <ul class="fixed-makeup-hints-list">
              <li>可绑定多位妆造师；接单分配时按列表顺序优先尝试已确认搭档的可约档期。</li>
              <li>发起邀请须填写理由；解除合作同样须经对方确认。</li>
              <li>绑定仅影响「用户未指定妆造师」时的默认分配。</li>
              <li>若合作妆造师档期冲突，门店仍可能调整执行人，请以订单实际指派为准。</li>
            </ul>
          </div>
        </div>

        <div
          v-show="profileNav.section === 'cooperation-invites' && form.role === 'makeup'"
          class="panel coop-invites-panel"
        >
          <div class="coop-invites-head">
            <div class="panel-title">合作邀请</div>
            <p class="coop-invites-lead">
              <strong>已固定合作中的摄影师</strong
              >可在此发起「解除合作」或处理对方发起的解除（均须确认后生效）；<strong>待你确认的绑定邀请</strong>需同意或拒绝。绑定生效后，当其接单且用户未指定妆造师时，系统会优先将妆造任务分配给你。拒绝须填写理由（至少
              4 个字），对方可在个人中心查看。
            </p>
          </div>
          <a-spin v-if="cooperationLoading" class="coop-invites-spin" />
          <template v-else>
            <div class="coop-subsection">
              <div class="coop-subsection-title">已固定合作中的摄影师</div>
              <p class="coop-subsection-desc">
                以下摄影师已在系统中将你设为<strong>已生效</strong>的固定合作妆造师（含早期直接绑定数据）。当其接单且订单未指定妆造师时，可能优先分配给你。
              </p>
              <div v-if="!cooperationBoundPhotographers.length" class="coop-bound-empty">
                暂无。说明当前没有摄影师的档案将「固定合作妆造师」指向你；若摄影师刚保存绑定，需对方先解除旧绑定再重新发起邀请并由你确认后才会出现在「待确认」中。
              </div>
              <div v-else class="coop-bound-list">
                <div
                  v-for="bp in cooperationBoundPhotographers"
                  :key="'bound-' + bp.cooperationId"
                  class="coop-bound-card"
                >
                  <div class="coop-bound-top">
                    <a-avatar :size="48" :src="bp.avatar" class="coop-bound-avatar">
                      {{ (bp.name || '摄').slice(0, 1) }}
                    </a-avatar>
                    <div class="coop-bound-meta">
                      <div class="coop-bound-name">{{ bp.name }}</div>
                      <div v-if="bp.title" class="coop-bound-sub">{{ bp.title }}</div>
                      <div class="coop-bound-sub">
                        档案更新 {{ formatNoticeTime(parseTs(bp.boundAt)) }}
                      </div>
                    </div>
                  </div>
                  <p v-if="String(bp.shootingStyle || '').trim()" class="coop-bound-style">
                    风格：{{ bp.shootingStyle }}
                  </p>
                  <a-alert
                    v-if="bp.dissolvePending && bp.dissolveInitiator === 'photographer'"
                    type="warning"
                    show-icon
                    class="coop-dissolve-alert"
                  >
                    <template #message>摄影师申请解除固定合作</template>
                    <template #description>
                      <p v-if="String(bp.dissolveNote || '').trim()" class="dissolve-note-in-alert">
                        说明：{{ bp.dissolveNote }}
                      </p>
                      <p v-else class="dissolve-note-in-alert">对方未填写补充说明。</p>
                      <p
                        v-if="bp.dissolveRequestedAt"
                        class="coop-bound-sub"
                        style="margin-top: 6px"
                      >
                        申请时间 {{ formatNoticeTime(parseTs(bp.dissolveRequestedAt)) }}
                      </p>
                      <div class="coop-invite-actions" style="margin-top: 10px">
                        <a-button
                          type="primary"
                          class="pill"
                          :loading="dissolveRespondLoadingId === bp.cooperationId"
                          @click="makeupAcceptDissolveFromPhotographer(bp)"
                        >
                          同意解除
                        </a-button>
                        <a-button
                          class="pill ghost"
                          :disabled="dissolveRespondLoadingId === bp.cooperationId"
                          @click="openMakeupDissolveRejectModal(bp)"
                        >
                          拒绝
                        </a-button>
                      </div>
                    </template>
                  </a-alert>
                  <a-alert
                    v-else-if="bp.dissolvePending && bp.dissolveInitiator === 'makeup'"
                    type="info"
                    show-icon
                    class="coop-dissolve-alert"
                  >
                    <template #message>等待摄影师确认解除</template>
                    <template #description>
                      你已申请解除与该摄影师的固定合作，对方同意后才会正式解除。
                      <span v-if="String(bp.dissolveNote || '').trim()">
                        你的说明：{{ bp.dissolveNote }}
                      </span>
                    </template>
                  </a-alert>
                  <a-alert
                    v-else-if="!bp.dissolvePending && String(bp.dissolveRejectReason || '').trim()"
                    type="error"
                    show-icon
                    class="coop-dissolve-alert"
                  >
                    <template #message>摄影师拒绝了解除申请</template>
                    <template #description>
                      <div>{{ bp.dissolveRejectReason }}</div>
                      <div v-if="bp.dissolveRejectAt" class="coop-bound-sub">
                        反馈时间：{{ formatNoticeTime(parseTs(bp.dissolveRejectAt)) }}
                      </div>
                    </template>
                  </a-alert>
                  <div v-else-if="!bp.dissolvePending" class="coop-bound-dissolve-actions">
                    <a-button
                      danger
                      class="pill dissolve-request-btn"
                      block
                      :loading="makeupDissolveRequestCoopId === bp.cooperationId"
                      @click="openMakeupDissolveRequestModal(bp)"
                    >
                      申请解除合作
                    </a-button>
                  </div>
                </div>
              </div>
            </div>

            <div class="coop-subsection coop-subsection-pending">
              <div class="coop-subsection-title">待你确认的邀请</div>
              <p class="coop-subsection-desc">
                摄影师已提交申请并填写理由，需你在此操作同意或拒绝。
              </p>
              <div v-if="!cooperationInvites.length" class="coop-invites-empty">
                <p class="coop-invites-empty-title">暂无待处理邀请</p>
                <p class="coop-invites-empty-desc">
                  有新的摄影师绑定申请时，会出现在此处并同步到「平台通知」。
                </p>
              </div>
              <div v-else class="coop-invites-list">
                <div
                  v-for="inv in cooperationInvites"
                  :key="'inv-' + inv.cooperationId"
                  class="coop-invite-card"
                >
                  <div class="coop-invite-top">
                    <a-avatar :size="52" :src="inv.avatar" class="coop-invite-avatar">
                      {{ (inv.name || '摄').slice(0, 1) }}
                    </a-avatar>
                    <div class="coop-invite-meta">
                      <div class="coop-invite-name">{{ inv.name }}</div>
                      <div v-if="inv.title" class="coop-invite-sub">{{ inv.title }}</div>
                      <div class="coop-invite-sub">
                        申请时间 {{ formatNoticeTime(parseTs(inv.requestedAt)) }}
                      </div>
                    </div>
                  </div>
                  <p v-if="String(inv.shootingStyle || '').trim()" class="coop-invite-style">
                    风格：{{ inv.shootingStyle }}
                  </p>
                  <div v-if="String(inv.inviteNote || '').trim()" class="coop-invite-note-box">
                    <span class="coop-invite-note-k">摄影师附言</span>
                    <p class="coop-invite-note-t">{{ inv.inviteNote }}</p>
                  </div>
                  <div class="coop-invite-actions">
                    <a-button
                      type="primary"
                      class="pill"
                      :loading="cooperatingRespondId === inv.cooperationId"
                      @click="respondCooperationAccept(inv)"
                    >
                      同意绑定
                    </a-button>
                    <a-button
                      class="pill ghost"
                      :disabled="cooperatingRespondId === inv.cooperationId"
                      @click="openCoopRejectModal(inv)"
                    >
                      拒绝
                    </a-button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div v-show="profileNav.section === 'notices'" class="panel">
          <div class="panel-h"><div class="panel-title">平台通知</div></div>
          <div class="notice">
            <a-spin v-if="noticesLoading" />
            <template v-else>
              <div
                v-for="n in notices"
                :key="n.id"
                class="n-item"
                :class="{ unread: !n.read }"
                @click="markNoticeRead(n.id)"
              >
                <div class="n-title">
                  <span>{{ n.title }}</span>
                  <span class="n-state" :class="n.read ? 'read' : 'unread'">{{
                    n.read ? '已读' : '未读'
                  }}</span>
                </div>
                <div class="n-body">{{ n.body }}</div>
                <div class="n-time">{{ n.timeText }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <a-modal
      v-model:open="pwdModalOpen"
      title="修改密码"
      ok-text="确认修改"
      cancel-text="取消"
      :ok-button-props="{ class: 'profile-ok-btn' }"
      :cancel-button-props="{ class: 'profile-cancel-btn' }"
      :confirm-loading="pwdSubmitting"
      destroy-on-close
      @ok="submitChangePassword"
    >
      <a-form layout="vertical">
        <a-form-item label="当前密码">
          <a-input-password v-model:value="pwdForm.current" placeholder="请输入当前登录密码" />
        </a-form-item>
        <a-form-item label="新密码">
          <a-input-password v-model:value="pwdForm.next" placeholder="至少 6 位" />
        </a-form-item>
        <a-form-item label="确认新密码">
          <a-input-password v-model:value="pwdForm.confirm" placeholder="再次输入新密码" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="coopRejectModalOpen"
      title="拒绝固定合作邀请"
      ok-text="确认拒绝"
      cancel-text="取消"
      :ok-button-props="{ class: 'profile-ok-btn' }"
      :cancel-button-props="{ class: 'profile-cancel-btn' }"
      :confirm-loading="coopRejectSubmitting"
      destroy-on-close
      @ok="submitCoopReject"
    >
      <p v-if="coopRejectTarget" class="coop-reject-tip">
        将拒绝摄影师「{{ coopRejectTarget.name }}」的固定合作申请，请填写理由（至少 4 个字）。
      </p>
      <a-form layout="vertical">
        <a-form-item label="拒绝理由" required>
          <a-textarea
            v-model:value="coopRejectReason"
            :rows="4"
            :maxlength="500"
            show-count
            placeholder="如：档期已满、风格不匹配等"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="dissolveRequestModalOpen"
      :title="dissolveRequestModalTitle"
      ok-text="提交申请"
      cancel-text="取消"
      :ok-button-props="{ class: 'profile-ok-btn' }"
      :cancel-button-props="{ class: 'profile-cancel-btn' }"
      :confirm-loading="dissolveRequestSubmitting"
      destroy-on-close
      @ok="submitDissolveRequest"
    >
      <p class="coop-reject-tip">{{ dissolveRequestModalHint }}</p>
      <a-form layout="vertical">
        <a-form-item label="说明（至少 4 个字）" required>
          <a-textarea
            v-model:value="dissolveRequestReason"
            :rows="4"
            :maxlength="500"
            show-count
            placeholder="请简要说明解除原因，便于对方理解"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="photogDissolveRejectModalOpen"
      title="拒绝解除固定合作"
      ok-text="确认拒绝"
      cancel-text="取消"
      :ok-button-props="{ class: 'profile-ok-btn' }"
      :cancel-button-props="{ class: 'profile-cancel-btn' }"
      :confirm-loading="photogDissolveRejectSubmitting"
      destroy-on-close
      @ok="submitPhotogDissolveReject"
    >
      <p class="coop-reject-tip">将拒绝妆造师发起的解除申请，对方可看到拒绝理由（至少 4 个字）。</p>
      <a-form layout="vertical">
        <a-form-item label="拒绝理由" required>
          <a-textarea
            v-model:value="photogDissolveRejectReason"
            :rows="4"
            :maxlength="500"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="makeupDissolveRejectModalOpen"
      title="拒绝解除固定合作"
      ok-text="确认拒绝"
      cancel-text="取消"
      :ok-button-props="{ class: 'profile-ok-btn' }"
      :cancel-button-props="{ class: 'profile-cancel-btn' }"
      :confirm-loading="makeupDissolveRejectSubmitting"
      destroy-on-close
      @ok="submitMakeupDissolveReject"
    >
      <p v-if="makeupDissolveRejectTarget" class="coop-reject-tip">
        将拒绝摄影师「{{ makeupDissolveRejectTarget.name }}」的解除申请，请填写理由（至少 4 个字）。
      </p>
      <a-form layout="vertical">
        <a-form-item label="拒绝理由" required>
          <a-textarea
            v-model:value="makeupDissolveRejectReason"
            :rows="4"
            :maxlength="500"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="phoneModalOpen"
      title="绑定手机号"
      ok-text="确认绑定"
      cancel-text="取消"
      :ok-button-props="{ class: 'profile-ok-btn' }"
      :cancel-button-props="{ class: 'profile-cancel-btn' }"
      :confirm-loading="phoneSubmitting"
      destroy-on-close
      @ok="submitBindPhone"
    >
      <p class="phone-tip">将绑定到当前登录账号，需为 11 位中国大陆手机号。</p>
      <a-form layout="vertical">
        <a-form-item label="手机号">
          <a-input v-model:value="phoneForm.phone" placeholder="请输入手机号" :maxlength="11" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { authApi } from '@/api/auth';
import { ordersApi } from '@/api/orders';
import {
  photographersApi,
  type FixedCooperationBoundPhotographer,
  type FixedCooperationInvite,
  type MakeupArtistPublic,
  type PhotographerMakeupCooperationMine,
  type PhotographerMine,
} from '@/api/photographers';
import { useAuthStore } from '@/store/auth';
import { getApiErrorMessage } from '@/utils/apiError';
import { unwrapOrderListPayload } from '@/utils/workerOrders';
import {
  CheckCircleFilled,
  LockOutlined,
  MobileOutlined,
  TeamOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';
import type { UploadProps } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';

type ProfileSectionKey =
  | 'profile'
  | 'security'
  | 'fixed-makeup'
  | 'cooperation-invites'
  | 'notices';

const authStore = useAuthStore();
/** 用 reactive 存当前分区，避免模板里对 ref 读写偶发未解包导致 v-show 全为 false */
const profileNav = reactive({ section: 'profile' as ProfileSectionKey });

const saving = ref(false);
const uploadingAvatar = ref(false);

const pwdModalOpen = ref(false);
const pwdSubmitting = ref(false);
const pwdForm = reactive({
  current: '',
  next: '',
  confirm: '',
});

const phoneModalOpen = ref(false);
const phoneSubmitting = ref(false);
const phoneForm = reactive({ phone: '' });
const noticesLoading = ref(false);
type NoticeItem = {
  id: string;
  title: string;
  body: string;
  time: number;
  timeText: string;
  read: boolean;
};
const notices = ref<NoticeItem[]>([]);
const makeupArtistOptions = ref<MakeupArtistPublic[]>([]);
const addCoopMakeupArtistId = ref<number | null>(null);
const addCoopInviteNote = ref('');

/** 档案 id 与下拉值可能是 number/string，统一比较避免误判 */
function sameWorkerPhotographerId(a: unknown, b: unknown): boolean {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return false;
  return na === nb;
}

function isPhotographerMinePayload(x: unknown): x is PhotographerMine {
  return (
    x !== null &&
    typeof x === 'object' &&
    'approvalStatus' in x &&
    typeof (x as PhotographerMine).approvalStatus === 'string' &&
    typeof (x as PhotographerMine).id === 'number'
  );
}

const mineProfile = ref<PhotographerMine | null>(null);

const photogCoopList = computed(() => {
  const raw = mineProfile.value?.makeupCooperations || [];
  const order = { pending: 0, confirmed: 1, rejected: 2 } as Record<string, number>;
  return [...raw].sort((a, b) => {
    const da = order[a.status] ?? 9;
    const db = order[b.status] ?? 9;
    if (da !== db) return da - db;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id - b.id;
  });
});

const photogCoopConfirmedCount = computed(
  () => photogCoopList.value.filter((c) => c.status === 'confirmed').length
);
const photogCoopPendingCount = computed(
  () => photogCoopList.value.filter((c) => c.status === 'pending').length
);

function portfolioUrlsForCoop(coop: PhotographerMakeupCooperationMine): string[] {
  const m = coop.makeupArtist;
  const items = m.portfolioItems?.length
    ? m.portfolioItems.map((x) => String(x.url || '').trim()).filter(Boolean)
    : (m.portfolioImages || []).filter(Boolean);
  return items.slice(0, 8);
}

function scheduleSummaryForCoop(coop: PhotographerMakeupCooperationMine): {
  available: string;
  rest: string;
} {
  const avail = (coop.makeupArtist.availableDates || []).slice(0, 12);
  const rest = (coop.makeupArtist.restDates || []).slice(0, 12);
  return {
    available: avail.length ? avail.join('、') + (avail.length >= 12 ? '…' : '') : '',
    rest: rest.length ? rest.join('、') + (rest.length >= 12 ? '…' : '') : '',
  };
}

const fixedMakeupLoading = ref(false);
const savingFixedMakeup = ref(false);
const cooperationLoading = ref(false);
const cooperationInvites = ref<FixedCooperationInvite[]>([]);
const cooperationBoundPhotographers = ref<FixedCooperationBoundPhotographer[]>([]);
const cooperatingRespondId = ref<number | null>(null);
const coopRejectModalOpen = ref(false);
const coopRejectSubmitting = ref(false);
const coopRejectTarget = ref<FixedCooperationInvite | null>(null);
const coopRejectReason = ref('');

const dissolveRequestModalOpen = ref(false);
const dissolveRequestIsPhotographerSide = ref(true);
const dissolveRequestCooperationId = ref<number | null>(null);
const dissolveRequestPartnerLabel = ref('');
const dissolveRequestReason = ref('');
const dissolveRequestSubmitting = ref(false);

const photogDissolveRejectModalOpen = ref(false);
const photogDissolveRejectReason = ref('');
const photogDissolveRejectSubmitting = ref(false);
const photogDissolveRejectTargetCoopId = ref<number | null>(null);

const makeupDissolveRejectModalOpen = ref(false);
const makeupDissolveRejectTarget = ref<FixedCooperationBoundPhotographer | null>(null);
const makeupDissolveRejectReason = ref('');
const makeupDissolveRejectSubmitting = ref(false);

const dissolveRespondLoadingId = ref<number | null>(null);
const makeupDissolveRequestCoopId = ref<number | null>(null);
const revokingCoopId = ref<number | null>(null);

const submitApprovalLoading = ref(false);

/** 与后端提交审核校验一致（基于已保存到服务器的档案） */
function approvalProfileMissingLabels(
  mine: PhotographerMine | null,
  phone: string | undefined | null
): string[] {
  const missing: string[] = [];
  if (!mine) return ['摄影师档案'];
  const nameOk = String(mine.name || '').trim();
  if (!nameOk) missing.push('姓名');
  if (!String(mine.avatar || '').trim()) missing.push('头像');
  const bio = String(mine.bio || '').trim();
  if (!bio || bio.length < 10) missing.push('个人简介（至少10个字）');
  const style = String(mine.shootingStyle || '').trim();
  if (!style || style === '（请补充拍摄风格）') missing.push('擅长风格');
  const p = String(phone || '').trim();
  if (!/^1[3-9]\d{9}$/.test(p)) missing.push('绑定11位手机号');
  if (!String(mine.specialtyTopics || '').trim()) missing.push('擅长题材');
  const imgs = Array.isArray(mine.portfolioImages) ? mine.portfolioImages.filter(Boolean) : [];
  if (imgs.length < 1) missing.push('至少一张作品');
  return missing;
}

const approvalProfileMissing = computed(() => {
  if (!authStore.user?.workerPhotographerId) return [];
  const st = String(
    mineProfile.value?.approvalStatus ?? authStore.user?.photographerApprovalStatus ?? ''
  );
  if (!['draft', 'rejected'].includes(st)) return [];
  return approvalProfileMissingLabels(mineProfile.value, authStore.user?.phone);
});

const approvalBanner = computed(() => {
  if (!authStore.user?.workerPhotographerId) return null;
  const st = String(
    mineProfile.value?.approvalStatus ?? authStore.user?.photographerApprovalStatus ?? ''
  );
  if (st === 'draft') {
    return {
      type: 'info' as const,
      title: '资料待提交审核',
      desc: '请完善左侧资料并保存后，点击「提交管理员审核」。审核通过后方可接单。',
      showSubmit: true,
    };
  }
  if (st === 'pending') {
    return {
      type: 'warning' as const,
      title: '审核中',
      desc: '管理员正在审核你的摄影师档案，请耐心等待。',
      showSubmit: false,
    };
  }
  if (st === 'rejected') {
    const note =
      mineProfile.value?.approvalReviewNote ?? authStore.user?.photographerApprovalNote ?? '';
    return {
      type: 'error' as const,
      title: '审核未通过',
      desc: (note ? `${note} — ` : '') + '请在「个人中心」修改后重新提交审核。',
      showSubmit: true,
    };
  }
  if (st === 'approved') {
    return {
      type: 'success' as const,
      title: '审核已通过',
      desc: '你已具备接单权限。若用户端「本店服务团队」暂未展示，需管理员在后台启用前台展示。',
      showSubmit: false,
    };
  }
  return null;
});

const storageKey = computed(() => `worker_profile_local_v1_${authStore.user?.id ?? 'guest'}`);
const noticeReadKey = computed(() => `worker_notice_read_ids_v1_${authStore.user?.id ?? 'guest'}`);

const form = reactive({
  name: '',
  role: 'photographer',
  avatar: '',
  phone: '',
  style: '',
  bio: '',
  gender: '',
  age: undefined as number | undefined,
  yearsExperience: 0,
  specialtyTopics: '',
  awards: '',
  scheduleNote: '',
});

const sidebarItems = computed(() => {
  const items: { key: ProfileSectionKey; label: string }[] = [
    { key: 'profile', label: '个人资料' },
    { key: 'security', label: '账号安全' },
  ];
  if (form.role === 'photographer') {
    items.push({ key: 'fixed-makeup', label: '固定合作妆造师' });
  }
  if (form.role === 'makeup') {
    items.push({ key: 'cooperation-invites', label: '合作邀请' });
  }
  items.push({ key: 'notices', label: '平台通知' });
  return items;
});

watch(
  () => form.role,
  () => {
    if (profileNav.section === 'fixed-makeup' && form.role !== 'photographer') {
      profileNav.section = 'profile';
    }
    if (profileNav.section === 'cooperation-invites' && form.role !== 'makeup') {
      profileNav.section = 'profile';
    }
  }
);

const displayName = computed(() => {
  const localName = String(form.name || '').trim();
  if (localName) return localName;
  return String(authStore.user?.name || '工作人员');
});

const mineTitleDisplay = computed(() => {
  const t = String(mineProfile.value?.title || '').trim();
  return t || '（尚未设置）';
});

const positionLabel = computed(() => {
  if (form.role === 'photographer') return '摄影师';
  if (form.role === 'makeup') return '妆造师';
  return '造型师';
});

const load = () => {
  const raw = localStorage.getItem(storageKey.value);
  if (!raw) return;
  try {
    const v = JSON.parse(raw) as any;
    Object.assign(form, v || {});
  } catch {
    /* ignore */
  }
};

const applyMineToForm = (hit: PhotographerMine) => {
  mineProfile.value = hit;
  form.name = hit.name || '';
  form.avatar = hit.avatar || '';
  form.style = hit.shootingStyle || '';
  form.bio = hit.bio || '';
  form.gender = hit.gender || '';
  form.age = hit.age;
  form.yearsExperience = Number(hit.yearsExperience || 0);
  form.specialtyTopics = hit.specialtyTopics || '';
  form.awards = hit.awards || '';
  form.scheduleNote = hit.scheduleNote || '';
  addCoopMakeupArtistId.value = null;
  addCoopInviteNote.value = '';
};

const loadMakeupArtistOptions = async () => {
  fixedMakeupLoading.value = true;
  try {
    makeupArtistOptions.value = await photographersApi.getPublicMakeupArtists();
  } catch {
    makeupArtistOptions.value = [];
  } finally {
    fixedMakeupLoading.value = false;
  }
};

const submitAddMakeupCooperation = async () => {
  if (!authStore.user?.workerPhotographerId) {
    message.warning('当前账号未关联摄影师档案');
    return;
  }
  const mid = addCoopMakeupArtistId.value;
  if (mid == null) {
    message.warning('请选择妆造师');
    return;
  }
  const note = addCoopInviteNote.value.trim();
  if (note.length < 4) {
    message.warning('请填写合作邀请理由（至少 4 个字）');
    return;
  }
  savingFixedMakeup.value = true;
  try {
    const hit = await photographersApi.addMakeupCooperation(mid, note);
    applyMineToForm(hit);
    message.success('已提交绑定申请，等待妆造师确认');
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    savingFixedMakeup.value = false;
  }
};

const revokeCooperation = async (cooperationId: number) => {
  revokingCoopId.value = cooperationId;
  try {
    const hit = await photographersApi.revokeMakeupCooperation(cooperationId);
    applyMineToForm(hit);
    message.success('已撤销该邀请');
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    revokingCoopId.value = null;
  }
};

const hydrateFromMine = async () => {
  if (!authStore.user?.workerPhotographerId) return;
  try {
    const hit = await photographersApi.getMine();
    applyMineToForm(hit);
  } catch {
    /* ignore */
  }
};

const loadCooperationInvites = async () => {
  if (form.role !== 'makeup' || !authStore.accessToken) {
    cooperationInvites.value = [];
    cooperationBoundPhotographers.value = [];
    return;
  }
  cooperationLoading.value = true;
  try {
    const [incoming, bound] = await Promise.all([
      photographersApi.getIncomingFixedCooperation(),
      photographersApi.getBoundPhotographersAsMakeup(),
    ]);
    cooperationInvites.value = incoming;
    cooperationBoundPhotographers.value = bound;
  } catch {
    cooperationInvites.value = [];
    cooperationBoundPhotographers.value = [];
  } finally {
    cooperationLoading.value = false;
  }
};

/** 无后端档案时的兜底（演示账号等） */
const hydrateFromPublicByName = async () => {
  const name = displayName.value.trim();
  if (!name) return;
  try {
    const list = await photographersApi.getPublic();
    const hit = list.find((x) => String(x.name || '').trim() === name);
    if (!hit) return;
    if (!form.avatar) form.avatar = hit.avatar || '';
    if (!form.style) form.style = hit.shootingStyle || '';
    if (!form.bio) form.bio = hit.bio || '';
    if (!form.gender) form.gender = hit.gender || '';
    if (form.age == null) form.age = hit.age;
    if (!form.yearsExperience) form.yearsExperience = Number(hit.yearsExperience || 0);
    if (!form.specialtyTopics) form.specialtyTopics = hit.specialtyTopics || '';
    if (!form.awards) form.awards = hit.awards || '';
    if (!form.scheduleNote) form.scheduleNote = hit.scheduleNote || '';
  } catch {
    /* ignore */
  }
};

const handleAvatarUpload: UploadProps['customRequest'] = async (options) => {
  const { file, onSuccess, onError } = options;
  const raw = file as File;
  uploadingAvatar.value = true;
  try {
    const { url } = await photographersApi.uploadImage(raw);
    form.avatar = url;
    onSuccess?.(url);
    message.success('头像已上传');
  } catch (e: unknown) {
    onError?.(e as Error);
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: string }).message)
        : '上传失败';
    message.error(msg);
  } finally {
    uploadingAvatar.value = false;
  }
};

const formatNoticeTime = (ts: number) => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
};

const parseTs = (v: unknown): number => {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : Date.now();
};

const dissolveRequestModalTitle = computed(() =>
  dissolveRequestIsPhotographerSide.value
    ? `申请解除与「${dissolveRequestPartnerLabel.value || '妆造师'}」的固定合作`
    : `申请解除与摄影师「${dissolveRequestPartnerLabel.value || '对方'}」的合作`
);

const dissolveRequestModalHint = computed(() =>
  dissolveRequestIsPhotographerSide.value
    ? '将向该妆造师发起解除申请，需对方确认后生效。'
    : '将向该摄影师发起解除申请，需对方确认后生效。'
);

const loadReadIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(noticeReadKey.value);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set<string>();
  }
};

const saveReadIds = (ids: Set<string>) => {
  localStorage.setItem(noticeReadKey.value, JSON.stringify(Array.from(ids)));
};

const save = async () => {
  localStorage.setItem(storageKey.value, JSON.stringify(form));
  const name = displayName.value.trim();
  if (!name) {
    message.success('已保存本地资料');
    return;
  }
  if (!authStore.user?.workerPhotographerId) {
    message.warning('已保存本地资料；当前账号未关联摄影师档案，无法同步服务器');
    return;
  }
  saving.value = true;
  try {
    const hit = await photographersApi.updateMine({
      name,
      avatar: form.avatar.trim() || null,
      shootingStyle: form.style.trim() || '（请补充拍摄风格）',
      yearsExperience: Number(form.yearsExperience || 0),
      bio: form.bio.trim() || null,
      gender: form.gender?.trim() || null,
      age: form.age ?? null,
      specialtyTopics: form.specialtyTopics.trim() || null,
      awards: form.awards.trim() || null,
      scheduleNote: form.scheduleNote.trim() || null,
    });
    applyMineToForm(hit);
    await authStore.getProfile();
    message.success('已保存并同步到服务器');
  } catch {
    message.warning('已保存本地资料；同步服务器失败，请稍后重试');
  } finally {
    saving.value = false;
  }
};

const submitApproval = async () => {
  const missing = approvalProfileMissingLabels(mineProfile.value, authStore.user?.phone);
  if (missing.length) {
    message.warning(`请先完善个人信息并保存后再提交，尚缺：${missing.join('、')}`);
    return;
  }
  submitApprovalLoading.value = true;
  try {
    await photographersApi.submitApproval();
    await authStore.getProfile();
    await hydrateFromMine();
    message.success('已提交管理员审核');
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    submitApprovalLoading.value = false;
  }
};

const changePassword = () => {
  pwdForm.current = '';
  pwdForm.next = '';
  pwdForm.confirm = '';
  pwdModalOpen.value = true;
};

const submitChangePassword = async () => {
  const cur = pwdForm.current.trim();
  const next = pwdForm.next.trim();
  const confirm = pwdForm.confirm.trim();
  if (!cur || !next || !confirm) {
    message.warning('请填写完整');
    return;
  }
  if (next.length < 6) {
    message.warning('新密码至少 6 位');
    return;
  }
  if (next !== confirm) {
    message.warning('两次输入的新密码不一致');
    return;
  }
  if (!authStore.accessToken) {
    message.warning('请先登录');
    return;
  }
  pwdSubmitting.value = true;
  try {
    await authApi.changePassword({ currentPassword: cur, newPassword: next });
    message.success('密码已修改');
    pwdModalOpen.value = false;
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    pwdSubmitting.value = false;
  }
};

const bindPhone = () => {
  phoneForm.phone = String(authStore.user?.phone || form.phone || '').trim();
  phoneModalOpen.value = true;
};

const submitBindPhone = async () => {
  const p = phoneForm.phone.trim();
  if (!/^1[3-9]\d{9}$/.test(p)) {
    message.warning('请输入有效的 11 位手机号');
    return;
  }
  if (!authStore.accessToken) {
    message.warning('请先登录');
    return;
  }
  phoneSubmitting.value = true;
  try {
    await authApi.bindPhone({ phone: p });
    form.phone = p;
    localStorage.setItem(storageKey.value, JSON.stringify(form));
    await authStore.getProfile();
    message.success('手机号已绑定');
    phoneModalOpen.value = false;
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    phoneSubmitting.value = false;
  }
};

const markNoticeRead = (id: string) => {
  const i = notices.value.findIndex((x) => x.id === id);
  if (i === -1 || notices.value[i]?.read) return;
  notices.value[i] = { ...notices.value[i], read: true };
  const ids = loadReadIds();
  ids.add(id);
  saveReadIds(ids);
};

const loadNotices = async () => {
  noticesLoading.value = true;
  try {
    const workerRes = await ordersApi.getWorkerOrders();
    const workerOrders = unwrapOrderListPayload(workerRes as any);
    const rows = Array.isArray(workerOrders) ? workerOrders : [];

    const pendingTake = rows.filter(
      (x: any) => !Number(x?.workerUserId || 0) && !String(x?.workerTakenAt || '').trim()
    ).length;
    const pendingReschedule = rows.filter(
      (x: any) => String(x?.rescheduleRequestStatus || '').toLowerCase() === 'pending'
    ).length;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayShootings = rows.filter(
      (x: any) => String(x?.shootingDate || '').slice(0, 10) === todayKey
    ).length;

    const realOrderNotices: Array<Omit<NoticeItem, 'read' | 'timeText'>> = [];
    if (pendingTake > 0 && authStore.user?.photographerCanTakeOrders) {
      const latestTs = Math.max(
        ...rows
          .filter(
            (x: any) => !Number(x?.workerUserId || 0) && !String(x?.workerTakenAt || '').trim()
          )
          .map((x: any) => parseTs(x?.createdAt))
      );
      realOrderNotices.push({
        id: `order-pending-take-${pendingTake}-${latestTs}`,
        title: '待接单提醒',
        body: `当前有 ${pendingTake} 条订单待接单，请及时处理。`,
        time: latestTs,
      });
    }
    if (pendingReschedule > 0) {
      const latestTs = Math.max(
        ...rows
          .filter((x: any) => String(x?.rescheduleRequestStatus || '').toLowerCase() === 'pending')
          .map((x: any) => parseTs(x?.rescheduleRequestedAt || x?.updatedAt || x?.createdAt))
      );
      realOrderNotices.push({
        id: `order-reschedule-pending-${pendingReschedule}-${latestTs}`,
        title: '改期申请提醒',
        body: `当前有 ${pendingReschedule} 条改期申请待处理。`,
        time: latestTs,
      });
    }
    if (todayShootings > 0) {
      const latestTs = Math.max(
        ...rows
          .filter((x: any) => String(x?.shootingDate || '').slice(0, 10) === todayKey)
          .map((x: any) => parseTs(`${String(x?.shootingDate).slice(0, 10)}T09:00:00`))
      );
      realOrderNotices.push({
        id: `order-today-shooting-${todayShootings}-${todayKey}`,
        title: '今日拍摄提醒',
        body: `今天有 ${todayShootings} 条拍摄安排，请提前确认客户沟通与档期。`,
        time: latestTs,
      });
    }
    if (!realOrderNotices.length) {
      realOrderNotices.push({
        id: `order-empty-${todayKey}`,
        title: '订单提醒',
        body: '当前暂无待处理订单提醒。',
        time: Date.now() - 60 * 1000,
      });
    }

    const realSystemNotices: Array<Omit<NoticeItem, 'read' | 'timeText'>> = [];
    const profileTs = parseTs(authStore.user?.updatedAt);
    if (authStore.user?.phone) {
      realSystemNotices.push({
        id: `sys-phone-bound-${String(authStore.user.phone)}`,
        title: '账号状态',
        body: `已绑定手机号：${String(authStore.user.phone)}`,
        time: profileTs,
      });
    } else {
      realSystemNotices.push({
        id: 'sys-phone-unbound',
        title: '账号安全提醒',
        body: '建议尽快绑定手机号，便于接收通知与找回账号。',
        time: profileTs,
      });
    }
    if (authStore.user?.workerPhotographerId) {
      realSystemNotices.push({
        id: `sys-worker-bind-${authStore.user.workerPhotographerId}`,
        title: '档案关联状态',
        body: `当前账号已关联摄影师档案（ID: ${authStore.user.workerPhotographerId}）。`,
        time: profileTs - 1000,
      });
    }
    realSystemNotices.push({
      id: `sys-order-overview-${rows.length}`,
      title: '订单数据概览',
      body: `系统已同步到你名下共 ${rows.length} 条订单记录。`,
      time: Date.now() - 2000,
    });

    const coopInviteNotices: Array<Omit<NoticeItem, 'read' | 'timeText'>> = [];
    if (form.role === 'makeup' && authStore.accessToken) {
      try {
        const invites = await photographersApi.getIncomingFixedCooperation();
        for (const inv of invites) {
          const noteHint = String(inv.inviteNote || '').trim()
            ? ` 附言：${String(inv.inviteNote).trim()}`
            : '';
          coopInviteNotices.push({
            id: `fixed-coop-invite-${inv.cooperationId}`,
            title: '固定合作邀请',
            body: `摄影师「${inv.name}」申请将你设为固定合作妆造师，请在侧栏「合作邀请」中同意或拒绝。${noteHint}`,
            time: parseTs(inv.requestedAt),
          });
        }
        const bound = await photographersApi.getBoundPhotographersAsMakeup();
        for (const bp of bound) {
          if (bp.dissolvePending && bp.dissolveInitiator === 'photographer') {
            const noteHint = String(bp.dissolveNote || '').trim()
              ? ` 说明：${String(bp.dissolveNote).trim()}`
              : '';
            const t = bp.dissolveRequestedAt
              ? parseTs(bp.dissolveRequestedAt)
              : parseTs(bp.boundAt);
            coopInviteNotices.push({
              id: `fixed-coop-dissolve-${bp.cooperationId}`,
              title: '待确认：解除固定合作',
              body: `摄影师「${bp.name}」申请解除与你的固定合作，请在「合作邀请」中同意或拒绝。${noteHint}`,
              time: t,
            });
          }
        }
      } catch {
        /* ignore */
      }
    }

    if (form.role === 'photographer' && authStore.accessToken) {
      try {
        const mine = await photographersApi.getMine();
        const coops = mine.makeupCooperations || [];
        for (const c of coops) {
          if (c.dissolvePending && c.dissolveInitiator === 'makeup') {
            const noteHint = String(c.dissolveNote || '').trim()
              ? ` 说明：${String(c.dissolveNote).trim()}`
              : '';
            const t = c.dissolveRequestedAt ? parseTs(c.dissolveRequestedAt) : Date.now();
            coopInviteNotices.push({
              id: `fixed-coop-dissolve-makeup-${c.id}`,
              title: '待确认：妆造师申请解除合作',
              body: `「${c.makeupArtist?.name || '妆造师'}」申请解除固定合作，请在「固定合作妆造师」中处理。${noteHint}`,
              time: t,
            });
          }
        }
      } catch {
        /* ignore */
      }
    }

    const readIds = loadReadIds();
    notices.value = [...coopInviteNotices, ...realOrderNotices, ...realSystemNotices]
      .map((x) => ({
        ...x,
        read: readIds.has(x.id),
        timeText: formatNoticeTime(x.time),
      }))
      .sort((a, b) => b.time - a.time);
  } catch {
    notices.value = [
      {
        id: `sys-load-error-${Date.now()}`,
        title: '系统公告',
        body: '系统通知加载失败，请稍后重试。',
        time: Date.now(),
        timeText: formatNoticeTime(Date.now()),
        read: false,
      },
    ];
  } finally {
    noticesLoading.value = false;
  }
};

const respondCooperationAccept = async (inv: FixedCooperationInvite) => {
  cooperatingRespondId.value = inv.cooperationId;
  try {
    await photographersApi.respondFixedCooperation({
      cooperationId: inv.cooperationId,
      accept: true,
    });
    message.success('已同意与该摄影师建立固定合作');
    await loadCooperationInvites();
    void loadNotices();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    cooperatingRespondId.value = null;
  }
};

const openCoopRejectModal = (inv: FixedCooperationInvite) => {
  coopRejectTarget.value = inv;
  coopRejectReason.value = '';
  coopRejectModalOpen.value = true;
};

const submitCoopReject = async () => {
  const inv = coopRejectTarget.value;
  if (!inv) {
    coopRejectModalOpen.value = false;
    return;
  }
  const reason = coopRejectReason.value.trim();
  if (reason.length < 4) {
    message.warning('请填写拒绝理由（至少 4 个字）');
    return Promise.reject();
  }
  coopRejectSubmitting.value = true;
  cooperatingRespondId.value = inv.cooperationId;
  try {
    await photographersApi.respondFixedCooperation({
      cooperationId: inv.cooperationId,
      accept: false,
      rejectReason: reason,
    });
    message.success('已拒绝该邀请');
    coopRejectModalOpen.value = false;
    coopRejectTarget.value = null;
    await loadCooperationInvites();
    void loadNotices();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    coopRejectSubmitting.value = false;
    cooperatingRespondId.value = null;
  }
};

const openPhotogDissolveRequestModalForCoop = (coop: PhotographerMakeupCooperationMine) => {
  dissolveRequestIsPhotographerSide.value = true;
  dissolveRequestCooperationId.value = coop.id;
  dissolveRequestPartnerLabel.value = String(coop.makeupArtist?.name || '').trim() || '妆造师';
  dissolveRequestReason.value = '';
  dissolveRequestModalOpen.value = true;
};

const openMakeupDissolveRequestModal = (bp: FixedCooperationBoundPhotographer) => {
  dissolveRequestIsPhotographerSide.value = false;
  dissolveRequestCooperationId.value = bp.cooperationId;
  dissolveRequestPartnerLabel.value = String(bp.name || '').trim() || '摄影师';
  dissolveRequestReason.value = '';
  dissolveRequestModalOpen.value = true;
};

const submitDissolveRequest = async () => {
  const reason = dissolveRequestReason.value.trim();
  if (reason.length < 4) {
    message.warning('请填写说明（至少 4 个字）');
    return Promise.reject();
  }
  const cid = dissolveRequestCooperationId.value;
  if (!cid) {
    dissolveRequestModalOpen.value = false;
    return Promise.reject();
  }
  dissolveRequestSubmitting.value = true;
  makeupDissolveRequestCoopId.value = dissolveRequestIsPhotographerSide.value ? null : cid;
  try {
    const raw = await photographersApi.requestFixedCooperationDissolve(reason, cid);
    if (dissolveRequestIsPhotographerSide.value && isPhotographerMinePayload(raw)) {
      applyMineToForm(raw);
    } else if (!dissolveRequestIsPhotographerSide.value) {
      await loadCooperationInvites();
    }
    message.success('已提交解除申请，等待对方确认');
    dissolveRequestModalOpen.value = false;
    dissolveRequestCooperationId.value = null;
    void loadNotices();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
    return Promise.reject();
  } finally {
    dissolveRequestSubmitting.value = false;
    makeupDissolveRequestCoopId.value = null;
  }
};

const photogRespondDissolveForCoop = async (cooperationId: number, accept: boolean) => {
  if (!accept) return;
  dissolveRespondLoadingId.value = cooperationId;
  try {
    const raw = await photographersApi.respondFixedCooperationDissolve({
      cooperationId,
      accept: true,
    });
    if (isPhotographerMinePayload(raw)) {
      applyMineToForm(raw);
    }
    message.success('已同意解除，固定合作已结束');
    void loadNotices();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    dissolveRespondLoadingId.value = null;
  }
};

const openPhotogDissolveRejectModalForCoop = (cooperationId: number) => {
  photogDissolveRejectTargetCoopId.value = cooperationId;
  photogDissolveRejectReason.value = '';
  photogDissolveRejectModalOpen.value = true;
};

const submitPhotogDissolveReject = async () => {
  const cid = photogDissolveRejectTargetCoopId.value;
  const reason = photogDissolveRejectReason.value.trim();
  if (!cid) {
    photogDissolveRejectModalOpen.value = false;
    return;
  }
  if (reason.length < 4) {
    message.warning('请填写拒绝理由（至少 4 个字）');
    return Promise.reject();
  }
  photogDissolveRejectSubmitting.value = true;
  dissolveRespondLoadingId.value = cid;
  try {
    const raw = await photographersApi.respondFixedCooperationDissolve({
      cooperationId: cid,
      accept: false,
      rejectReason: reason,
    });
    if (isPhotographerMinePayload(raw)) {
      applyMineToForm(raw);
    }
    message.success('已拒绝解除申请');
    photogDissolveRejectModalOpen.value = false;
    photogDissolveRejectTargetCoopId.value = null;
    void loadNotices();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
    return Promise.reject();
  } finally {
    photogDissolveRejectSubmitting.value = false;
    dissolveRespondLoadingId.value = null;
  }
};

const makeupAcceptDissolveFromPhotographer = async (bp: FixedCooperationBoundPhotographer) => {
  dissolveRespondLoadingId.value = bp.cooperationId;
  try {
    await photographersApi.respondFixedCooperationDissolve({
      cooperationId: bp.cooperationId,
      accept: true,
    });
    message.success('已同意解除，固定合作已结束');
    await loadCooperationInvites();
    void loadNotices();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    dissolveRespondLoadingId.value = null;
  }
};

const openMakeupDissolveRejectModal = (bp: FixedCooperationBoundPhotographer) => {
  makeupDissolveRejectTarget.value = bp;
  makeupDissolveRejectReason.value = '';
  makeupDissolveRejectModalOpen.value = true;
};

const submitMakeupDissolveReject = async () => {
  const bp = makeupDissolveRejectTarget.value;
  if (!bp) {
    makeupDissolveRejectModalOpen.value = false;
    return;
  }
  const reason = makeupDissolveRejectReason.value.trim();
  if (reason.length < 4) {
    message.warning('请填写拒绝理由（至少 4 个字）');
    return Promise.reject();
  }
  makeupDissolveRejectSubmitting.value = true;
  dissolveRespondLoadingId.value = bp.cooperationId;
  try {
    await photographersApi.respondFixedCooperationDissolve({
      cooperationId: bp.cooperationId,
      accept: false,
      rejectReason: reason,
    });
    message.success('已拒绝解除申请');
    makeupDissolveRejectModalOpen.value = false;
    makeupDissolveRejectTarget.value = null;
    await loadCooperationInvites();
    void loadNotices();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
    return Promise.reject();
  } finally {
    makeupDissolveRejectSubmitting.value = false;
    dissolveRespondLoadingId.value = null;
  }
};

watch(
  () => profileNav.section,
  (s) => {
    if (s === 'cooperation-invites' && form.role === 'makeup') {
      void loadCooperationInvites();
    }
  }
);

watch(
  () => authStore.user?.photographerApprovalStatus,
  () => {
    if (mineProfile.value && authStore.user?.photographerApprovalStatus) {
      mineProfile.value = {
        ...mineProfile.value,
        approvalStatus: String(authStore.user.photographerApprovalStatus),
        approvalReviewNote: authStore.user.photographerApprovalNote ?? null,
      };
    }
  }
);

onMounted(async () => {
  authStore.initializeAuth();
  load();
  if (!String(form.name || '').trim()) {
    form.name = String(authStore.user?.name || '').trim();
  }
  if (authStore.accessToken && authStore.user?.id) {
    try {
      await authStore.getProfile();
      if (!String(form.name || '').trim()) {
        form.name = String(authStore.user?.name || '').trim();
      }
      if (authStore.user?.phone) {
        form.phone = String(authStore.user.phone);
      }
    } catch {
      /* ignore */
    }
  }
  await hydrateFromMine();
  await loadMakeupArtistOptions();
  if (!mineProfile.value) {
    await hydrateFromPublicByName();
  }
  if (form.role === 'makeup') {
    void loadCooperationInvites();
  }
  void loadNotices();
});
</script>

<style scoped lang="less">
.page {
  --pink: #ff6b8b;
  --r: 12px;
  /* 工作台内容区右侧默认较窄，个人中心单独加大右侧留白 */
  padding-right: 24px;
  box-sizing: border-box;
}

.approval-alert {
  margin-bottom: 14px;
}

.approval-missing-tip {
  margin-top: 8px;
  font-size: 13px;
  color: #b45309;
  line-height: 1.5;
}

.schedule-dates-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #dc2626;
  font-weight: 600;
}

.schedule-dates-link {
  color: #b91c1c;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
  margin: 0 2px;
}

.head {
  margin-bottom: 14px;
}
.title {
  font-weight: 900;
  color: #111827;
  font-size: 18px;
  margin-bottom: 4px;
}
.sub {
  color: #6b7280;
  font-size: 13px;
}
.profile-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}

.profile-sider {
  position: sticky;
  top: 16px;
  @media (max-width: 1100px) {
    position: static;
  }
}

.sider-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: var(--r);
  padding: 10px;
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.05);
}

.sider-link {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #4b5563;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: rgba(255, 107, 139, 0.08);
    color: #111827;
  }

  &.active {
    background: rgba(255, 107, 139, 0.14);
    color: var(--pink);
  }
}

.profile-main {
  min-width: 0;
}

@media (max-width: 1100px) {
  .sider-nav {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .sider-link {
    flex: 1 1 auto;
    min-width: 120px;
    text-align: center;
  }
}
.panel {
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.05);
  margin-bottom: 14px;
}
.panel-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.panel-title {
  font-weight: 900;
  color: #111827;
}

.profile-edit-heading {
  font-size: 18px;
  line-height: 1.3;
}

.profile-edit-form :deep(.ant-form-item-label > label) {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  height: auto;
  line-height: 1.45;
}

.pill {
  border-radius: 999px;
  background: var(--pink);
  border-color: var(--pink);
}
:deep(.ant-btn-primary.pill:hover),
:deep(.ant-btn-primary.pill:focus) {
  background: #ef3b5d;
  border-color: #ef3b5d;
}
.pill.ghost {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.18);
  color: #d6336c;
}
.pill-input :deep(.ant-select-selector),
.pill-input :deep(.ant-input) {
  border-radius: 999px !important;
}

.title-readonly-box {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 6px 10px;
  min-height: 32px;
  display: flex;
  align-items: center;
  background: #fafafa;
  box-sizing: border-box;
}

.title-readonly {
  font-size: 14px;
  font-weight: 400;
  color: #111827;
  line-height: 1.5;
  word-break: break-word;
}

.title-readonly-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.45;
}
.profile-card {
  background: linear-gradient(135deg, rgba(255, 107, 139, 0.14) 0%, rgba(255, 155, 180, 0.1) 100%);
  border-color: rgba(255, 107, 139, 0.22);
}
.avatar {
  display: flex;
  gap: 12px;
  align-items: center;
}
.av {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff6b8b 0%, #ff9bb4 100%);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 900;
  box-shadow: 0 12px 24px rgba(255, 107, 139, 0.22);
}
.av.real {
  box-shadow: 0 12px 24px rgba(255, 107, 139, 0.22);
}
.avatar-title-row {
  margin-bottom: 0;
}

.avatar-title-row :deep(.ant-col) {
  display: flex;
}

.avatar-title-row :deep(.ant-form-item) {
  flex: 1;
  width: 100%;
  margin-bottom: 16px;
}

.upload-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.upload-hint {
  font-size: 12px;
  color: #9ca3af;
}
.avatar-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.avatar-url-fallback {
  margin-top: 8px;
}
.meta .n {
  font-weight: 900;
  color: #111827;
  font-size: 16px;
}
.meta .p {
  color: #d6336c;
  font-weight: 800;
  margin-top: 2px;
}
.chips {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  font-size: 12px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.08);
  color: #d6336c;
}
.sec {
  display: grid;
  gap: 10px;
}

.security-panel {
  padding-bottom: 18px;
}

.security-panel-head {
  margin-bottom: 16px;
}

.security-lead {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.65;
  color: #6b7280;
  max-width: 720px;
}

.security-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.security-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 251, 0.9) 100%);
  font-size: 13px;
  color: #374151;
}

.security-status-chip.ok {
  border-color: rgba(255, 107, 139, 0.28);
  background: linear-gradient(135deg, rgba(255, 107, 139, 0.1) 0%, rgba(255, 180, 198, 0.12) 100%);
}

.security-status-chip.pending {
  border-color: rgba(251, 191, 36, 0.45);
  background: linear-gradient(135deg, rgba(254, 252, 232, 0.95) 0%, rgba(255, 251, 235, 0.9) 100%);
}

.security-status-ico {
  font-size: 16px;
  color: #e11d48;
}

.security-status-ico.muted {
  color: #9ca3af;
}

.security-status-label {
  font-weight: 800;
  color: #111827;
}

.security-status-val {
  color: #6b7280;
  font-weight: 600;
}

.security-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.security-card {
  border-radius: 14px;
  border: 1px solid rgba(255, 107, 139, 0.2);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 250, 252, 0.96) 100%);
  padding: 16px 16px 14px;
  box-shadow: 0 8px 24px rgba(255, 107, 139, 0.06);
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;
}

.security-card-top {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.security-card-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 20px;
  color: #be185d;
  background: linear-gradient(135deg, rgba(255, 107, 139, 0.18) 0%, rgba(255, 180, 198, 0.22) 100%);
  border: 1px solid rgba(255, 107, 139, 0.22);
}

.security-card-icon-phone {
  color: #c026d3;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.14) 0%, rgba(244, 114, 182, 0.18) 100%);
  border-color: rgba(236, 72, 153, 0.22);
}

.security-card-text {
  min-width: 0;
}

.security-card-title {
  font-weight: 900;
  font-size: 15px;
  color: #111827;
  margin-bottom: 6px;
}

.security-card-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: #6b7280;
}

.security-card-btn {
  margin-top: auto;
}

.security-hints {
  border-radius: 12px;
  padding: 14px 16px;
  background: rgba(255, 107, 139, 0.06);
  border: 1px dashed rgba(255, 107, 139, 0.28);
}

.security-hints-title {
  font-weight: 900;
  font-size: 13px;
  color: #9d174d;
  margin-bottom: 10px;
}

.security-hints-list {
  margin: 0;
  padding-left: 18px;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.75;
}

.security-hints-list li + li {
  margin-top: 6px;
}

.fixed-makeup-panel {
  padding-bottom: 18px;
}

.fixed-makeup-head {
  margin-bottom: 16px;
}

.fixed-makeup-lead {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.65;
  color: #6b7280;
  max-width: 800px;
}

.fixed-makeup-lead strong {
  color: #374151;
  font-weight: 800;
}

.fixed-makeup-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.fixed-makeup-chip {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(250, 245, 255, 0.5) 100%);
  font-size: 13px;
}

.fixed-makeup-chip.ok {
  border-color: rgba(192, 38, 211, 0.28);
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(244, 114, 182, 0.12) 100%);
}

.fixed-makeup-chip.neutral {
  border-color: rgba(148, 163, 184, 0.35);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%);
}

.fixed-makeup-chip.subtle {
  border-style: dashed;
  border-color: rgba(255, 107, 139, 0.22);
  background: rgba(255, 255, 255, 0.65);
}

.fixed-makeup-chip-ico {
  font-size: 16px;
  color: #a21caf;
}

.fixed-makeup-chip-label {
  font-weight: 800;
  color: #111827;
}

.fixed-makeup-chip-val {
  color: #6b7280;
  font-weight: 600;
}

.fixed-makeup-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  margin-bottom: 20px;
  align-items: stretch;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.fixed-makeup-picker-card,
.fixed-makeup-preview-card {
  border-radius: 14px;
  border: 1px solid rgba(255, 107, 139, 0.2);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 250, 252, 0.96) 100%);
  padding: 16px;
  box-shadow: 0 8px 24px rgba(255, 107, 139, 0.06);
  min-height: 220px;
}

.fixed-makeup-card-cap {
  font-weight: 900;
  font-size: 15px;
  color: #111827;
  margin-bottom: 6px;
}

.fixed-makeup-card-hint {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.6;
  color: #6b7280;
}

.fixed-makeup-form-item {
  margin-bottom: 14px;
}

.fixed-makeup-form-item :deep(.ant-form-item-label > label) {
  font-weight: 700;
  color: #374151;
}

.fixed-makeup-select {
  width: 100%;
}

.fixed-makeup-select :deep(.ant-select-selector) {
  border-radius: 10px !important;
}

.fixed-makeup-save-btn {
  margin-top: 4px;
}

.fixed-makeup-preview-cap {
  font-weight: 900;
  font-size: 13px;
  color: #9d174d;
  margin-bottom: 12px;
}

.fixed-makeup-preview-main {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.fixed-makeup-preview-avatar {
  flex-shrink: 0;
  border: 2px solid rgba(255, 107, 139, 0.25);
}

.fixed-makeup-preview-meta {
  min-width: 0;
}

.fixed-makeup-preview-name {
  font-weight: 900;
  font-size: 16px;
  color: #111827;
  line-height: 1.3;
}

.fixed-makeup-preview-sub {
  margin-top: 4px;
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
}

.fixed-makeup-preview-bio {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #4b5563;
}

.fixed-makeup-dissolve-row {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed rgba(255, 107, 139, 0.25);
}

.fixed-makeup-dissolve-hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #9ca3af;
}

.dissolve-note-in-alert {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(0, 0, 0, 0.75);
}

.coop-dissolve-alert {
  margin-top: 12px;
}

.coop-bound-dissolve-actions {
  margin-top: 12px;
}

.photog-add-coop-card {
  margin-bottom: 16px;
}

.photog-coop-empty {
  margin-bottom: 16px;
}

.photog-coop-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.photog-coop-card {
  border-radius: 14px;
  border: 1px solid rgba(255, 107, 139, 0.2);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 250, 252, 0.96) 100%);
  padding: 16px;
  box-shadow: 0 8px 24px rgba(255, 107, 139, 0.06);
}

.photog-coop-card-top {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.photog-coop-avatar {
  flex-shrink: 0;
  border: 2px solid rgba(255, 107, 139, 0.25);
}

.photog-coop-meta {
  min-width: 0;
  flex: 1;
}

.photog-coop-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.photog-coop-name {
  font-weight: 900;
  font-size: 16px;
  color: #111827;
}

.photog-coop-sub {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
}

.photog-coop-detail-block {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 107, 139, 0.2);
}

.photog-coop-line {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: #4b5563;
}

.photog-coop-line.muted {
  color: #9ca3af;
}

.photog-coop-k {
  font-weight: 800;
  color: #be185d;
  margin-right: 8px;
}

.photog-coop-portfolio {
  margin-top: 10px;
}

.photog-coop-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.photog-coop-thumb {
  border-radius: 8px;
  overflow: hidden;
  object-fit: cover;
}

.photog-coop-invite-note {
  margin-top: 10px;
  font-size: 13px;
  color: #374151;
}

.photog-coop-inline-alert {
  margin-top: 12px;
}

.photog-coop-actions {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* danger + pill 时避免继承深色字，保证文案为白 */
.dissolve-request-btn.ant-btn-dangerous {
  color: #fff !important;
}
.dissolve-request-btn.ant-btn-dangerous :deep(span) {
  color: #fff !important;
}
.dissolve-request-btn.ant-btn-dangerous:hover:not(:disabled),
.dissolve-request-btn.ant-btn-dangerous:focus:not(:disabled) {
  background: #ef3b5d !important;
  border-color: #ef3b5d !important;
  color: #fff !important;
}
.dissolve-request-btn.ant-btn-dangerous:hover:not(:disabled) :deep(span),
.dissolve-request-btn.ant-btn-dangerous:focus:not(:disabled) :deep(span) {
  color: #fff !important;
}
.dissolve-request-btn.ant-btn-dangerous:active:not(:disabled) {
  background: #d6336c !important;
  border-color: #c2255c !important;
  color: #fff !important;
}
.dissolve-request-btn.ant-btn-dangerous:active:not(:disabled) :deep(span) {
  color: #fff !important;
}

.fixed-makeup-preview-k {
  font-weight: 800;
  color: #be185d;
  margin-right: 6px;
}

.fixed-makeup-preview-empty {
  display: flex;
  flex-direction: column;
  border-style: dashed;
  background: rgba(255, 107, 139, 0.04);
}

.fixed-makeup-empty-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 12px 8px 8px;
  min-height: 160px;
}

.fixed-makeup-empty-ico {
  font-size: 36px;
  color: rgba(190, 24, 93, 0.35);
  margin-bottom: 10px;
}

.fixed-makeup-empty-title {
  margin: 0;
  font-weight: 900;
  font-size: 14px;
  color: #374151;
}

.fixed-makeup-empty-desc {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.65;
  color: #6b7280;
  max-width: 280px;
}

.fixed-makeup-hints {
  border-radius: 12px;
  padding: 14px 16px;
  background: rgba(192, 38, 211, 0.06);
  border: 1px dashed rgba(192, 38, 211, 0.28);
}

.fixed-makeup-hints-title {
  font-weight: 900;
  font-size: 13px;
  color: #86198f;
  margin-bottom: 10px;
}

.fixed-makeup-hints-list {
  margin: 0;
  padding-left: 18px;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.75;
}

.fixed-makeup-hints-list li + li {
  margin-top: 6px;
}

.coop-invites-panel {
  padding-bottom: 18px;
}

.coop-invites-head {
  margin-bottom: 16px;
}

.coop-invites-lead {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.65;
  color: #6b7280;
  max-width: 800px;
}

.coop-invites-lead strong {
  color: #374151;
  font-weight: 800;
}

.coop-invites-spin {
  display: block;
  padding: 40px 0;
  text-align: center;
}

.coop-subsection {
  margin-bottom: 22px;
}

.coop-subsection-pending {
  margin-bottom: 0;
  padding-top: 18px;
  border-top: 1px dashed rgba(192, 38, 211, 0.22);
}

.coop-subsection-title {
  font-weight: 900;
  font-size: 15px;
  color: #111827;
  margin-bottom: 6px;
}

.coop-subsection-desc {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.65;
  color: #6b7280;
}

.coop-bound-empty {
  font-size: 13px;
  line-height: 1.65;
  color: #6b7280;
  padding: 14px 12px;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.08);
  border: 1px dashed rgba(148, 163, 184, 0.35);
}

.coop-bound-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.coop-bound-card {
  border-radius: 12px;
  border: 1px solid rgba(16, 185, 129, 0.28);
  background: linear-gradient(180deg, rgba(236, 253, 245, 0.65) 0%, #ffffff 100%);
  padding: 14px;
}

.coop-bound-top {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.coop-bound-avatar {
  flex-shrink: 0;
  border: 2px solid rgba(16, 185, 129, 0.3);
}

.coop-bound-meta {
  min-width: 0;
}

.coop-bound-name {
  font-weight: 900;
  font-size: 15px;
  color: #111827;
}

.coop-bound-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}

.coop-bound-style {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: #4b5563;
}

.coop-invites-empty {
  border-radius: 12px;
  border: 1px dashed rgba(192, 38, 211, 0.28);
  background: rgba(250, 245, 255, 0.6);
  padding: 28px 16px;
  text-align: center;
}

.coop-invites-empty-title {
  margin: 0;
  font-weight: 900;
  font-size: 15px;
  color: #374151;
}

.coop-invites-empty-desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #6b7280;
}

.coop-invites-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.coop-invite-card {
  border-radius: 14px;
  border: 1px solid rgba(192, 38, 211, 0.22);
  background: linear-gradient(180deg, #ffffff 0%, rgba(253, 244, 255, 0.85) 100%);
  padding: 16px;
  box-shadow: 0 8px 22px rgba(192, 38, 211, 0.07);
}

.coop-invite-top {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.coop-invite-avatar {
  flex-shrink: 0;
  border: 2px solid rgba(192, 38, 211, 0.25);
}

.coop-invite-meta {
  min-width: 0;
}

.coop-invite-name {
  font-weight: 900;
  font-size: 16px;
  color: #111827;
}

.coop-invite-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}

.coop-invite-style {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: #4b5563;
}

.coop-invite-note-box {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(192, 38, 211, 0.2);
}

.coop-invite-note-k {
  font-size: 12px;
  font-weight: 800;
  color: #86198f;
}

.coop-invite-note-t {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #374151;
  white-space: pre-wrap;
}

.coop-reject-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.55;
}

.fixed-makeup-reject-at {
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.fixed-makeup-invite-note :deep(textarea) {
  border-radius: 10px;
}

.coop-invite-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.tip {
  margin-top: 10px;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.6;
}
.phone-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}
.notice {
  display: grid;
  gap: 10px;
}
.n-item {
  border-radius: var(--r);
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.06);
  padding: 12px;
  cursor: pointer;
}
.n-item.unread {
  border-color: rgba(255, 107, 139, 0.32);
  background: rgba(255, 107, 139, 0.12);
}
.n-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  color: #111827;
}
.n-state {
  font-size: 12px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 139, 0.25);
}
.n-state.unread {
  color: #be185d;
  background: rgba(255, 107, 139, 0.12);
}
.n-state.read {
  color: #64748b;
  background: rgba(148, 163, 184, 0.12);
  border-color: rgba(148, 163, 184, 0.28);
}
.n-body {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}
.n-time {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}
</style>

<style lang="less">
.ant-btn.profile-ok-btn {
  background: #ff6b8b !important;
  border-color: #ff6b8b !important;
  color: #fff !important;
  box-shadow: none !important;
}

.ant-btn.profile-ok-btn:hover,
.ant-btn.profile-ok-btn:focus,
.ant-btn.profile-ok-btn:active {
  background: #ef476f !important;
  border-color: #ef476f !important;
  color: #fff !important;
  box-shadow: none !important;
}

.ant-btn.profile-cancel-btn:hover,
.ant-btn.profile-cancel-btn:focus,
.ant-btn.profile-cancel-btn:active {
  color: #d6336c !important;
  border-color: #ff9fbc !important;
  background: #fff5f8 !important;
  box-shadow: none !important;
}
</style>
