// window.onload =

;(function () {
  const { chrome, moyskladRouter } = window
  const moysklad = require('moysklad-client')

  let client = moysklad.createClient()
  client.options.flowControl = 'async'

  let router = moyskladRouter().start()

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(sender.tab
      ? 'from a content script:' + sender.tab.url
      : 'from the extension', request)

    if (request.type === 'GET_AGENTS_INFO') {
      client.from('company')
        .filter('contact.email', request.agentEmails)
        .load((err, agents) => {
          if (err) { return sendResponse(null) }
          sendResponse(agents.map(agent => ({
            id: agent.uuid,
            name: agent.name,
            email: agent.contact.email,
            phone: agent.contact.phones
          })))
        })

      return true // wait for sendResponse
    } else if (request.type === 'SHOW_AGENT') {
      // https://online.moysklad.ru/app/#Company/view?id=0018da30-0f30-4f14-87ab-64d57c8ffeef

      router.navigate('Company/view', request.agentId)

      // window.location = 'https://online.moysklad.ru/app/#Company/view?id=' + request.agentId
    }
  })
})()
