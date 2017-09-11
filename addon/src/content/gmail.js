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
    <div style="padding-left: 10px;">
      ${contentHtml}
    </div>`

  let updateSidebarContent = contentHtml => {
    sidebarEl.innerHTML = wrapSidebarContent(contentHtml)
  }

  let getSidebarCounterpartiesInfoHtml = counterparties => counterparties.map(counterparty => `
    <div>
      <a class="msext-counterparty-info"
         data-counterparty-id="${counterparty.id}"
         href="javascript:"
         style="color:#15c;">
        ${counterparty.name}
      </a>
      <span
        style="display:${counterparty.description ? 'block' : 'none'};font-size:10px;color:gray;">
        ${counterparty.description}
      </span>
    </div>`).join('<br/>')

  let updateCounterpartiesInfo = counterparties =>
    updateSidebarContent(getSidebarCounterpartiesInfoHtml(counterparties))

  let sidebarClicks$ = Kefir.fromEvents(sidebarEl, 'click')
  // sidebarClicks$.log('sidebarClicks$')

  sidebarClicks$
    .withHandler(mouseEventsToElementsHandler(elementClassFilter('msext-counterparty-info')))
    .map(el => el.dataset.counterpartyId)
    // .log('clickedCounterpartyInfoElements$')
    .onValue(counterpartyId => {
      // TODO Если вкладка не открыта, открывать по ссылке
      chrome.runtime.sendMessage({
        type: 'SHOW_COUNTERPARTY',
        targetTab: 'https://online.moysklad.ru/app/*',
        switchTab: true,
        counterpartyId
      })
    })

  InboxSDK.load(1, 'sdk_moysklad_gmail_c6ce2e116e').then(function (sdk) {
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

      let counterpartyEmails = Object.keys(sendersByEmail)
      if (!counterpartyEmails.length) { return }

      // TODO Если ответа нет долго, то, возможно, МойСклад запросил авторизацию ..
      // Уведомить пользователя о необходимости ввести логин и пароль
      chrome.runtime.sendMessage({
        type: 'GET_COUNTERPARTIES_INFO',
        targetTab: 'https://online.moysklad.ru/app/*',
        counterpartyEmails
      }, function (response) {
        log('response', response)
        if (response) {
          switch (true) {
            case response.length > 0:
              updateCounterpartiesInfo(response)
              break

            case response.length === 0:
              updateSidebarContent('Контрагенты для этой цепочки писем не найдены')
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

    sdk.Conversations.registerThreadViewHandler(function (threadView) {
      log('ThreadViewHandler', threadView)
      currentThreadView = threadView

      updateCurrentThreadSidebar(threadView)

      threadView.addSidebarContentPanel({
        title: 'Контрагенты МойСклад',
        el: sidebarEl
      })

      threadView.on('destroy', () => updateSidebarContent(''))
    })

    sdk.Conversations.registerMessageViewHandler(function (messageView) {
      log('MessageViewHandler', messageView, currentThreadView)
      if (currentThreadView) {
        updateCurrentThreadSidebar(currentThreadView)
      }
    })
  })
})()
