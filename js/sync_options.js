//written by Jason Savard

function chunkObject(obj, chunkSize) {
    var str = JSON.stringify(obj);
    return str.chunk(chunkSize);
}

String.prototype.chunk = function(size) {
    return this.match(new RegExp('.{1,' + size + '}', 'g'));
};

var syncOptions = (function() {
    var MIN_STORAGE_EVENTS_COUNT_BEFORE_SAVING = 4;
    var LOCALSTORAGE_CHUNK_PREFIX = "localStorageChunk";
    var INDEXEDDB_CHUNK_PREFIX = "indexedDBChunk";
    var saveTimeout;
    var paused;

    // ex. syncChunks(deferreds, localStorageChunks, "localStorageChunk", setDetailsSeparateFromChunks);
    function syncChunks(deferreds, chunks, chunkPrefix, details, setDetailsSeparateFromChunks) {

        var previousDeferredsCount = deferreds.length;

        $(chunks).each(function(index, chunk) {
            var itemToSave = {};

            // let's set details + chunk together
            if (!setDetailsSeparateFromChunks) {
                itemToSave["details"] = details;
            }

            itemToSave[chunkPrefix + "_" + index + "_" + details.chunkId] = chunk;

            console.log("trying to sync.set json length: ", chunkPrefix + "_" + index + "_" + details.chunkId, chunk.length + "_" + JSON.stringify(chunk).length);

            var deferred = $.Deferred(function(def) {

                // firefox
                // noinspection JSDeprecatedSymbols
                if (!chrome.storage.sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE) {
                    // noinspection JSDeprecatedSymbols
                    chrome.storage.sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE = 1000000;
                }

                // to avoid problems with MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE let's spread out the calls
                var delay;
                var SYNC_OPERATIONS_BEFORE = 1; // .clear were done before
                // noinspection JSDeprecatedSymbols
                if (SYNC_OPERATIONS_BEFORE + previousDeferredsCount + chunks.length > chrome.storage.sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE) {
                    delay = (previousDeferredsCount+index) * seconds(10); // makes only 6 calls per minute
                } else {
                    delay = 0;
                }
                setTimeout(function() {
                    chrome.storage.sync.set(itemToSave, function() {
                        if (chrome.runtime.lastError) {
                            var error = "sync error: " + chrome.runtime.lastError.message;
                            logError(error);
                            def.reject(error);
                        } else {
                            console.log("saved " + chunkPrefix + " " + index);
                            def.resolve("success");
                        }
                    });
                }, delay);
            });
            deferreds.push(deferred);
        });
    }

    // usage: compileChunks(details, items, details.localStorageChunksCount, LOCALSTORAGE_CHUNK_PREFIX)
    function compileChunks(details, items, chunkCount, prefix) {
        var data = "";
        for (var a=0; a<chunkCount; a++) {
            data += items[prefix + "_" + a + "_" + details.chunkId];
        }
        return JSON.parse(data);
    }

    function isSyncable(key) {
        return !key.startsWith("_") && syncOptions.excludeList.indexOf(key) == -1;
    }

    return { // public interface
        init: function(excludeList) {
            if (!excludeList) {
                excludeList = [];
            }

            // append standard exclusion to custom ones
            excludeList = excludeList.concat(["version", "lastSyncOptionsSave", "lastSyncOptionsLoad", "detectedChromeVersion", "installDate", "installVersion", "DND_endTime"]);

            // all private members are accessible here
            syncOptions.excludeList = excludeList;
        },
        storageChanged: function(params) {
            if (!paused) {
                if (isSyncable(params.key)) {
                    // we don't want new installers overwriting their synced data from previous installations - so only sync after certain amount of clicks by presuming their just going ahead to reset their own settings manually
                    var storageEventsCount = Settings.read("_storageEventsCount");
                    if (!storageEventsCount) {
                        storageEventsCount = 0;
                    }
                    Settings.store("_storageEventsCount", ++storageEventsCount);

                    // if loaded upon new install then we can proceed immediately to save settings or else want for minimum storage event
                    if (localStorage.lastSyncOptionsLoad || Settings.read("lastSyncOptionsSave") || storageEventsCount >= MIN_STORAGE_EVENTS_COUNT_BEFORE_SAVING) {
                        console.log("storage event: " + params.key + " will sync it soon...");
                        clearTimeout(saveTimeout);
                        saveTimeout = setTimeout(function() {
                            syncOptions.save("sync data: " + params.key);
                        }, seconds(45));
                    } else {
                        console.log("storage event: " + params.key + " waiting for more storage events before syncing");
                    }
                } else {
                    //console.log("storage event ignored: " + params.key);
                }
            }
        },
        pause: function() {
            paused = true;
        },
        resume: function() {
            paused = false;
        },
        save: function(reason) {
            return new Promise(function(resolve, reject) {
                if (chrome.storage.sync) {
                    // firefox
                    if (!chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
                        chrome.storage.sync.QUOTA_BYTES_PER_ITEM = 8192;
                    }
                    // split it up because of max size per item allowed in Storage API
                    // because QUOTA_BYTES_PER_ITEM is sum of key + value STRINGIFIED! (again)
                    // watch out because the stringify adds quotes and slashes refer to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
                    // so let's only use 80% of the max and leave the rest for stringification when the sync.set is called
                    var MAX_CHUNK_SIZE = Math.floor(chrome.storage.sync.QUOTA_BYTES_PER_ITEM * 0.80);

                    console.log("syncOptions: saving data reason: " + reason + "...");

                    // process localStorage
                    var localStorageItemsToSave = {};
                    for (let key in localStorage) {
                        // don't include storage options starting with _blah and use exclude list
                        if (isSyncable(key)) {
                            //console.log(key + ": " + localStorage[key]);
                            localStorageItemsToSave[key] = localStorage[key];
                        }
                    }

                    syncOptions.exportIndexedDB({}, function(exportIndexedDBResponse) {
                        // remove all items first because we might have less "chunks" of data so must clear the extra unused ones now
                        chrome.storage.sync.clear(function() {
                            if (chrome.runtime.lastError) {
                                var error = "sync error: " + chrome.runtime.lastError.message;
                                logError(error);
                                reject(error);
                            } else {
                                try {
                                    var deferreds = [];
                                    var deferred;

                                    var chunkId = getUniqueId();

                                    var localStorageChunks = chunkObject(localStorageItemsToSave, MAX_CHUNK_SIZE);
                                    var indexedDBChunks = chunkObject(exportIndexedDBResponse.data, MAX_CHUNK_SIZE);

                                    var details = {chunkId:chunkId, localStorageChunksCount:localStorageChunks.length, indexedDBChunksCount:indexedDBChunks.length, extensionVersion:chrome.runtime.getManifest().version, lastSync:new Date().toJSON(), syncReason:reason};

                                    // can we merge details + first AND only chunk into one .set operation (save some bandwidth)
                                    var setDetailsSeparateFromChunks;

                                    if (localStorageChunks.length == 1 && indexedDBChunks.length == 1 && JSON.stringify(details).length + localStorageChunks.first().length + indexedDBChunks.first().length < MAX_CHUNK_SIZE) {
                                        setDetailsSeparateFromChunks = false;
                                    } else {
                                        setDetailsSeparateFromChunks = true;

                                        // set sync header/details...
                                        deferred = $.Deferred(function(def) {
                                            chrome.storage.sync.set({details:details}, function() {
                                                console.log("saved details");
                                                def.resolve("success");
                                            });
                                        });
                                        deferreds.push(deferred);
                                    }

                                    // in 1st call to syncChunks let's pass the last param setDetailsSeparateFromChunks
                                    // in 2nd call to syncChunks let's hard code setDetailsSeparateFromChunks to true
                                    syncChunks(deferreds, localStorageChunks, LOCALSTORAGE_CHUNK_PREFIX, details, setDetailsSeparateFromChunks);
                                    syncChunks(deferreds, indexedDBChunks, INDEXEDDB_CHUNK_PREFIX, details, true);

                                    $.when.apply($, deferreds)
                                        .done(function() {
                                            Settings.storeDate("lastSyncOptionsSave");
                                            console.log("sync done");
                                            resolve();
                                        })
                                        .fail(function(args) {
                                            console.log(arguments);

                                            // error occurred so let's clear storage because we might have only partially written data
                                            chrome.storage.sync.clear();

                                            reject("jerror with sync deferreds");
                                        })
                                    ;
                                } catch (error) {
                                    reject(error);
                                }
                            }
                        });
                    });
                } else {
                    reject(new Error("Sync is not supported!"));
                }
            });
        },
        fetch: function() {
            return new Promise(function(resolve, reject) {
                if (chrome.storage.sync) {
                    console.log("syncOptions: fetch...");
                    chrome.storage.sync.get(null, function(items) {
                        if (chrome.runtime.lastError) {
                            var error = "sync last error: " + chrome.runtime.lastError.message;
                            reject(error);
                        } else {
                            console.log("items", items);
                            if ($.isEmptyObject(items)) {
                                reject("Could not find any synced data!<br><br>Make sure you sign in to Chrome on your other computer AND this one <a target='_blank' href='https://support.google.com/chrome/answer/185277'>More info</a>");
                            } else {
                                var details = items["details"];
                                if (details.extensionVersion != chrome.runtime.getManifest().version) {
                                    reject({items:items, error:"Versions are different: " + details.extensionVersion + " and " + chrome.runtime.getManifest().version});
                                } else {
                                    resolve(items);
                                }
                            }
                        }
                    });
                } else {
                    reject(new Error("Sync is not supported!"));
                }
            });
        },
        load: function(items) {
            console.log("syncOptions: load...");
            return new Promise((resolve, reject) => {
                if (chrome.storage.sync) {
                    if (items) {
                        var details = items["details"];
                        if (details) {
                            // process localstorage
                            var dataObj;
                            dataObj = compileChunks(details, items, details.localStorageChunksCount, LOCALSTORAGE_CHUNK_PREFIX);
                            for (let item in dataObj) {
                                // noinspection JSUnfilteredForInLoop
                                localStorage.setItem(item, dataObj[item]);
                            }

                            // process indexeddb
                            if (details.indexedDBChunksCount) {
                                dataObj = compileChunks(details, items, details.indexedDBChunksCount, INDEXEDDB_CHUNK_PREFIX);
                                syncOptions.importIndexedDB(dataObj).then(() => {
                                    resolve(items);
                                }).catch(error => {
                                    reject(error);
                                })
                            } else {
                                resolve(items);
                            }

                            // finish stamp
                            localStorage.lastSyncOptionsLoad = new Date();
                            console.log("done");
                        }
                    } else {
                        reject("No items found");
                    }
                } else {
                    reject(new Error("Sync is not supported!"));
                }
            });
        },

        /**
         *
         * @param params {Object|undefined}
         * @param params.exportAll {bool|undefined}
         * @param callback
         */

        exportIndexedDB: function(params, callback) {
            params = initUndefinedObject(params);

            // noinspection JSUnresolvedVariable
            let db = bg.wrappedDB.db;

            if (!db) {
                callback({error: "jerror db not declared"});
                return;
            }

            //Ok, so we begin by creating the root object:
            var promises = [];
            for(var i=0; i<db.objectStoreNames.length; i++) {
                //thanks to http://msdn.microsoft.com/en-us/magazine/gg723713.aspx
                promises.push(

                    $.Deferred(function(defer) {

                        // noinspection JSReferencingMutableVariableFromClosure
                        var objectstore = db.objectStoreNames[i];
                        console.log("objectstore: " + objectstore);

                        var transaction = db.transaction([objectstore], "readonly");
                        var content = [];

                        // noinspection JSUnusedLocalSymbols
                        transaction.oncomplete = function(event) {
                            console.log("trans oncomplete for " + objectstore + " with " + content.length + " items");
                            defer.resolve({name:objectstore, data:content});
                        };

                        transaction.onerror = function(event) {
                            // Don't forget to handle errors!
                            console.dir(event);
                        };

                        var handleResult = function(event) {
                            var cursor = event.target.result;
                            if (cursor) {
                                //console.log(cursor.key + " " + JSON.stringify(cursor.value).length);

                                // don't include storage options starting with _blah and use exclude list
                                if (cursor.key.startsWith("_") || (!params.exportAll && syncOptions.excludeList.indexOf(cursor.key) != -1)) {
                                    // exclude this one and do nothing
                                    console.log("excluding this key: " + cursor.key);
                                } else {
                                    content.push({key:cursor.key,value:cursor.value});
                                }

                                cursor.continue();
                            }
                        };

                        var objectStore = transaction.objectStore(objectstore);
                        objectStore.openCursor().onsuccess = handleResult;

                    }).promise()

                );
            }

            $.when.apply($, promises)
                .done(function() {
                    // arguments is an array of structs where name=objectstorename and data=array of crap
                    // make a copy cuz I just don't like calling it argument
                    var dataToStore = arguments;
                    //serialize it
                    var serializedData = JSON.stringify(dataToStore);
                    console.log("datastore:", dataToStore);
                    console.log("length: " + serializedData.length);

                    callback({data:dataToStore});

                    //downloadObject(dataToStore, "indexedDB.json");

                    //The Christian Cantrell solution
                    //var link = $("#exportLink");
                    //document.location = 'data:Application/octet-stream,' + encodeURIComponent(serializedData);
                    //link.attr("href",'data:Application/octet-stream,'+encodeURIComponent(serializedData));
                    //link.trigger("click");
                    //fakeClick(link[0]);
                })
                .fail(function(args) {
                    console.log(args);
                    console.log(arguments);
                    callback({error:"jerror when exporting"});
                })
            ;
        },
        importIndexedDB: function(obj) {
            return new Promise(function(resolve, reject) {
                // first (and only) item in array should be the "settings" objectstore that was setup when using the indexedb with this plugin
                var settingsObjectStore = obj[0];
                if (settingsObjectStore.name == Settings.getStoreId()) {
                    var promises = [];
                    for (var a=0; a<settingsObjectStore.data.length; a++) {
                        var key = settingsObjectStore.data[a].key;
                        var value = settingsObjectStore.data[a].value.value;

                        // could be excessive but i'm stringifing because i want parse with the datereviver (instead of interacting the object myself in search of date strings)
                        value = JSON.parse(JSON.stringify(value), dateReviver);

                        console.log(key + ": " + value);
                        promises.push( Settings.store(key, value) );
                    }
                    Promise.all(promises).then(() => {
                        resolve();
                    }).catch(error => {
                        console.error(error);
                        reject("Problem importing settings: " + error);
                    });
                } else {
                    reject("Could not find 'settings' objectstore!");
                }
            });
        }
    };
})();