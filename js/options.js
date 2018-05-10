var Settings;
var bg;
var justInstalled = getUrlValue(location.href, "action") == "install";

function reloadExtension() {
    if (chrome.runtime.reload) {
        chrome.runtime.reload();
    } else {
        alert("You must disable/re-enable the extension in the extensions page or restart the browser");
    }
}

chrome.runtime.getBackgroundPage(function (backgroundPage) {
    Settings = backgroundPage.getSettings();
    bg = backgroundPage;

    if (justInstalled) {
        // check for sync data
        bg.syncOptions.fetch().then(function(items) {
            console.log("fetch response", items);
            let b_restore = confirm("Would you like to use your previous extension options?");
            if (b_restore) {
                bg.syncOptions.load(items).then(function(items) {
                    console.log(items);
                    alert("Restart extension");
                    reloadExtension();
                });
            }

        }).catch(error => {
            console.warn("error fetching: ", error);
        });

    } else {
        //not just installed
    }

    $(function() {
        let nodes = $('[indexdb-storage]');
        nodes.each(function(index, element) {
            element = $(element);

            let key = element.attr("indexdb-storage");
            let tag_name = element.prop("tagName").toString().toLowerCase();
            let control_type = 'text';
            if (tag_name === 'input') {
                control_type = element.attr("type");
            } else {
                control_type = tag_name;
            }

            let initial_value = Settings.read(key);

            switch (control_type) {
                case 'text':
                case 'password':
                    element.val(initial_value? initial_value : '');
                    break;
                case 'radio':
                    element.prop( "checked", !!initial_value );
                    break;
                case 'checkbox':
                    element.prop( "checked", !!initial_value );
                    break;
                case 'textarea':
                    element.val(initial_value? initial_value : '');
                    break;
                case 'select':
                    element.val(initial_value? initial_value : '');
                    break;
                default:
                    throw "cannot set initial value from control type of " + control_type;
            }

            //needs to be a fraction of a second after
            setTimeout(function() {

                let event_name = null;
                switch (control_type) {
                    case 'text':
                    case 'password':
                        event_name = "change";
                        break;
                    case 'radio':
                        event_name = "change";
                        break;
                    case 'checkbox':
                        event_name = "change";
                        break;
                    case 'textarea':
                        event_name = "change";
                        break;
                    case 'select':
                        event_name = "change";
                        break;
                    default:
                        throw "cannot recognize control type of " + control_type;
                }



                element.on(event_name, function() {
                    if (key) {

                        let value = null;
                        switch (control_type) {
                            case 'text':
                            case 'password':
                                value = element.val();
                                break;
                            case 'radio':
                                if( element.is(":checked") ){ // check if the radio is checked
                                    value = element.val(); // retrieve the value
                                }
                                break;
                            case 'checkbox':
                                if( element.is(":checked") ){ // check if the radio is checked
                                    value = element.val(); // retrieve the value
                                }
                                break;
                            case 'textarea':
                                value = element.val();
                                break;
                            case 'select':
                                value = element.val();
                                break;
                            default:
                                throw "cannot get value from control type of " + control_type;
                        }


                        var storagePromise;

                        if (key) {
                            storagePromise = Settings.store(key, value);
                        } else  {
                            return;
                        }

                        storagePromise.catch(error => {
                            console.error("could not save setting: " + error);
                            if (control_type === 'checkbox') {
                                element.prop( "checked", !value );
                            }
                        });
                    }
                });
            }, 500);
        });
    });
});




