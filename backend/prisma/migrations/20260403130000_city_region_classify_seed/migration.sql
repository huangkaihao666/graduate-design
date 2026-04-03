-- 明确海外城市 → 国外（若库中已有这些城市名）
UPDATE `cities`
SET `region` = 'international'
WHERE `name` IN ('罗马', '巴黎', '马尔代夫');

-- 港澳台及台湾地区常用城市/地区名称 → 国内
UPDATE `cities`
SET `region` = 'domestic'
WHERE `name` IN (
  '香港',
  '澳门',
  '台湾',
  '中国香港',
  '中国澳门',
  '中国台湾',
  '台北',
  '台中',
  '高雄',
  '新北',
  '桃园',
  '台南',
  '新竹',
  '嘉义',
  '基隆',
  '宜兰',
  '花莲',
  '台东',
  '澎湖',
  '金门',
  '马祖'
);
