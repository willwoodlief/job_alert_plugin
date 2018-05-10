function loadLocaleMessages(locale) {
    // noinspection JSUnusedLocalSymbols
    return new Promise((resolve, reject) => {
        locale = locale.toLowerCase();

        // only load locales from files if they are not using their browser language (because i18n.getMessage uses the browser language)
        if (locale == chrome.i18n.getUILanguage()) { // .substring(0,2)
            // for english just use native calls to get i18n messages
            chrome.extension.getBackgroundPage().localeMessages = null;
            resolve();
        } else {
            //console.log("loading locale: " + locale);

            // i haven't created a en-US so let's avoid the error in the console and just push the callback
            if (locale == "en-us") {
                resolve();
            } else {

                var lang;
                var region;

                locale = locale.replace("-", "_");
                lang = locale.split("_")[0].toLowerCase();
                region = locale.split("_")[1];

                function readMessagesFile(lang, region) {
                    var folderName;
                    if (region) {
                        folderName = lang + "_" + region.toUpperCase();
                    } else {
                        folderName = lang;
                    }

                    return ajax({
                        url: chrome.runtime.getURL("_locales/" + folderName + "/messages.json"),
                        dataType: "json",
                        timeout: 5000
                    }).then(data => {
                        return data;
                    });
                }

                // noinspection JSUnusedLocalSymbols
                readMessagesFile(lang, region)
                    .catch(error => {
                        // if we had region then try lang only
                        if (region) {
                            console.log("Couldn't find region: " + region + " so try lang only: " + lang);
                            return readMessagesFile(lang);
                        } else {
                            throw Error("Lang not found: " + lang);
                        }
                    })
                    .then(data => {
                        chrome.extension.getBackgroundPage().localeMessages = data;
                        resolve();
                    })
                    .catch(error => {
                        // always resolve
                        console.warn(error);
                        resolve();
                    });


            }
        }
    });
}

function getMessage(messageID, args, localeMessages) {
    if (messageID) {
        // if localeMessage null because english is being used and we haven't loaded the localeMessage
        if (!localeMessages) {
            localeMessages = chrome.extension.getBackgroundPage().localeMessages;
        }
        if (localeMessages) {
            var messageObj = localeMessages[messageID];
            if (messageObj) { // found in this language
                var str = messageObj.message;

                // patch: replace escaped $$ to just $ (because chrome.i18n.getMessage did it automatically)
                if (str) {
                    str = str.replace(/\$\$/g, "$");
                }

                if (args) {
                    if (args instanceof Array) {
                        for (var a=0; a<args.length; a++) {
                            str = str.replace("$" + (a+1), args[a]);
                        }
                    } else {
                        str = str.replace("$1", args);
                    }
                }
                return str;
            } else { // default to default language
                return chromeGetMessage(messageID, args);
            }
        } else {
            return chromeGetMessage(messageID, args);
        }
    }
}

//patch: chrome.i18n.getMessage does pass parameter if it is a numeric - must be converted to str
function chromeGetMessage(messageID, args) {
    if (args && $.isNumeric(args)) {
        args = args + "";
    }
    return chrome.i18n.getMessage(messageID, args);
}