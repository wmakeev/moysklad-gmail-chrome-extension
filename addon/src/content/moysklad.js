;(function () {
  const DEBUG = false

  function log () {
    if (DEBUG) console.debug.apply(console, arguments)
  }

  const { chrome, moyskladRouter } = window
  const moysklad = require('moysklad-client')

  let client = moysklad.createClient()
  client.options.flowControl = 'async'

  let router = moyskladRouter().start()

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    log(sender.tab
      ? 'from a content script:' + sender.tab.url : 'from the extension', request)

    if (!request.agentEmails.length) { return }

    switch (request.type) {
      case 'GET_AGENTS_INFO':
        client.from('company')
        .filter('contact.email', request.agentEmails)
        .count(10) // Max 10
        .load((err, agents) =>
          err ? sendResponse({ error: err.message }) : sendResponse(agents))

        return true // wait for sendResponse

      case 'SHOW_AGENT':
        router.navigate('Company/view', request.agentId)
        break
    }
  })
})()
