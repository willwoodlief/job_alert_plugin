//  Jason Savard


var DetectClient = {};
DetectClient.isChrome = function() {
    return /chrome/i.test(navigator.userAgent) && !DetectClient.isEdge();
};
DetectClient.isFirefox = function() {
    return /firefox/i.test(navigator.userAgent);
};
DetectClient.isEdge = function() {
    return /edge/i.test(navigator.userAgent);
};
DetectClient.isWindows = function() {
    return /windows/i.test(navigator.userAgent);
};
DetectClient.isNewerWindows = function() {
    return navigator.userAgent.match(/Windows NT 1\d\./i) != null; // Windows NT 10+
};
DetectClient.isMac = function() {
    return /mac/i.test(navigator.userAgent);
};
DetectClient.isLinux = function() {
    return /linux/i.test(navigator.userAgent);
};
DetectClient.isOpera = function() {
    return /opera/i.test(navigator.userAgent);
};
DetectClient.isRockMelt = function() {
    return /rockmelt/i.test(navigator.userAgent);
};
DetectClient.isChromeOS = function() {
    return /cros/i.test(navigator.userAgent);
};

DetectClient.getChromeChannel = function() {
    return new Promise((resolve, reject) => {
        if (DetectClient.isChrome()) {
            $.getJSON("https://omahaproxy.appspot.com/all.json", data => {
                var versionDetected;
                var stableDetected = false;
                var stableVersion;

                for (var a=0; a<data.length; a++) {

                    var osMatched = false;
                    // patch because Chromebooks/Chrome OS has a platform value of "Linux i686" but it does say CrOS in the useragent so let's use that value
                    if (DetectClient.isChromeOS()) {
                        if (data[a].os == "cros") {
                            osMatched = true;
                        }
                    } else { // the rest continue with general matching...
                        if (navigator.userAgent.toLowerCase().indexOf(data[a].os) != -1) {
                            osMatched = true;
                        }
                    }

                    if (osMatched) {
                        for (var b = 0; b < data[a].versions.length; b++) {
                            if (data[a].versions[b].channel == "stable") {
                                stableVersion = data[a].versions[b];
                            }
                            if (navigator.userAgent.indexOf(data[a].versions[b].previous_version) != -1 || navigator.userAgent.indexOf(data[a].versions[b].version) != -1) {
                                // it's possible that the same version is for the same os is both beta and stable???
                                versionDetected = data[a].versions[b];
                                if (data[a].versions[b].channel == "stable") {
                                    stableDetected = true;
                                    resolve(versionDetected);
                                    return;
                                }
                            }
                        }

                        var chromeVersionMatch = navigator.userAgent.match(/Chrome\/(\d+(.\d+)?(.\d+)?(.\d+)?)/i);
                        if (chromeVersionMatch) {
                            var currentVersionObj = parseVersionString(chromeVersionMatch[1]);
                            var stableVersionObj = parseVersionString(stableVersion.previous_version);
                            if (currentVersionObj.major < stableVersionObj.major) {
                                resolve({ oldVersion: true, reason: "major diff" });
                                return;
                            } else if (currentVersionObj.major == stableVersionObj.major) {
                                if (currentVersionObj.minor < stableVersionObj.minor) {
                                    resolve({ oldVersion: true, reason: "minor diff" });
                                    return;
                                } else if (currentVersionObj.minor == stableVersionObj.minor) {
                                    /*
                                    if (currentVersionObj.patch < stableVersionObj.patch) {
                                        resolve({ oldVersion: true, reason: "patch diff" });
                                        return;
                                    }
                                    */
                                    // commented above to ignore patch differences
                                    stableDetected = true;
                                    resolve(stableVersion);
                                    return;
                                }
                            }
                        }
                    }
                }

                // probably an alternative based browser like RockMelt because I looped through all version and didn't find any match
                if (data.length && !versionDetected) {
                    resolve({channel:"alternative based browser"});
                } else {
                    resolve(versionDetected);
                }
            });
        } else {
            reject("Not Chrome");
        }
    });
};

function getInternalPageProtocol() {
    var protocol;
    if (DetectClient.isFirefox()) {
        protocol = "moz-extension:";
    } else {
        protocol = "chrome-extension:";
    }
    return protocol;
}

function isInternalPage(url) {
    if (arguments.length == 0) {
        url = location.href;
    }
    return url && url.indexOf(getInternalPageProtocol()) == 0;
}

function parseVersionString(str) {
    if (typeof(str) != 'string') { return false; }
    var x = str.split('.');
    // parse from string or default to 0 if can't parse
    var maj = parseInt(x[0]) || 0;
    var min = parseInt(x[1]) || 0;
    var pat = parseInt(x[2]) || 0;
    return {
        major: maj,
        minor: min,
        patch: pat
    }
}

