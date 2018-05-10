function openInPopup(params) {
    var url = 'popup.html';

    params = initUndefinedObject(params);



    params.width = Settings.read("popupWidth");
    params.height = Settings.read("popupHeight");
    params.url = url;
    params.openPopupWithChromeAPI = true;

    if (bg.popupWindow && bg.popupWindow.id) {
        chrome.windows.remove(bg.popupWindow.id, function() {
            if (chrome.runtime.lastError) {
                console.warn("close reminders: " + chrome.runtime.lastError.message);
            } else {
                bg.popupWindow = null;
            }
        });
    }

    var createWindowParams = getPopupWindowSpecs(params);
    chrome.windows.create(createWindowParams, newWindow => {
        bg.popupWindow = newWindow;
    });

    if (params.notificationId) {
        clearRichNotification(params.notificationId);
    }
}


function openWindowInCenter(url, title, specs, popupWidth, popupHeight) {
    var left = (screen.width/2)-(popupWidth/2);
    var top = (screen.height/2)-(popupHeight/2);
    //return window.open(url, title, specs + ", width=" + popupWidth + ", height=" + popupHeight + ", top=" + top + ", left=" + left)
    // noinspection JSSuspiciousNameCombination
    chrome.windows.create({url:url, top:Math.round(top), left:Math.round(left), width:Math.round(popupWidth), height:Math.round(popupHeight), type:"popup"});
}


/**
 *
 * @param params
 * @param params.testingOnly {bool|undefined}
 * @param params.window {Object|undefined}
 * @returns {*}
 */
function getPopupWindowSpecs(params) {
    params = initUndefinedObject(params);
    if (!params.window) {
        params.window = window;
    }

    var left, top, width, height;

    if (Settings.read("setPositionAndSize") || params.testingOnly) {
        // noinspection JSUnresolvedVariable
        left = params.window.screen.availLeft+parseInt(Settings.read("popupLeft"));

        // noinspection JSUnresolvedVariable
        top = params.window.screen.availTop+parseInt(Settings.read("popupTop"));
        width = Settings.read("popupWidth");
        height = Settings.read("popupHeight");
    } else {
        if (!params.width) {
            params.width = Settings.read("popupWidth");
        }
        if (!params.height) {
            params.height = Settings.read("popupHeight");
        }

        // noinspection JSUnresolvedVariable
        left = params.window.screen.availLeft+(params.window.screen.width/2)-(params.width/2);

        // noinspection JSUnresolvedVariable
        top = params.window.screen.availTop+(params.window.screen.height/2)-(params.height/2);
        width = params.width;
        height = params.height;
    }

    if (params.openPopupWithChromeAPI) {
        // muse use Math.round because .create doesn't accept decimals points
        // noinspection JSSuspiciousNameCombination
        return {url:params.url, width:Math.round(width), height:Math.round(height), left:Math.round(left), top:Math.round(top), type:"popup", state:"normal"};
    } else {
        var specs = "";

        // noinspection JSUnresolvedVariable
        specs += "left=" + (params.window.screen.availLeft+parseInt(Settings.read("popupLeft"))) + ",";

        // noinspection JSUnresolvedVariable
        specs += "top=" + (params.window.screen.availTop+parseInt(Settings.read("popupTop"))) + ",";
        specs += "width=" + Settings.read("popupWidth") + ",";
        specs += "height=" + Settings.read("popupHeight") + ",";
        return specs;
    }
}


//usage: openUrl(url, {urlToFind:""})
/**
 *
 * @param url
 * @param params
 * @param params.urlToFind {string|undefined}
 * @param params.autoClose {bool|undefined}
 * @returns {Promise<>}
 */
function openUrl(url, params) {
    // noinspection JSUnusedLocalSymbols
    return new Promise((resolve, reject) => {
        params = initUndefinedObject(params);
        if (!window.inWidget && chrome.tabs) {
            getChromeWindows().then(normalWindows => {
                if (normalWindows.length == 0) { // Chrome running in background
                    var createWindowParams = {url:url};
                    if (DetectClient.isChrome()) {
                        createWindowParams.focused = true;
                    }
                    // noinspection JSUnusedLocalSymbols
                    chrome.windows.create(createWindowParams, createdWindow => {
                        findTab(url).then(response => {
                            resolve(response);
                        });
                    });
                } else {
                    // noinspection JSUnusedLocalSymbols
                    new Promise((resolve, reject) => {
                        if (params.urlToFind) {
                            findTab(params.urlToFind).then(response => {
                                resolve(response);
                            });
                        } else {
                            resolve();
                        }
                    }).then(response => {
                        if (response && response.found) {
                            //chrome.tabs.update(response.tab.id, {url:url});
                            return Promise.resolve(response);
                        } else {
                            return createTabAndFocusWindow(url);
                        }
                    }).then(response => {
                        if (location.href.indexOf("source=toolbar") != -1 && DetectClient.isFirefox() && params.autoClose !== false) {
                            window.close();
                        }
                        resolve();
                    });
                }
            });
        } else {
            top.location.href = url;
        }
    });
}

function createTabAndFocusWindow(url) {
    // noinspection JSUnusedLocalSymbols
    return new Promise((resolve, reject) => {
        // noinspection JSUnusedLocalSymbols
        new Promise((resolve, reject) => {
            if (DetectClient.isFirefox()) { // required for Firefox because when inside a popup the tabs.create would open a tab/url inside the popup but we want it to open inside main browser window
                chrome.windows.getCurrent(thisWindow => {
                    if (thisWindow && thisWindow.type == "popup") {
                        chrome.windows.getAll({windowTypes:["normal"]}, windows => {
                            if (windows.length) {
                                resolve(windows[0].id)
                            } else {
                                resolve();
                            }
                        });
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        }).then(windowId => {
            var createParams = {url:url};
            if (windowId != undefined) {
                createParams.windowId = windowId;
            }
            chrome.tabs.create(createParams, tab => {
                chrome.windows.update(tab.windowId, {focused:true}, () => {
                    resolve(tab);
                });
            });
        });
    });
}


function getChromeWindows() {
    // noinspection JSUnusedLocalSymbols
    return new Promise((resolve, reject) => {
        chrome.windows.getAll(windows => {
            // keep only normal windows and not app windows like debugger etc.
            var normalWindows = windows.filter(thisWindow => {
                return thisWindow.type == "normal";
            });
            resolve(normalWindows);
        });
    });
}

function findTab(url) {
    // noinspection JSUnusedLocalSymbols
    return new Promise((resolve, reject) => {
        chrome.tabs.query({url:url + "*"}, tabs => {
            if (chrome.runtime.lastError){
                console.error(chrome.runtime.lastError.message);
                resolve();
            } else {
                if (tabs.length) {
                    var tab = tabs.last();
                    bg.console.log("force window found");
                    chrome.tabs.update(tab.id, {active:true}, () => {
                        if (chrome.runtime.lastError) {
                            resolve();
                        } else {
                            // must do this LAST when called from the popup window because if set focus to a window the popup loses focus and disappears and code execution stops
                            chrome.windows.update(tab.windowId, {focused:true}, () => {
                                resolve({found:true, tab:tab});
                            });
                        }
                    });
                } else {
                    resolve();
                }
            }
        });
    });
}
