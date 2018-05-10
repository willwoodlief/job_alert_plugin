var DEFAULT_SETTINGS = {
    "language": getPreferredLanguage(),
    "notificationSound": "chime.ogg",
    "desktopNotification": "rich",
    "showNotificationDuration": 7,
    "notificationClickAnywhere": "open",
    "popupLeft": "100",
    "popupTop": "100",
    "popupWidth": "800",
    "popupHeight": "680",
    "setPositionAndSize":true,
    "notificationSoundVolume": 100
};



//init objects once in this background page and read them from all other views (html/popup/notification pages etc.)
Settings({defaults:DEFAULT_SETTINGS});

var settingsPromise = Settings.load();