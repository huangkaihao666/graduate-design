/**
 * 虚拍「第3步」个性化偏好：随第2步「拍摄风格」联动，选项与 TRAVEL_STYLE_LABELS 一致
 */
import type { VirtualTryOnSubjectRole } from '@/constants/virtual-tryon-subject';

export type VtoPrefOption = { value: string; label: string };

export type VtoStyleKey =
  | 'minimalist'
  | 'classical'
  | 'bohemian'
  | 'romantic'
  | 'adventure'
  | 'artistic';

export type VtoPrefGroup = {
  makeup: VtoPrefOption[];
  hairstyle: VtoPrefOption[];
  dress: VtoPrefOption[];
};

/** 各主风格下的妆容 / 发型 / 服装选项（可多选展示，value 全局唯一便于历史记录解析） */
export const VTO_PREFERENCES_BY_STYLE: Record<VtoStyleKey, VtoPrefGroup> = {
  minimalist: {
    makeup: [
      { value: 'ks_bare', label: '韩式裸妆感' },
      { value: 'ks_water', label: '水光清透' },
      { value: 'ks_matte', label: '柔雾哑光' },
      { value: 'ks_eyeline', label: '自然眼线强调' },
      { value: 'ks_peach', label: '蜜桃奶茶色' },
      { value: 'ks_mono', label: '大地单色眼妆' },
      { value: 'ks_glow', label: '高光立体修容' },
    ],
    hairstyle: [
      { value: 'ks_low_bun', label: '低盘韩式髻' },
      { value: 'ks_straight', label: '顺直披肩' },
      { value: 'ks_curl_loose', label: '自然大卷' },
      { value: 'ks_half_up', label: '半扎公主头' },
      { value: 'ks_sleek', label: '贴服低马尾' },
      { value: 'ks_side_part', label: '侧分刘海' },
      { value: 'ks_short', label: '齐肩内扣' },
    ],
    dress: [
      { value: 'ks_mermaid', label: '鱼尾修身主纱' },
      { value: 'ks_a_line', label: 'A字简约主纱' },
      { value: 'ks_satin', label: '缎面抹胸' },
      { value: 'ks_slit', label: '开衩轻礼服' },
      { value: 'ks_suit', label: '西装式婚纱' },
      { value: 'ks_cape', label: '披肩斗篷款' },
      { value: 'ks_short', label: '短款仪式纱' },
    ],
  },
  classical: {
    makeup: [
      { value: 'gf_red_brow', label: '柳叶眉红唇' },
      { value: 'gf_soft', label: '工笔柔雾' },
      { value: 'gf_pearl', label: '珍珠光泽底妆' },
      { value: 'gf_eye', label: '丹凤眼线' },
      { value: 'gf_blush', label: '微醺腮红' },
      { value: 'gf_matte', label: '哑光古典' },
      { value: 'gf_fresh', label: '清透国风' },
    ],
    hairstyle: [
      { value: 'gf_bun', label: '高发髻盘发' },
      { value: 'gf_braid', label: '编发绕髻' },
      { value: 'gf_pin', label: '步摇侧髻' },
      { value: 'gf_long_half', label: '长发半披' },
      { value: 'gf_qipao', label: '旗袍推波' },
      { value: 'gf_flower', label: '簪花造型' },
      { value: 'gf_tassel', label: '流苏额饰款' },
    ],
    dress: [
      { value: 'gf_qipao', label: '改良旗袍婚纱' },
      { value: 'gf_cape', label: '云肩披帛款' },
      { value: 'gf_emb', label: '刺绣龙凤褂元素' },
      { value: 'gf_han', label: '汉元素大袖' },
      { value: 'gf_tea', label: '茶色系长裙' },
      { value: 'gf_garden', label: '园林轻纱' },
      { value: 'gf_tang', label: '唐风齐胸款' },
    ],
  },
  bohemian: {
    makeup: [
      { value: 'hd_sun', label: '阳光健康肌' },
      { value: 'hd_bronze', label: '轻古铜修容' },
      { value: 'hd_gloss', label: '玻璃唇蜜' },
      { value: 'hd_peachy', label: '蜜桃晒伤感' },
      { value: 'hd_nude', label: '裸色眼妆' },
      { value: 'hd_freckle', label: '雀斑点缀' },
      { value: 'hd_wet', label: '湿发感高光' },
    ],
    hairstyle: [
      { value: 'hd_wave', label: '海浪大波浪' },
      { value: 'hd_braid_loose', label: '松散侧辫' },
      { value: 'hd_half', label: '半扎鲜花' },
      { value: 'hd_hat', label: '草编帽搭配' },
      { value: 'hd_wind', label: '风吹碎发' },
      { value: 'hd_curly', label: '拉美卷' },
      { value: 'hd_short', label: '湿发背梳' },
    ],
    dress: [
      { value: 'hd_slit', label: '开衩轻纱' },
      { value: 'hd_lace', label: '蕾丝吊带' },
      { value: 'hd_flow', label: '飘逸雪纺' },
      { value: 'hd_short', label: '短款沙滩纱' },
      { value: 'hd_wrap', label: '裹身度假裙' },
      { value: 'hd_two', label: '两件式纱裙' },
      { value: 'hd_tail', label: '小拖尾轻纱' },
    ],
  },
  romantic: {
    makeup: [
      { value: 'sx_pink', label: '樱花粉眼妆' },
      { value: 'sx_dew', label: '露水肌底妆' },
      { value: 'sx_rosy', label: '玫瑰豆沙唇' },
      { value: 'sx_soft', label: '柔雾眉毛' },
      { value: 'sx_glitter', label: '细闪卧蚕' },
      { value: 'sx_coral', label: '珊瑚橘腮红' },
      { value: 'sx_fresh', label: '果汁感唇釉' },
    ],
    hairstyle: [
      { value: 'sx_half_flower', label: '半扎鲜花' },
      { value: 'sx_braid_crown', label: '花环编发' },
      { value: 'sx_loose', label: '森系披发' },
      { value: 'sx_curtain', label: '空气刘海卷' },
      { value: 'sx_low', label: '慵懒低马尾' },
      { value: 'sx_double', label: '双麻花' },
      { value: 'sx_leaf', label: '藤蔓编发' },
    ],
    dress: [
      { value: 'sx_tulle', label: '蓬蓬纱裙' },
      { value: 'sx_leaf', label: '绿叶刺绣纱' },
      { value: 'sx_lawn', label: '草坪轻拖尾' },
      { value: 'sx_ball', label: '公主 ballgown' },
      { value: 'sx_off', label: '一字肩纱' },
      { value: 'sx_flower', label: '立体花朵纱' },
      { value: 'sx_short', label: '短款森系纱' },
    ],
  },
  adventure: {
    makeup: [
      { value: 'ky_matte', label: '哑光立体' },
      { value: 'ky_bold', label: '浓眉红唇' },
      { value: 'ky_sunset', label: '日落渐变眼影' },
      { value: 'ky_contour', label: '强修容轮廓' },
      { value: 'ky_smoky', label: '轻烟熏' },
      { value: 'ky_nude', label: '高级裸色' },
      { value: 'ky_glitter', label: '金属高光' },
      { value: 'ky_snow_cool', label: '冰感冷调妆（雪山/雪景）' },
    ],
    hairstyle: [
      { value: 'ky_pony', label: '高马尾' },
      { value: 'ky_wind', label: '风吹乱发' },
      { value: 'ky_hat', label: '牛仔帽造型' },
      { value: 'ky_braid', label: '拳击辫' },
      { value: 'ky_loose', label: '大卷披肩' },
      { value: 'ky_short', label: '利落短发' },
      { value: 'ky_half', label: '半扎狼尾' },
      { value: 'ky_snow_cap', label: '毛绒针织帽造型（雪山防风）' },
    ],
    dress: [
      { value: 'ky_trail', label: '长拖尾纱（公路感）' },
      { value: 'ky_slit', label: '高开衩纱裙' },
      { value: 'ky_leather', label: '混搭皮衣外套' },
      { value: 'ky_short', label: '短款旅拍纱' },
      { value: 'ky_pants', label: '纱裙裤装混搭' },
      { value: 'ky_cape', label: '长斗篷纱' },
      { value: 'ky_light', label: '轻量便携纱' },
      { value: 'ky_snow_scene', label: '雪山远景旅拍（披肩/耐寒长纱）' },
    ],
  },
  artistic: {
    makeup: [
      { value: 'js_story', label: '故事感裸妆' },
      { value: 'js_film', label: '胶片感色调' },
      { value: 'js_mono', label: '黑白灰眼妆' },
      { value: 'js_wine', label: '酒红唇妆' },
      { value: 'js_earth', label: '大地陶土色' },
      { value: 'js_gloss', label: '雾面+局部亮' },
      { value: 'js_soft', label: '情绪柔焦' },
    ],
    hairstyle: [
      { value: 'js_loose', label: '自然披肩' },
      { value: 'js_low_bun', label: '慵懒低髻' },
      { value: 'js_side', label: '侧分贴发' },
      { value: 'js_wet', label: '湿发纹理' },
      { value: 'js_hat', label: '礼帽造型' },
      { value: 'js_clip', label: '发夹点缀' },
      { value: 'js_short', label: '耳下短发' },
    ],
    dress: [
      { value: 'js_lite', label: '轻婚纱（便于走动）' },
      { value: 'js_vintage', label: '复古蕾丝' },
      { value: 'js_slip', label: '吊带缎面' },
      { value: 'js_qipao_mod', label: '改良旗袍纱' },
      { value: 'js_coat', label: '长外套叠穿' },
      { value: 'js_black', label: '黑色轻纱' },
      { value: 'js_print', label: '印花纱裙' },
    ],
  },
};

/**
 * 男生单人（新郎/男装）——妆容、发型、服装与新娘侧独立
 */
export const VTO_PREFERENCES_MALE_BY_STYLE: Record<VtoStyleKey, VtoPrefGroup> = {
  minimalist: {
    makeup: [
      { value: 'mg_ks_bare', label: '男士韩式裸妆修容' },
      { value: 'mg_matte_base', label: '哑光立体底妆' },
      { value: 'mg_brow_natural', label: '自然眉形整理' },
      { value: 'mg_contour_soft', label: '轻修容轮廓' },
      { value: 'mg_lip_neutral', label: '裸色/豆沙唇（男）' },
      { value: 'mg_foundation_fresh', label: '清爽控油底妆' },
      { value: 'mg_highlight_subtle', label: '低调高光（T区）' },
    ],
    hairstyle: [
      { value: 'mg_side_part', label: '韩式侧分油头' },
      { value: 'mg_slick_back', label: '服帖背头' },
      { value: 'mg_texture_short', label: '纹理短发' },
      { value: 'mg_pompadour', label: '蓬松飞机头' },
      { value: 'mg_straight_down', label: '顺直垂顺' },
      { value: 'mg_bangs_light', label: '轻薄刘海' },
      { value: 'mg_crew_clean', label: '清爽短寸' },
    ],
    dress: [
      { value: 'mg_suit_black3', label: '黑色西装三件套' },
      { value: 'mg_suit_navy', label: '深蓝修身西装' },
      { value: 'mg_suit_ivory', label: '米白/浅灰西装' },
      { value: 'mg_vest_set', label: '马甲+衬衫三件套' },
      { value: 'mg_tux_bow', label: '塔士多+领结' },
      { value: 'mg_zhongshan', label: '改良中山装/青年装' },
      { value: 'mg_casual_blazer', label: '休闲单西+西裤' },
    ],
  },
  classical: {
    makeup: [
      { value: 'mg_gf_matte', label: '国风儒雅哑光底妆' },
      { value: 'mg_gf_brow', label: '剑眉/英气眉形' },
      { value: 'mg_gf_eye', label: '内敛眼线强调眼神' },
      { value: 'mg_gf_lip', label: '豆沙/陶土唇（男）' },
      { value: 'mg_gf_contour', label: '立体修容（男）' },
      { value: 'mg_gf_even', label: '匀净肤色矫正' },
      { value: 'mg_gf_soft', label: '柔雾定妆' },
    ],
    hairstyle: [
      { value: 'mg_gf_slick', label: '中式全后梳' },
      { value: 'mg_gf_half_tie', label: '半扎发（男）' },
      { value: 'mg_gf_long_tie', label: '束发+发带' },
      { value: 'mg_gf_side', label: '侧分纹理' },
      { value: 'mg_gf_bun_low', label: '低髻（男）' },
      { value: 'mg_gf_hat', label: '礼冠/帽饰搭配' },
      { value: 'mg_gf_braid', label: '编发束发' },
    ],
    dress: [
      { value: 'mg_gf_changshan', label: '长衫马褂套装' },
      { value: 'mg_gf_zhongshan', label: '中山装/青年装' },
      { value: 'mg_gf_emb', label: '刺绣男褂' },
      { value: 'mg_gf_hanfu', label: '汉服男款（圆领/道袍）' },
      { value: 'mg_gf_robe', label: '长袍外褂' },
      { value: 'mg_gf_modern', label: '新中式西装混搭' },
      { value: 'mg_gf_sash', label: '腰封/玉饰点缀' },
    ],
  },
  bohemian: {
    makeup: [
      { value: 'mg_hd_bronze', label: '阳光古铜健康肌' },
      { value: 'mg_hd_matte', label: '哑光控油底妆' },
      { value: 'mg_hd_brow_thick', label: '浓眉自然' },
      { value: 'mg_hd_lip_balm', label: '润色唇膏（男）' },
      { value: 'mg_hd_freckle', label: '雀斑/晒伤感（男）' },
      { value: 'mg_hd_glow', label: '轻光泽高光' },
      { value: 'mg_hd_fresh', label: '海盐清爽妆感' },
    ],
    hairstyle: [
      { value: 'mg_hd_wave', label: '海浪纹理卷发（男）' },
      { value: 'mg_hd_loose', label: '半扎长发（男）' },
      { value: 'mg_hd_hat', label: '草帽/巴拿马帽' },
      { value: 'mg_hd_wind', label: '风吹自然乱发' },
      { value: 'mg_hd_curly', label: '拉美卷（男）' },
      { value: 'mg_hd_manbun', label: '男士丸子头' },
      { value: 'mg_hd_wet', label: '湿发背梳' },
    ],
    dress: [
      { value: 'mg_hd_linen', label: '亚麻休闲西装' },
      { value: 'mg_hd_white_suit', label: '白色/米色沙滩西装' },
      { value: 'mg_hd_vest', label: '马甲+衬衫敞开领' },
      { value: 'mg_hd_shirt_pants', label: '衬衫西裤（卷袖）' },
      { value: 'mg_hd_shorts', label: '西装短裤度假款' },
      { value: 'mg_hd_suspenders', label: '背带西裤' },
      { value: 'mg_hd_light', label: '轻薄单西外套' },
    ],
  },
  romantic: {
    makeup: [
      { value: 'mg_sx_fresh', label: '清新氧气底妆（男）' },
      { value: 'mg_sx_soft', label: '柔雾眉+豆沙唇（男）' },
      { value: 'mg_sx_blush', label: '微醺腮红（男）' },
      { value: 'mg_sx_dew', label: '露水肌（男）' },
      { value: 'mg_sx_eye', label: '卧蚕提亮（男）' },
      { value: 'mg_sx_even', label: '匀亮肤色' },
      { value: 'mg_sx_natural', label: '伪素颜修容' },
    ],
    hairstyle: [
      { value: 'mg_sx_side', label: '微风侧分' },
      { value: 'mg_sx_curl', label: '自然卷发（男）' },
      { value: 'mg_sx_half', label: '半扎发（男）' },
      { value: 'mg_sx_flower', label: '胸花/小花饰固定' },
      { value: 'mg_sx_loose_long', label: '披肩中长发' },
      { value: 'mg_sx_air', label: '空气刘海（男）' },
      { value: 'mg_sx_braid', label: '侧辫点缀' },
    ],
    dress: [
      { value: 'mg_sx_grey_suit', label: '浅灰/燕麦色西装' },
      { value: 'mg_sx_beige', label: '米色西装三件套' },
      { value: 'mg_sx_light', label: '轻薄单西+白裤' },
      { value: 'mg_sx_bow', label: '领结/口袋巾套装' },
      { value: 'mg_sx_knit', label: '针织开衫+西裤' },
      { value: 'mg_sx_tail', label: '短款西装（森系）' },
      { value: 'mg_sx_layer', label: '马甲叠穿' },
    ],
  },
  adventure: {
    makeup: [
      { value: 'mg_ky_matte', label: '哑光运动立体妆' },
      { value: 'mg_ky_contour', label: '强轮廓修容（男）' },
      { value: 'mg_ky_brow', label: '浓眉定型' },
      { value: 'mg_ky_smoky', label: '轻烟熏（男）' },
      { value: 'mg_ky_sunset', label: '日落色眼影（男）' },
      { value: 'mg_ky_nude', label: '高级裸色唇' },
      { value: 'mg_ky_metal', label: '金属高光（局部）' },
    ],
    hairstyle: [
      { value: 'mg_ky_pony', label: '高马尾（男）' },
      { value: 'mg_ky_undercut', label: '两侧剃短Undercut' },
      { value: 'mg_ky_hat', label: '牛仔/渔夫帽造型' },
      { value: 'mg_ky_wind', label: '风吹凌乱纹理' },
      { value: 'mg_ky_braid', label: '拳击辫（男）' },
      { value: 'mg_ky_long', label: '披肩长发（男）' },
      { value: 'mg_ky_short', label: '利落寸头/短发' },
    ],
    dress: [
      { value: 'mg_ky_leather', label: '皮衣+西裤混搭' },
      { value: 'mg_ky_boots', label: '西装+工装靴' },
      { value: 'mg_ky_layer', label: '高领毛衣+西装' },
      { value: 'mg_ky_tech', label: '机能外套+西裤' },
      { value: 'mg_ky_long_coat', label: '长大衣+西装' },
      { value: 'mg_ky_short_suit', label: '短款西装（户外）' },
      { value: 'mg_ky_suspenders', label: '背带西裤+衬衫' },
    ],
  },
  artistic: {
    makeup: [
      { value: 'mg_js_story', label: '故事感淡妆（男）' },
      { value: 'mg_js_film', label: '胶片感肤色' },
      { value: 'mg_js_mono', label: '低饱和眼妆（男）' },
      { value: 'mg_js_wine', label: '酒红唇（男模感）' },
      { value: 'mg_js_stubble', label: '胡茬修饰/干净剃须' },
      { value: 'mg_js_matte', label: '全哑光质感' },
      { value: 'mg_js_soft', label: '情绪柔焦底妆' },
    ],
    hairstyle: [
      { value: 'mg_js_wet', label: '湿发背梳（男）' },
      { value: 'mg_js_mid', label: '慵懒中长发' },
      { value: 'mg_js_side', label: '侧分贴发' },
      { value: 'mg_js_hat', label: '礼帽/报童帽' },
      { value: 'mg_js_clip', label: '发夹/发油造型' },
      { value: 'mg_js_short', label: '耳下短发' },
      { value: 'mg_js_loose', label: '自然披肩（男）' },
    ],
    dress: [
      { value: 'mg_js_black_suit', label: '黑色衬衫西装' },
      { value: 'mg_js_vintage', label: '复古格纹西装' },
      { value: 'mg_js_vest', label: '马甲+背带' },
      { value: 'mg_js_slip_shirt', label: '丝质衬衫+西裤' },
      { value: 'mg_js_coat', label: '长大衣叠穿' },
      { value: 'mg_js_print', label: '印花/条纹西装' },
      { value: 'mg_js_casual', label: '休闲西装混搭' },
    ],
  },
};

/**
 * 双人合影：偏好文案兼顾新娘+新郎（与单人女生/男生列表均不同）
 */
export const VTO_PREFERENCES_COUPLE_BY_STYLE: Record<VtoStyleKey, VtoPrefGroup> = {
  minimalist: {
    makeup: [
      { value: 'cp_ks_even', label: '双人均衡韩式清透妆' },
      { value: 'cp_ks_bride', label: '新娘柔雾+新郎立体修容' },
      { value: 'cp_ks_water', label: '新娘水光+新郎哑光控油' },
      { value: 'cp_ks_mono', label: '大地色系双人均衡' },
      { value: 'cp_ks_peach', label: '蜜桃感新娘+裸唇新郎' },
      { value: 'cp_ks_glow', label: '高光呼应（女面中/男T区）' },
      { value: 'cp_ks_natural', label: '伪素颜双人均衡' },
    ],
    hairstyle: [
      { value: 'cp_ks_bun_side', label: '新娘低盘髻+新郎侧分' },
      { value: 'cp_ks_half', label: '新娘半扎+新郎服帖' },
      { value: 'cp_ks_long', label: '新娘披肩+新郎背头' },
      { value: 'cp_ks_curl', label: '新娘大卷+新郎纹理' },
      { value: 'cp_ks_short', label: '新娘齐肩+新郎短寸' },
      { value: 'cp_ks_match', label: '同色系发饰呼应' },
      { value: 'cp_ks_flower', label: '新娘鲜花+新郎胸花' },
    ],
    dress: [
      { value: 'cp_ks_classic', label: '白纱主纱+黑色西装三件套' },
      { value: 'cp_ks_ivory', label: '象牙婚纱+米白西装' },
      { value: 'cp_ks_tail', label: '拖尾纱+长款西装' },
      { value: 'cp_ks_slim', label: '鱼尾纱+修身西装' },
      { value: 'cp_ks_satin', label: '缎面婚纱+缎面领西装' },
      { value: 'cp_ks_vest', label: '婚纱+马甲三件套' },
      { value: 'cp_ks_light', label: '轻纱+休闲单西' },
    ],
  },
  classical: {
    makeup: [
      { value: 'cp_gf_pair', label: '国风双人均衡妆' },
      { value: 'cp_gf_red', label: '新娘红唇+新郎儒雅底妆' },
      { value: 'cp_gf_soft', label: '工笔柔雾双人均衡' },
      { value: 'cp_gf_pearl', label: '珍珠光泽（女）+哑光（男）' },
      { value: 'cp_gf_eye', label: '眼线呼应（女柔男英）' },
      { value: 'cp_gf_matte', label: '双人均哑光古典' },
      { value: 'cp_gf_fresh', label: '清透国风双人均衡' },
    ],
    hairstyle: [
      { value: 'cp_gf_bun_hat', label: '新娘高发髻+新郎全后梳' },
      { value: 'cp_gf_braid_pair', label: '新娘编发+新郎束发' },
      { value: 'cp_gf_half', label: '新娘半披+新郎侧分' },
      { value: 'cp_gf_pin', label: '新娘步摇+新郎冠饰' },
      { value: 'cp_gf_long', label: '长发双人均衡' },
      { value: 'cp_gf_flower', label: '新娘簪花+新郎玉饰' },
      { value: 'cp_gf_tassel', label: '流苏额饰（女）+简约束发（男）' },
    ],
    dress: [
      { value: 'cp_gf_qipao_suit', label: '改良旗袍婚纱+中山装/男褂' },
      { value: 'cp_gf_han_pair', label: '汉元素男女成套' },
      { value: 'cp_gf_emb', label: '刺绣龙凤元素双套' },
      { value: 'cp_gf_cape', label: '新娘云肩+男长褂' },
      { value: 'cp_gf_tea', label: '茶色系男女礼服' },
      { value: 'cp_gf_garden', label: '园林轻纱+长衫' },
      { value: 'cp_gf_tang', label: '唐风齐胸（女）+圆领袍（男）' },
    ],
  },
  bohemian: {
    makeup: [
      { value: 'cp_hd_sun', label: '阳光健康肌双人均衡' },
      { value: 'cp_hd_bronze', label: '新娘晒伤腮红+新郎古铜' },
      { value: 'cp_hd_gloss', label: '玻璃唇（女）+润唇（男）' },
      { value: 'cp_hd_peach', label: '蜜桃感双人均衡' },
      { value: 'cp_hd_nude', label: '裸色眼妆双人均衡' },
      { value: 'cp_hd_freckle', label: '雀斑晒伤双人均衡' },
      { value: 'cp_hd_wet', label: '湿发感高光双人均衡' },
    ],
    hairstyle: [
      { value: 'cp_hd_wave_pair', label: '海浪卷（女）+纹理卷（男）' },
      { value: 'cp_hd_braid', label: '新娘侧辫+男半扎' },
      { value: 'cp_hd_half', label: '新娘半扎鲜花+男草帽' },
      { value: 'cp_hd_hat', label: '同系列草帽/礼帽' },
      { value: 'cp_hd_wind', label: '风吹双人均衡造型' },
      { value: 'cp_hd_curly', label: '拉美卷双人均衡' },
      { value: 'cp_hd_wet', label: '湿发背梳双人均衡' },
    ],
    dress: [
      { value: 'cp_hd_slit', label: '开衩轻纱+亚麻西装' },
      { value: 'cp_hd_white', label: '白纱+白沙滩西装' },
      { value: 'cp_hd_flow', label: '雪纺纱+衬衫西裤' },
      { value: 'cp_hd_short', label: '短款纱+短裤西装' },
      { value: 'cp_hd_wrap', label: '裹身纱+马甲套装' },
      { value: 'cp_hd_two', label: '两件式纱+度假西装' },
      { value: 'cp_hd_tail', label: '小拖尾+轻薄西装' },
    ],
  },
  romantic: {
    makeup: [
      { value: 'cp_sx_pink', label: '新娘樱花粉+新郎清新底妆' },
      { value: 'cp_sx_dew', label: '露水肌双人均衡' },
      { value: 'cp_sx_rosy', label: '玫瑰豆沙双人均衡' },
      { value: 'cp_sx_soft', label: '柔雾眉双人均衡' },
      { value: 'cp_sx_glitter', label: '细闪卧蚕双人均衡' },
      { value: 'cp_sx_coral', label: '珊瑚橘腮红（女）+修容（男）' },
      { value: 'cp_sx_fresh', label: '果汁感双人均衡' },
    ],
    hairstyle: [
      { value: 'cp_sx_flower', label: '新娘花环+新郎胸花呼应' },
      { value: 'cp_sx_half', label: '新娘半扎+男侧分' },
      { value: 'cp_sx_loose', label: '森系披肩双人均衡' },
      { value: 'cp_sx_curtain', label: '新娘空气刘海+男纹理' },
      { value: 'cp_sx_low', label: '慵懒低马尾双人均衡' },
      { value: 'cp_sx_double', label: '双麻花（女）+短辫（男）' },
      { value: 'cp_sx_leaf', label: '藤蔓编发双人均衡' },
    ],
    dress: [
      { value: 'cp_sx_tulle', label: '蓬蓬纱+浅灰西装' },
      { value: 'cp_sx_leaf', label: '绿叶刺绣纱+米色西装' },
      { value: 'cp_sx_lawn', label: '草坪拖尾+轻便西装' },
      { value: 'cp_sx_ball', label: '公主纱+塔士多' },
      { value: 'cp_sx_off', label: '一字肩纱+领结西装' },
      { value: 'cp_sx_flower', label: '立体花纱+口袋巾西装' },
      { value: 'cp_sx_short', label: '短款森系纱+短西装' },
    ],
  },
  adventure: {
    makeup: [
      { value: 'cp_ky_matte', label: '哑光立体双人均衡' },
      { value: 'cp_ky_bold', label: '新娘红唇+新郎浓眉' },
      { value: 'cp_ky_sunset', label: '日落眼影双人均衡' },
      { value: 'cp_ky_contour', label: '强修容双人均衡' },
      { value: 'cp_ky_smoky', label: '轻烟熏双人均衡' },
      { value: 'cp_ky_nude', label: '高级裸色双人均衡' },
      { value: 'cp_ky_glitter', label: '金属高光双人均衡' },
    ],
    hairstyle: [
      { value: 'cp_ky_pony', label: '新娘高马尾+男背头' },
      { value: 'cp_ky_wind', label: '风吹乱发双人均衡' },
      { value: 'cp_ky_hat', label: '牛仔帽双人均衡' },
      { value: 'cp_ky_braid', label: '拳击辫（女）+Undercut（男）' },
      { value: 'cp_ky_loose', label: '大卷披肩双人均衡' },
      { value: 'cp_ky_short', label: '利落短发双人均衡' },
      { value: 'cp_ky_half', label: '半扎狼尾双人均衡' },
    ],
    dress: [
      { value: 'cp_ky_trail', label: '长拖尾纱+长款西装' },
      { value: 'cp_ky_slit', label: '高开衩纱+皮衣西装' },
      { value: 'cp_ky_leather', label: '纱裙+皮衣混搭（双套）' },
      { value: 'cp_ky_short', label: '短款旅拍纱+短西装' },
      { value: 'cp_ky_pants', label: '纱裙裤装+男西裤' },
      { value: 'cp_ky_cape', label: '长斗篷纱+长大衣' },
      { value: 'cp_ky_light', label: '轻量纱+便携西装' },
    ],
  },
  artistic: {
    makeup: [
      { value: 'cp_js_story', label: '故事感双人均衡妆' },
      { value: 'cp_js_film', label: '胶片感肤色双人均衡' },
      { value: 'cp_js_mono', label: '黑白灰眼妆双人均衡' },
      { value: 'cp_js_wine', label: '酒红唇（女）+酒红点缀（男）' },
      { value: 'cp_js_earth', label: '大地陶土双人均衡' },
      { value: 'cp_js_gloss', label: '雾面+局部亮双人均衡' },
      { value: 'cp_js_soft', label: '情绪柔焦双人均衡' },
    ],
    hairstyle: [
      { value: 'cp_js_loose', label: '自然披肩双人均衡' },
      { value: 'cp_js_low_bun', label: '慵懒低髻+男低马尾' },
      { value: 'cp_js_side', label: '侧分贴发双人均衡' },
      { value: 'cp_js_wet', label: '湿发纹理双人均衡' },
      { value: 'cp_js_hat', label: '礼帽双人均衡' },
      { value: 'cp_js_clip', label: '发夹点缀双人均衡' },
      { value: 'cp_js_short', label: '耳下短发双人均衡' },
    ],
    dress: [
      { value: 'cp_js_lite', label: '轻婚纱+轻便西装' },
      { value: 'cp_js_vintage', label: '复古蕾丝纱+格纹西装' },
      { value: 'cp_js_slip', label: '吊带缎面+丝衬衫' },
      { value: 'cp_js_qipao_mod', label: '改良旗袍纱+新中式男' },
      { value: 'cp_js_coat', label: '长外套叠穿双套' },
      { value: 'cp_js_black', label: '黑色轻纱+黑西装' },
      { value: 'cp_js_print', label: '印花纱+条纹西装' },
    ],
  },
};

/** 默认使用韩式简约一组（兜底） */
export function getVtoPreferencesForStyle(
  style: string | undefined,
  subjectRole: VirtualTryOnSubjectRole = 'female'
): VtoPrefGroup {
  const raw = (style as VtoStyleKey) || 'minimalist';
  const sk = raw in VTO_PREFERENCES_BY_STYLE ? raw : 'minimalist';

  if (subjectRole === 'male') {
    return VTO_PREFERENCES_MALE_BY_STYLE[sk] ?? VTO_PREFERENCES_MALE_BY_STYLE.minimalist;
  }
  if (subjectRole === 'couple') {
    return VTO_PREFERENCES_COUPLE_BY_STYLE[sk] ?? VTO_PREFERENCES_COUPLE_BY_STYLE.minimalist;
  }
  return VTO_PREFERENCES_BY_STYLE[sk] ?? VTO_PREFERENCES_BY_STYLE.minimalist;
}

/** 合并女生/男生/双人全部 value→label，供历史记录展示 */
function mergeAllPrefMaps(pick: (g: VtoPrefGroup) => VtoPrefOption[]): Record<string, string> {
  const out: Record<string, string> = {};
  const all: VtoPrefGroup[] = [
    ...Object.values(VTO_PREFERENCES_BY_STYLE),
    ...Object.values(VTO_PREFERENCES_MALE_BY_STYLE),
    ...Object.values(VTO_PREFERENCES_COUPLE_BY_STYLE),
  ];
  all.forEach((g) => {
    pick(g).forEach((o) => {
      out[o.value] = o.label;
    });
  });
  return out;
}

export const VTO_MAKEUP_LABELS = mergeAllPrefMaps((g) => g.makeup);
export const VTO_HAIRSTYLE_LABELS = mergeAllPrefMaps((g) => g.hairstyle);
export const VTO_DRESS_LABELS = mergeAllPrefMaps((g) => g.dress);
