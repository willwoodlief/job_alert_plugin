
function initUndefinedObject(obj) {
    if (typeof obj == "undefined") {
        return {};
    } else {
        return obj;
    }
}




// usage: JSON.parse(str, dateReviver) find all date strings and turns them into date objects
function dateReviver(key, value) {
    // 2012-12-04T13:51:06.897Z
    if (typeof value == "string" && value.length == 24 && /\d{4}-\d{2}-\d{2}T\d{2}\:\d{2}\:\d{2}\.\d{3}Z/.test(value)) {
        return new Date(value);
    } else {
        return value;
    }
}

function getUniqueId() {
    return Math.floor(Math.random() * 100000);
}

function ajax(params) {
    return Promise.resolve($.ajax(params));
}


//make sure it's not a string or empty because it will equate to 0 and thus run all the time!!!
//make sure it's not too small like 0 or smaller than 15 seconds
function setIntervalSafe(func, time) {
    if (isNaN(time) || parseInt(time) < 1000) {
        throw Error("jerror with setinterval safe: " + time + " is NAN or too small");
    } else {
        return setInterval(func, time);
    }
}


function getPreferredLanguage() {
    if (navigator.languages && navigator.languages.length) {
        return navigator.languages[0];
    } else {
        return navigator.language;
    }
}


function getUrlValue(url, name, unescapeFlag) {
    if (url) {
        var hash;
        url = url.split("#")[0];
        var hashes = url.slice(url.indexOf('?') + 1).split('&');
        for(var i=0; i<hashes.length; i++) {
            hash = hashes[i].split('=');
            // make sure no nulls
            if (hash[0] && name) {
                if (hash[0].toLowerCase() == name.toLowerCase()) {
                    if (unescapeFlag) {
                        return unescape(hash[1]);
                    } else {
                        return hash[1];
                    }
                }
            }
        }
        return null;
    }
}


