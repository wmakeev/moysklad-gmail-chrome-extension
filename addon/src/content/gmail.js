;(function () {
  const DEBUG = false
  const { chrome, InboxSDK, Kefir } = window

  function log () {
    if (DEBUG) console.debug.apply(console, arguments)
  }

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

  let getSidebarAgentsInfoHtml = agents => agents.map(agent => `
    <div>
      <a class="msext-agent-info" data-agent-id="${agent.uuid}" href="javascript:"
        style="color:#15c;">
        ${agent.name}
      </a>
      <span style="display:${agent.description ? 'block' : 'none'};font-size:10px;color:gray;">
        ${agent.description}
      </span>
    </div>`).join('<br/>')

  let updateAgentsInfo = agents => updateSidebarContent(getSidebarAgentsInfoHtml(agents))

  let sidebarClicks$ = Kefir.fromEvents(sidebarEl, 'click')
  // sidebarClicks$.log('sidebarClicks$')

  sidebarClicks$
    .withHandler(mouseEventsToElementsHandler(elementClassFilter('msext-agent-info')))
    .map(el => el.dataset.agentId)
    // .log('clickedAgentInfoElements$')
    .onValue(agentId => {
      // TODO Если вкладка не открыта, открывать по ссылке
      chrome.runtime.sendMessage({
        type: 'SHOW_AGENT',
        targetTab: 'https://online.moysklad.ru/app/*',
        switchTab: true,
        agentId
      })
    })

  InboxSDK.load('1.0', 'sdk_moysklad_gmail_c6ce2e116e').then(function (sdk) {
    let currentThreadView
    let currentUserEmail = sdk.User.getEmailAddress()

    let updateCurrentThreadSidebar = threadView => {
      if (!threadView) { return }

      let messageViews = threadView.getMessageViewsAll()
      if (!messageViews.length) { return }

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
          if (currentUserEmail !== contact.emailAddress) {
            res[contact.emailAddress] = contact
          }
          return res
        }, {})

      log('sendersByEmail', sendersByEmail)

      let agentEmails = Object.keys(sendersByEmail)
      if (!agentEmails.length) { return }

      // TODO Если ответа нет долго, то, возможно, МойСклад запросил авторизацию ..
      // Уведомить пользователя о необходимости ввести логин и пароль
      chrome.runtime.sendMessage({
        type: 'GET_AGENTS_INFO',
        targetTab: 'https://online.moysklad.ru/app/*',
        agentEmails
      }, response => {
        log('response', response)
        if (response) {
          switch (true) {
            case response.length > 0:
              updateAgentsInfo(response)
              break

            case response.length === 0:
              updateSidebarContent('Контрагенты для этой цеопчки писем не найдены')
              break

            default:
              if (response.error) {
                console.error(response.error)
              }
              updateSidebarContent('Ошибка при обращении к сервису МойСклад')
          }
        } else {
          updateSidebarContent('Для работы расширения необходимо открыть хотя бы одну вкладку ' +
            'приложения <a title="Открыть МойСклад" href="https://online.moysklad.ru/app">' +
            'МойСклад</a> в текущем окне')
        }
      })
    }

    sdk.Conversations.registerThreadViewHandler(threadView => {
      log('ThreadViewHandler', threadView)
      currentThreadView = threadView

      updateCurrentThreadSidebar(threadView)

      threadView.addSidebarContentPanel({
        title: 'Контрагенты МойСклад',
        el: sidebarEl
      })

      threadView.on('destroy', () => updateSidebarContent(''))
    })

    sdk.Conversations.registerMessageViewHandler(messageView => {
      log('MessageViewHandler', messageView, currentThreadView)
      if (currentThreadView) {
        updateCurrentThreadSidebar(currentThreadView)
      }
    })
  })
})()


