chrome.browserAction.onClicked.addListener(function() {

    openInPopup();
});

$(document).ready(function() {
    init();
});

function getSettings() {
    return Settings;
}

function init() {
    if (!window.bg) {
        if (chrome && chrome.extension && chrome.extension.getBackgroundPage) {
            window.bg = chrome.extension.getBackgroundPage();
        } else {
            console.warn("JError: no access to background");
        }
    }

    var popupUrl = 'popup.html';
    chrome.browserAction.setPopup({popup:popupUrl});

    window.inWidget = false; //for openURL function

    var syncExcludeList = [ "autoSave","jwtToken"];
    syncOptions.init(syncExcludeList);

    settingsPromise.then(() => {
        var lang = Settings.read("language");
        return loadLocaleMessages(lang).then(() => {
            console.log("loaded locale messages");

            // noinspection JSUnusedLocalSymbols
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                console.log("Background Listener Called",message);
                if (message.command == "indexedDBSettingSaved") {
                    syncOptions.storageChanged({key:message.key});
                } else if (message.command == "openTab") {
                    openUrl(message.url).then (() => {});
                } else if (message.command == "openTabInBackground") {
                    chrome.tabs.create({ url: message.url, active: false });
                }
            });

            if (chrome.contextMenus) {

                chrome.contextMenus.removeAll(function() {
                    chrome.contextMenus.create({id:'test_me',title: getMessage("testContextMenuEntry"),
                        contexts: ["browser_action"]});
                });

                chrome.contextMenus.onClicked.addListener((info,tab) => {
                    console.log("item " + info.menuItemId + " was clicked");
                    console.log("info: " + JSON.stringify(info));
                    console.log("tab: " + JSON.stringify(tab));
                });




            }

            if (chrome.alarms) {
                chrome.alarms.onAlarm.addListener(function(alarm) {
                    if (alarm.name == "extensionUpdatedSync") {
                        syncOptions.save("extensionUpdatedSync");
                    } else if (alarm.name == "test") {
                        localStorage.test = new Date();
                    }
                });
            }

            if (chrome.idle.onStateChanged) {
                chrome.idle.onStateChanged.addListener(newState => {
                    // returned from idle state
                    console.log("onstatechange: " + newState + " " + now().toString());
                });
            }

            // for adding mailto links (note: onUpdated loads twice once with status "loading" and then "complete"
            chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
                if (changeInfo.status == "loading") {


                    if (tab.url) {

                    }
                } else if (changeInfo.status == "complete") {

                }
            });



            if (chrome.storage) {
                chrome.storage.onChanged.addListener(function(changes, areaName) {
                    console.log("storage changes " + new Date() + " : ", changes, areaName);
                });
            }

            if (chrome.commands && DetectClient.isChrome()) {
                chrome.commands.onCommand.addListener(function(command) {
                    if (command == "aTestCommand") {
                        console.log("got test command");
                    }

                });
            }


            $(window).on("offline online", function(e) {
                console.log("detected: " + e.type + " " + new Date());
                if (e.type == "online") {
                    console.log("navigator: " + navigator.onLine + " " + new Date());

                }
            });

            //https://github.com/Olical/EventEmitter/blob/master/docs/guide.md
           // noinspection JSUnresolvedFunction
            window.ee = new EventEmitter();

            function listings_listener(listings) {
                console.log('Found listings.',listings);
            }

            ee.addListener('listings', listings_listener);

            function stats_listener(stats) {
                console.log('The stats listener.',stats);
            }

            ee.addListener('stats', stats_listener);

            do_stats_call().then(msg => console.log("stats loop then",msg)).catch(e=> console.warn("stats failed",e));
            do_list_call({start_ts:1525739941, page:1,per_page:100}).
                then(msg => console.log("called list ok",new Date(), msg.results.length) ).
                catch(e=> console.warn("list failed",e));


            function runs_listener(stats) {
                console.log('The runs listener.',stats);
            }
            ee.addListener('runs', runs_listener);
            do_run_call().then(msg => console.log("run then",msg)).catch(e=> console.warn("run failed",e));



        }).catch(error => {
            console.error("Could not load locale messages",error);
        });
    }).catch(error => {
        logError("starting extension: " + error, error);
        showMessageNotification("Problem starting extension", "Try re-installing the extension.", error);
    });

    $(window).on("storage", function(e) {
        syncOptions.storageChanged({key:e.originalEvent.key});
    });
}


