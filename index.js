import { Router } from 'itty-router'
import { v4 as uuidv4 } from 'uuid'
import index from './html/home.html'
import display from './html/message.html'
const router = Router()

addEventListener('fetch', e => {
  e.respondWith(router.handle(e.request))
})

router.GET("/", () => {
  return new Response(index, {
    headers: { 'Content-Type': 'text/html' },
  });
})

// 储存信息
router.POST("/message", async request => {
  // 获取表单并进行储存
  const body = await request.json()
  console.log(body)
  let id = uuidv4()
  if (body.ttld > 30) {
    body.ttld = 1
  }
  if (body.message) {
    body.visit = 0
    body.createTime = new Date().toLocaleString()
    await setKV(id, JSON.stringify(body), body.ttld * 86400)
    // 成功的话，返回id，由前端拼接获得分享链接
    return new Response(id, { status: 200 });
  } else {
    return new Response("failed to create message", { status: 400 })
  }
})

// 根据id获取kv中储存的信息
router.GET("/message/:id", async ({ params }) => {
  let id = decodeURIComponent(params.id)
  let msg = await getKV(id)
  let data = JSON.parse(msg)
  if (data == null) {
    console.log("cannot find kv")
    return new Response(displayPage(JSON.stringify({ message: "" })), { headers: { 'Content-Type': 'text/html' }, status: 200 })
  }

  // 对于访问次数的判断
  if (data.maxvists != 0) {
    data.visit = data.visit + 1
    if (data.visit == data.maxvists) {
      // 删除KV
      console.log("delete kv: " + id)
      await delKV(id)
    } else if (data.visit > data.maxvists) {
      // 清空
      data.message = ""
      data.encrypt = false
    } else {
      // 更新KV
      await setKV(id, JSON.stringify(data))
    }
  }

  data.visit = 0
  data.maxvists = 0
  return new Response(displayPage(JSON.stringify(data)), { headers: { 'Content-Type': 'text/html' }, status: 200 })
})

router.all("*", () => new Response("404, not found!", { status: 404 }))
// 消息默认有效期都为一天
const setKV = async (id, message, ttl = 86400) => PIGEON.put(id, message, { expirationTtl: ttl })
const getKV = async (id) => PIGEON.get(id)
const delKV = async (id) => PIGEON.delete(id)

String.prototype.interpolate = function (params) {
  const names = Object.keys(params);
  const vals = Object.values(params);
  return new Function(...names, `return \`${this}\`;`)(...vals);
}

var sprintf = (str, ...argv) => !argv.length ? str :
  sprintf(str = str.replace(sprintf.token || "$$", argv.shift()), ...argv);
// 信息展示页
const displayPage = (data) => {
  return sprintf(display, data)
}
