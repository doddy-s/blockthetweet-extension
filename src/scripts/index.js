const TWEET_HIDER = `<div class="open-sans flex h-24 w-90 items-center justify-between rounded-lg border-2 border-blue bg-blue px-4 py-2 my-4 mx-2" blockthetweet="tweetHider">
<p>Konten ini mungkin mengandung hate-speech, kata-kata kasar, atau tindakan cyberbullying. Klik "Show" untuk melihatnya.</p>
<button class="px-4 py-2" blockthetweet="showTweet">Show</button>
</div>`

let LANGUAGES_TO_CHECK = []

let WORD_INDEX = {}

let METADATA = {}

let MODEL = {}

function predictLabel(tokenizedText) {
  const prediction = MODEL.predict(tf.tensor([tokenizedText])).dataSync()[0]
  console.log(prediction, text)
  const label = prediction >= 0.5 ? true : false
  return label
}

function tokenize() {
  let tokenized = []
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean)
  for (let i = 0; i < METADATA?.meta?.dataset?.longest_text || 45; i++) {
    tokenized[i] = indonesianWordIndex[tokens[i]] || 0
  }

  return tokenized
}

async function classify(text) {
  const lang = await chrome.i18n.detectLanguage(text)

  if (
    !(METADATA?.languages || ['id', 'ms']).includes(
      lang?.languages?.[0]?.language
    )
  ) {
    return false
  }

  try {
    return predictLabel(tokenize(preprocess(text)))
  } catch {
    return false
  }
}

async function classifyExternal(text) {
  const lang = await chrome.i18n.detectLanguage(text)

  if (
    !['en'].includes(
      lang?.languages?.[0]?.language
    )
  ) {
    return false
  }

  try {
    const response = await fetch('http://localhost:3000', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text
      })
    })

    const data = await response.json()

    console.table(data)
    
    return data?.confidence > 0.5
  } catch {
    return false
  }
}

function ShowTweetButtonHandler(e) {
  // Get the tweet text and hider elements
  const tweetContainer = e.target.parentNode.parentNode
  const tweetText = tweetContainer.children[0]
  const potentialHider1 = tweetContainer.children[1]
  const potentialHider2 = tweetContainer.children[2]

  // Show the tweet text (remove 'hidden' class)
  tweetText.classList.remove('hidden')

  // Identify the tweet hider element
  const tweetHider = potentialHider1.getAttribute('blockthetweet') === 'tweetHider'
    ? potentialHider1
    : potentialHider2

  // Hide the hider element (remove 'flex', add 'hidden')
  tweetHider.classList.remove('flex')
  tweetHider.classList.add('hidden')
}

async function onTweetBlocked() {
  try {
    document.body
      .querySelectorAll('[blockthetweet="showTweet"]')
      .forEach((item) => {
        if (
          item.hasAttribute('blockthetweet-show-tweet-button') &&
          item.getAttribute('blockthetweet-show-tweet-button') ===
          'handlerConnected'
        ) {
          return
        }

        item.setAttribute('blockthetweet-show-tweet-button', 'handlerConnected')
        item.addEventListener('click', ShowTweetButtonHandler)
      })
  } catch { }
}

function createTweetHider() {
  const container = document.createElement('div')
  container.classList.add('open-sans', 'flex', 'h-24', 'w-90', 'items-center', 'justify-between', 'rounded-lg', 'border-2', 'border-blue', 'bg-blue', 'px-4', 'py-2', 'my-4', 'mx-2')
  container.setAttribute('blockthetweet', 'tweetHider')

  const message = document.createElement('p')
  message.textContent = 'Konten ini mungkin mengandung hate-speech, kata-kata kasar, atau tindakan cyberbullying. Klik "Show" untuk melihatnya.'
  container.appendChild(message)

  const button = document.createElement('button')
  button.classList.add('px-4', 'py-2')
  button.setAttribute('blockthetweet', 'showTweet')
  button.textContent = 'Show'
  container.appendChild(button)

  return container
}

async function blockTweet(tweetTextElement) {
  if (await classifyExternal(tweetTextElement.textContent)) {
    // if (true) {
    tweetTextElement.classList.add('hidden')

    tweetTextElement.parentElement.appendChild(createTweetHider())

    onTweetBlocked()
  }
}

function onTweetTextLoaded(tweetTextElement) {
  if (tweetTextElement.getAttribute('blockthetweet') === 'labeled') {
    return
  }

  tweetTextElement.setAttribute('blockthetweet', 'labeled')

  blockTweet(tweetTextElement)
}

function onNodeAdded(node) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (
      node.hasAttribute('data-testid') &&
      node.getAttribute('data-testid') === 'cellInnerDiv'
    ) {
      const tweetTextNodes = node.querySelectorAll(
        'div[data-testid="tweetText"]'
      )
      tweetTextNodes.forEach((tweetTextNode) => {
        onTweetTextLoaded(tweetTextNode)
      })
    }
  }
}

function startMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        mutation.addedNodes.forEach((addedNode) => {
          onNodeAdded(addedNode)
        })
      }
    })
  })

  const observee = document.body

  if (observee) {
    observer.observe(observee, {
      childList: true,
      subtree: true,
    })
    console.log('BlockTheTweet is starting...')
  }
}

async function fetchJson(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Error during fetching Json: ${response.status}`)
    }
    const data = await response.json()

    if (!data) {
      throw new Error('Data fetched is empty, url: ' + url)
    }
    return data
  } catch (error) {
    console.error('fetchJson function error:', error)
  }
}

async function fetchModel(url) {
  return await tf.loadLayersModel(url)
}

async function main() {
  try {
    METADATA = await fetchJson(
      'https://raw.githubusercontent.com/doddy-s/skripsi-s1-informatika/refs/heads/main/Datasets/processed/metadata.json'
    )
    console.log('METADATA', METADATA)

    // WORD_INDEX = await fetchJson(
    //   'https://raw.githubusercontent.com/doddy-s/skripsi-s1-informatika/refs/heads/main/Datasets/processed/indonesian-hate-speech-processed-word-index.json'
    // )
    // console.log(
    //   'WORD_INDEX',
    //   Object.fromEntries(Object.entries(WORD_INDEX).slice(0, 10))
    // )

    // MODEL = await fetchModel(
    //   'https://raw.githubusercontent.com/doddy-s/akunin-model/refs/heads/main/indonesian-hate-speech-binary-classification-12k/model.json'
    // )
    // console.log('MODEL', MODEL)

    startMutationObserver()
  } catch (error) {
    console.error('main function error:', error)
    throw new Error(error.message)
  }
}

main().catch(() => {
  console.info('BlockTheTweet failed to start. Exiting...')
  process.exit(1)
})
