InboxSDK.load('1.0', 'sdk_moysklad_gmail_c6ce2e116e').then(function (sdk) {
	sdk.Conversations.registerThreadViewHandler(function (threadView) {
		var el = document.createElement('div')
		el.innerHTML = '<div>Контент</div>'

		threadView.addSidebarContentPanel({
			title: 'МойСклад',
			el: el
		})

		threadView.on('contactHover', function (e) {
			console.debug('contactHover', e.contact.emailAddress)

			chrome.runtime.sendMessage({ agentEmail: e.contact.emailAddress }, function (response) {
				console.log('response', response)
			})
		})
	})
})
