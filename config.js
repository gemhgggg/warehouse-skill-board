window.SKILL_BOARD_CONFIG = {
  // 公开配置：填写 Supabase 项目 URL 和 anon key。anon key 可用于浏览器端，不能填写 service_role key。
  backendUrl: "https://odvlzayqimpokznfoezh.supabase.co",
  anonKey: "sb_publishable_PGHqPLLzDtDF5aQszJHjhw_nNg-CD8C",
  // 登录框仍显示手机号，程序会把手机号映射为此域名下的内部账号。
  authEmailDomain: "skillboard.local",
  defaultSiteId: "funing",
  sites: {
    funing: { name: "阜宁基地" },
    hefei: { name: "合肥基地" },
  },
};
