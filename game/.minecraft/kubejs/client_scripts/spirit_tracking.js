NetworkEvents.dataReceived('mk_spirit_form', (ev) => {
  if (global.mkSetSpiritForm) global.mkSetSpiritForm(String(ev.data.getString('id')), String(ev.data.getString('kind')))
})
NetworkEvents.dataReceived('mk_spirit_check', (ev) => {
  ;['wheel', 'fusion'].forEach((kind) => {
    var id = String(ev.data.getString(kind)), label = kind === 'wheel' ? '魔虚罗' : '颚吐'
    var form = id && global.mkRenderedSpirit ? global.mkRenderedSpirit(id) : null
    var state = !id ? '尚未召唤' : !Platform.isLoaded('cataclysm') ? '客户端缺少 L_Ender’s Cataclysm'
      : form ? '客户端已绘制 ' + form : '尚无绘制记录，请靠近并看向这只式神后再查'
    ev.player.tell(label + ' · ' + state)
  })
})
