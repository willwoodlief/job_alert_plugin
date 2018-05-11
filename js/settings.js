var Settings = function(params) {
    var cache = {};
    var storeId = "settings";

    Settings.defaults = params.defaults;


    function loadFromDB() {
        return wrappedDB.readAllObjects(
            storeId,
            function(setting) {
                if (setting) {
                    cache[setting.key] = setting.value;
                }
            }
        );
    }

    Settings.getStoreId = function() {
        return storeId;
    };


    Settings.read = function(key) {

        if (cache[key] != null) {
            return cache[key];
        } else if (this.defaults[key] != null) {
            return this.defaults[key];
        } else {
            return null;
        }
    };

    // does not use defaults, will return null
    Settings.readRaw = function(key) {
        return cache[key];
    };

    Settings.changedByUser = function(key) {
        return cache[key] != null;
    };

    // created this method because objects return from Settings.read could be modified and since they were references they would also modify the cache[]  So if we called Settings.read on the same variable it would return the modified cached variables instead of what is in actual storage
    Settings.readFromStorage = function(key) {
        return wrappedDB.readObject(storeId, key).then(value => {
            // update cache
            cache[key] = value;
            value = Settings.read(key);
            resolve(value);
        });
    };

    Settings.store = function(key, value) {
        cache[key] = value;
        return wrappedDB.putObject(storeId, key, value);
    };

    Settings.enable = function(key) {
        return Settings.store(key, true);
    };

    Settings.disable = function(key) {
        return Settings.store(key, false);
    };

    Settings.storeDate = function(key) {
        return Settings.store(key, new Date());
    };

    Settings.firstTime = function(key) {
        if (Settings.read("_" + key)) {
            return false;
        } else {
            Settings.storeDate("_" + key);
            return true;
        }
    };

    Settings.delete = function (key) {
        // remove it from cache
        delete cache[key];

        // remove it from indexeddb
        return wrappedDB.deleteSetting(storeId, key);
    };

    Settings.load = function() {
        //return Promise.reject("problem in db");
        var DBNAME = "JOBS";
        return wrappedDB.open(DBNAME, storeId).then(() => {
            console.debug("loading in database");
            return loadFromDB();
        });
    };
};