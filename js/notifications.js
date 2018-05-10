var richNotifId;
var richNotifMails = [];

function showMessageNotification(title, message, error, extensionConflict) {
    var options = {
        type: "basic",
        title: title,
        message: message,
        iconUrl: Icons.NOTIFICATION_ICON_URL,
        priority: 1
    };

    var notificationId;
    if (error) {
        var buttonTitle;

        if (extensionConflict) {
            notificationId = "extensionConflict";
            buttonTitle = "Click here to resolve issue";
        } else {
            notificationId = "error";
            buttonTitle = "If this is frequent then click here to report it";
        }

        if (DetectClient.isChrome()) {
            options.contextMessage = "Error: " + error;
            options.buttons = [{title:buttonTitle, iconUrl:"images/notify/open.svg"}];
        } else {
            options.message += " Error: " + error;
        }
    } else {
        notificationId = "message";
    }

    chrome.notifications.create(notificationId, options, function(notificationId) {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        } else {
            setTimeout(function () {
                chrome.notifications.clear(notificationId);
            }, error ? seconds(15) : seconds(5));
        }
    });
}

function clearRichNotification(notificationId) {
    return new Promise((resolve, reject) => {
        if (notificationId) {
            chrome.notifications.clear(notificationId, function() {
                richNotifMails = [];
                resolve();
            });
        } else {
            richNotifMails = [];
            resolve();
        }
    });
}