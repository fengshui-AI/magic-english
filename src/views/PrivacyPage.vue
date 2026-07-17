<template>
  <div class="legal-page">
    <div class="legal-container">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <h1>隐私政策</h1>
      <p class="update-date">最后更新日期：2026 年 7 月 15 日</p>

      <section>
        <h2>1. 我们收集的信息</h2>
        <p>
          豆语星球（以下简称"我们"）深知儿童隐私保护的重要性。我们仅收集提供服务所必需的最小化信息：
        </p>
        <ul>
          <li><strong>账号信息</strong>：家长手机号（用于账号注册和找回）、儿童昵称、年级</li>
          <li><strong>学习数据</strong>：单词学习记录、发音练习记录、学习时长、对话内容</li>
          <li><strong>设备信息</strong>：设备型号、操作系统版本（用于适配和问题排查）</li>
        </ul>
        <p class="highlight">
          我们<strong>不会</strong>收集儿童的精确位置、通讯录、相册、或其他非必要个人信息。
        </p>
      </section>

      <section>
        <h2>2. 信息的使用</h2>
        <p>我们收集的信息仅用于以下目的：</p>
        <ul>
          <li>提供个性化学习内容推荐</li>
          <li>生成学习报告供家长查看</li>
          <li>优化产品体验和修复问题</li>
          <li>履行法律义务</li>
        </ul>
      </section>

      <section>
        <h2>3. 儿童隐私保护</h2>
        <p>我们严格遵守《儿童个人信息网络保护规定》：</p>
        <ul>
          <li>儿童账号由家长通过手机号注册和管理</li>
          <li>家长可通过"家长端"查看和管理儿童的学习数据</li>
          <li>儿童个人信息仅用于学习服务，不会用于营销或广告</li>
          <li>家长可随时申请导出或删除儿童的所有数据</li>
        </ul>
      </section>

      <section>
        <h2>4. 数据安全</h2>
        <p>我们采用以下措施保护您的数据安全：</p>
        <ul>
          <li>数据传输全程使用 HTTPS 加密</li>
          <li>数据库访问使用严格的权限控制</li>
          <li>定期进行安全审计和漏洞扫描</li>
          <li>敏感数据（如密码）使用加密存储</li>
        </ul>
      </section>

      <section>
        <h2>5. 数据存储和删除</h2>
        <ul>
          <li>数据存储于腾讯云 CloudBase（中国大陆）</li>
          <li>账号注销后，所有个人数据将在 30 天内彻底删除</li>
          <li>家长可联系客服申请数据导出</li>
        </ul>
      </section>

      <section>
        <h2>6. 联系我们</h2>
        <p>如对隐私政策有任何疑问，请联系：</p>
        <ul>
          <li>邮箱：privacy@magic-english.cn</li>
          <li>客服邮箱：support@magic-english.app</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// 隐私政策页面 — 纯静态内容
</script>

<style scoped>
.legal-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  padding: 20px;
}

.legal-container {
  max-width: 720px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 2px 16px rgba(108, 92, 231, 0.08);
}

.back-btn {
  background: none;
  border: 1px solid #6c5ce7;
  color: #6c5ce7;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #6c5ce7;
  color: #fff;
}

h1 {
  font-size: 28px;
  color: #2d3436;
  margin-bottom: 8px;
}

.update-date {
  color: #999;
  font-size: 13px;
  margin-bottom: 32px;
}

section {
  margin-bottom: 28px;
}

h2 {
  font-size: 18px;
  color: #6c5ce7;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0edff;
}

p {
  font-size: 15px;
  color: #555;
  line-height: 1.8;
  margin-bottom: 8px;
}

ul {
  padding-left: 20px;
}

li {
  font-size: 14px;
  color: #555;
  line-height: 2;
}

.highlight {
  background: #fff3cd;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 3px solid #ffc107;
  font-size: 14px;
  color: #856404;
}
</style>
