chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(sender.tab ?
              "from a content script:" + sender.tab.url :
              "from the extension")

  if (request.agentEmail) {
    chrome.tabs.query({ 
      url: 'https://online.moysklad.ru/app/*', currentWindow: true 
    }, function (tabs) {
      console.debug('tabs', tabs)
      chrome.tabs.sendMessage(tabs[0].id, request, function (response) {
        console.log('moysklad tab response', response)
        sendResponse(response)
      })
    })
  }
})

