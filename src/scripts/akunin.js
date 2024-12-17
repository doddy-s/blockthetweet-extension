function getModel(modelUrl) {
    return tf.loadLayersModel(modelUrl['modelUrl'])
}

function main(model) {
    jQuery(initialize)
    $(document).on('DOMNodeInserted', injectAdditionalAkuninButtons)
    function initialize() {
    }

    console.log(model)

    function injectAdditionalAkuninButtons(event) {
        const tweets = $(event.target).find('div')

        if (tweets.length) {
            tweets.each((index, element) => {
                classify(element)
            })
        } else {
            classify(event.target)
        }
    }

    function classify(target) {
        const tweetText = $(target)
        if (!(tweetText.is('div') && tweetText.attr('data-testid') === 'tweetText')) {
            return
        }

        if (tweetText.attr('akunin') === 'labeled') {
            return
        } else {
            tweetText.attr('akunin', 'labeled')
        }

        const spans = tweetText.children('span')

        const text = spans.map(function () {
            if ($(this).children().length) {
                return $(this).children().first().html()
            }
            return $(this).html();
        }).get().join("");

        chrome.i18n.detectLanguage(text).then(t => {
            const lang = t.languages[0].language || 'nolang'
            if (lang == 'id' || lang == 'ms') {
                const isHateSpeech = predictLabel(text)
                if (isHateSpeech) {
                    tweetText.addClass('hidden')
                    const tweetHider = `<div class="open-sans flex h-24 w-90 items-center justify-between rounded-lg border-2 border-blue bg-blue px-4 py-2 my-4 mx-2" akunin="tweetHider">
<p>Konten ini mungkin mengandung hate-speech, kata-kata kasar, atau tindakan cyberbullying. Klik "Show" untuk melihatnya.</p>
<button class="px-4 py-2" akunin="showTweet">Show</button>
</div>`
                    tweetText.parent().append(tweetHider)
                }
                try {
                    document.querySelectorAll('[akunin="showTweet"]').forEach(item => {
                        item.addEventListener("click", showTweet)
                    })
                } catch { }
            }
        })


    }

    function predictLabel(text) {
        text = cleanText(text)
        const tokens = text.toLowerCase().split(/\W+/).filter(Boolean)
        let _x = []
        for (let i = 0; i < 120; i++) {
            _x[i] = indonesianWordIndex[tokens[i]] || 0
        }
        const prediction = model.predict(tf.tensor([_x])).dataSync()[0]
        console.log(prediction, text)
        const label = prediction >= 0.5 ? true : false
        return label
    }

    function showTweet(e) {
        const tweetText = $(e.target.parentNode.parentNode).children()
        $(tweetText[0]).removeClass('hidden')
        const tweetHider = $(tweetText[1]).attr('akunin') === 'tweetHider' ? $(tweetText[1]) : $(tweetText[2])
        tweetHider.removeClass('flex').addClass('hidden')
    }
}

function getModelUrl() {
    return chrome.storage.sync.get('modelUrl')
}

function onNoModelUrl() {
    console.log('modelUrl not set, please go to extension options page')
}

getModelUrl().then(
    (modelUrl) => {
        getModel(modelUrl).then(
            (model) => {
                main(model)
            }
        )
    },
    onNoModelUrl
)