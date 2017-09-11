;(function () {
  const DEBUG = false

  function log () {
    if (DEBUG) console.debug.apply(console, arguments)
  }

  const { chrome, moyskladRouter } = window
  const ms = window.MoyskladCore()
  const router = moyskladRouter().start()

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    log(sender.tab
      ? 'from a content script:' + sender.tab.url : 'from the extension', request)

    switch (request.type) {
      case 'GET_COUNTERPARTIES_INFO':
        if (request.counterpartyEmails && request.counterpartyEmails.length) {
          Promise.all(request.counterpartyEmails.map(email => {
            return ms.GET('entity/counterparty', {
              search: email,
              limit: 10
            })
          })).then(responses => {
            sendResponse(responses
              .reduce((counterparties, resp) => counterparties.concat(resp.rows), []))
          }).catch(err => {
            sendResponse({ error: err.message })
          })

          return true // wait for sendResponse
        }
        break

      case 'SHOW_COUNTERPARTY':
        router.navigate('Company/view', request.counterpartyId)
        break
    }
  })
})()
