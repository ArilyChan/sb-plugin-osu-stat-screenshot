const defaultOptions = {
  base: 'http://localhost:3006'
}
const specialChars = {
  '&': '&amp;',
  '[': '&#91;',
  ']': '&#93;',
  ',': '&#44;'
}
function unescapeSpecialChars(chars){
    chars = chars.toString()
    Object.entries(specialChars).map(([replace,find]) => {
      chars = chars.split(find).join(replace)
    })
    return chars
  }

const { Cluster } = require('puppeteer-cluster');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const VIEWPORT = { width: 992, height: 800, deviceScaleFactor: 1.5 };
module.exports.name ='sc-stat'
module.exports.apply = async (app, options, storage) => {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 2,
  })
  cluster.task(async ({ page, data: {url, meta} }) => {
    console.log(url)
      await page.setViewport(VIEWPORT);
      await page.goto(url);
      await wait(1000);
      // await page.goto(url);
      const screen = await page.screenshot({
        type: "jpeg",
        encoding: "base64", 
        fullPage: true
      });
      // Store screenshot, do something else
      const cqcode = `[CQ:image,file=base64://${screen}]`
      meta.$send(cqcode).catch(err => console.warn(err))
  })


  app.middleware((meta, next) => {
    if (!meta.message.startsWith('!!stat')) { return next() }
    let mode = undefined
    const command = meta.message.split(' ')
    const username = unescapeSpecialChars(command.slice(1).join(' ').trim())
    if (!username) return meta.$send('提供一下用户名。 !!stat(@模式:[osu, taiko, fruits, mania]) osuid\nex: !!stat arily, !!stat@mania arily')

    if (!command[0].includes('@')) mode = undefined
    mode = command[0].split('@')[1]
    if (!['osu', 'taiko', 'fruits', 'mania', undefined].includes(mode)) return meta.$send(`模式有 osu, taiko, fruits, mania. ${mode}不在其中。`)

  cluster.queue({
    url: `http://localhost:3000/users/${username}/${mode ? mode : ''}`,
    meta
  })
  })
}
