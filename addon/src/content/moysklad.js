;(function () {
  const { chrome, moyskladRouter } = window
  const moysklad = require('moysklad-client')

  let client = moysklad.createClient()
  client.options.flowControl = 'async'

  let router = moyskladRouter().start()

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // console.log(sender.tab
    //   ? 'from a content script:' + sender.tab.url
    //   : 'from the extension', request)

    switch (request.type) {
      case 'GET_AGENTS_INFO':
        client.from('company')
        .filter('contact.email', request.agentEmails)
        .load((err, agents) =>
          err ? sendResponse({ error: err.message }) : sendResponse(agents))

        return true // wait for sendResponse

      case 'SHOW_AGENT':
        router.navigate('Company/view', request.agentId)
        break
    }
  })
})()
