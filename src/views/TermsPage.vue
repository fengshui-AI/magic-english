<template>
  <div class="legal-page">
    <div class="legal-container">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <h1>用户协议</h1>
      <p class="update-date">最后更新日期：2026 年 7 月 15 日</p>

      <section>
        <h2>1. 服务说明</h2>
        <p>
          豆语星球是一款面向 6-12 岁儿童的 AI
          陪伴式英语学习应用。通过虚拟宠物"豆豆"的陪伴和趣味学习循环，帮助儿童建立英语学习习惯，提升学习兴趣。
        </p>
        <p>本协议是您（以下称"用户"）与豆语星球运营方之间关于使用本服务的法律协议。</p>
      </section>

      <section>
        <h2>2. 账号注册与管理</h2>
        <ul>
          <li>儿童账号需由家长（监护人）通过手机号注册</li>
          <li>用户应妥善保管账号和密码，对账号下的所有行为负责</li>
          <li>禁止将账号出借、转让或用于商业目的</li>
          <li>如发现账号被盗用，应立即联系客服处理</li>
        </ul>
      </section>

      <section>
        <h2>3. 用户行为规范</h2>
        <p>用户在使用本服务时，不得从事以下行为：</p>
        <ul>
          <li>发布违法、违规或不良信息</li>
          <li>利用技术手段干扰或破坏服务正常运行</li>
          <li>反向工程、破解或修改本服务的任何部分</li>
          <li>利用本服务进行任何形式的商业活动（未经授权）</li>
        </ul>
      </section>

      <section>
        <h2>4. 知识产权</h2>
        <ul>
          <li>
            豆语星球的所有内容（包括但不限于文字、图片、音频、动画、代码）均受知识产权法律保护
          </li>
          <li>未经书面许可，任何人不得复制、传播、修改或用于商业目的</li>
          <li>用户在学习过程中产生的数据归用户所有</li>
        </ul>
      </section>

      <section>
        <h2>5. 免责声明</h2>
        <ul>
          <li>本服务按"现状"提供，不保证完全无中断或无错误</li>
          <li>AI 生成的对话内容可能存在不准确之处，仅供参考</li>
          <li>因不可抗力（如自然灾害、网络攻击）导致的服务中断，我们不承担责任</li>
        </ul>
      </section>

      <section>
        <h2>6. 服务变更与终止</h2>
        <ul>
          <li>我们有权根据产品发展需要调整服务内容，并提前通知用户</li>
          <li>如用户违反本协议，我们有权暂停或终止服务</li>
          <li>用户可随时通过家长端注销账号</li>
        </ul>
      </section>

      <section>
        <h2>7. 争议解决</h2>
        <p>
          本协议适用中华人民共和国法律。因本协议产生的争议，双方应友好协商解决；协商不成的，提交有管辖权的法院处理。
        </p>
      </section>

      <section>
        <h2>8. 联系我们</h2>
        <ul>
          <li>邮箱：support@magic-english.cn</li>
          <li>客服电话：400-XXX-XXXX</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// 用户协议页面 — 纯静态内容
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
</style>
