;(function () {
  const chrome = window.chrome

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // console.log(sender.tab
    //   ? 'from a content script:' + sender.tab.url
    //   : 'from the extension', request)

    if (request.targetTab) {
      chrome.tabs.query({
        url: request.targetTab, currentWindow: true
      }, function (tabs) {
        // console.debug('tabs', tabs)
        if (!tabs.length) { return sendResponse(null) }

        chrome.tabs.sendMessage(tabs[0].id, request, function (response) {
          // console.log('moysklad tab response', response)
          sendResponse(response)
        })

        if (request.switchTab) {
          chrome.tabs.update(tabs[0].id, { active: true })
        }
      })

      // this will keep the message channel open to the other end until sendResponse is called
      return true
    }
  })
})()

