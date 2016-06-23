;(function () {
  const { chrome, InboxSDK, Kefir } = window

  let mouseEventsToElementsHandler = predicate => (emitter, e) => {
    if (e.type === 'end') {
      emitter.end()
    } else if (e.type === 'value') {
      let mouseEvent = e.value
      for (let i = mouseEvent.path.length - 1; i >= 0; i--) {
        let el = mouseEvent.path[i]
        if (predicate(el)) {
          emitter.emit(el)
          // emitter.end()
          break
        }
      }
    }
  }

  let elementClassFilter = className => el => {
    let classAttr = el.getAttribute && el.getAttribute('class')
    if (typeof classAttr === 'string') {
      let classes = classAttr.split(/\s/g)
      return classes.some(cls => cls === className)
    }
    return false
  }

  let sidebarEl = document.createElement('div')

  let wrapSidebarContent = contentHtml => `
    <div style="
      padding: 10px;
      border-color: #d8d8d8;
      border-width: 1px;
      border-right-style: solid;
      border-left-style: solid;">
      ${contentHtml}
    </div>`

  let updateSidebarContent = contentHtml => {
    sidebarEl.innerHTML = wrapSidebarContent(contentHtml)
  }

  let getSidebarAgentsInfoHtml = agents => agents.map(agent =>
      `<a class="msext-agent-info" data-agent-id="${agent.id}"
        href="javascript:">${agent.name}</a>`)

  let updateAgentsInfo = agents => updateSidebarContent(getSidebarAgentsInfoHtml(agents))

  let sidebarClicks$ = Kefir.fromEvents(sidebarEl, 'click')
  // sidebarClicks$.log('sidebarClicks$')

  sidebarClicks$
    .withHandler(mouseEventsToElementsHandler(elementClassFilter('msext-agent-info')))
    .map(el => el.dataset.agentId)
    // .log('clickedAgentInfoElements$')
    .onValue(agentId => {
      chrome.runtime.sendMessage({
        type: 'SHOW_AGENT',
        targetTab: 'https://online.moysklad.ru/app/*',
        switchTab: true,
        agentId
      })
    })

  InboxSDK.load('1.0', 'sdk_moysklad_gmail_c6ce2e116e').then(function (sdk) {
    let currentThreadView

    let updateCurrentThreadSidebar = threadView => {
      if (!threadView) { return }

      let messageViews = threadView.getMessageViewsAll()

      let sendersByEmail = messageViews
        .reduce((res, messageView) => {
          let contacts = []
          try {
            contacts.push(messageView.getSender())
          } catch (e) {}
          try {
            contacts = contacts.concat(messageView.getRecipients())
          } catch (e) {}

          return res.concat(contacts)
        }, [])
        .reduce((res, contact) => {
          res[contact.emailAddress] = contact
          return res
        }, {})

      // console.log('sendersByEmail', sendersByEmail)

      chrome.runtime.sendMessage({
        type: 'GET_AGENTS_INFO',
        targetTab: 'https://online.moysklad.ru/app/*',
        agentEmails: Object.keys(sendersByEmail)
      }, response => {
        // console.log('response', response)

        if (response && response.length) {
          updateAgentsInfo(response)
        } else {
          // TODO Ссылка на переписку
          updateSidebarContent('Нет данных')
        }
      })
    }

    sdk.Conversations.registerThreadViewHandler(threadView => {
      // console.log('ThreadViewHandler')
      currentThreadView = threadView

      updateCurrentThreadSidebar(threadView)

      threadView.addSidebarContentPanel({
        title: 'МойСклад',
        el: sidebarEl
      })

      threadView.on('destroy', () => updateSidebarContent('Нет данных'))
    })

    sdk.Conversations.registerMessageViewHandler(messageView => {
      // console.log('MessageViewHandler')
      updateCurrentThreadSidebar(currentThreadView)
    })
  })
})()


