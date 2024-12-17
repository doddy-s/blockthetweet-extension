function validateModelUrl(url) {
    var pattern = /^(https?:\/\/).*\.json$/;
    return pattern.test(url);
}

function saveOptions(e) {
    e.preventDefault()
    const modelUrl = document.querySelector("#modelUrl").value
    if(validateModelUrl(modelUrl) == false) {
        document.querySelector("#currentModel").innerHTML = 'Model Url incorrect, make sure it was started with http:// or https:// and ended with .json'
        return
    }
    chrome.storage.sync.set({
        modelUrl: modelUrl
    }).then(()=>{
        document.querySelector("#currentModel").innerHTML = modelUrl
    })
}

function restoreOptions() {
    function setCurrentChoice(result) {
        document.querySelector("#currentModel").innerHTML = result['modelUrl'] || "not set"
    }

    function onError(error) {
        console.log(`Error: ${error}`)
    }

    let getting = chrome.storage.sync.get("modelUrl")
    getting.then(setCurrentChoice, onError)
}

document.addEventListener("DOMContentLoaded", restoreOptions)
document.querySelector("form").addEventListener("submit", saveOptions)