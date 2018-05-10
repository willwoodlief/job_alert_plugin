function logError(action) {
    // transpose these arguments to console.error
    // use slice (instead of sPlice) because i want to clone array
    var argumentsArray = [].slice.call(arguments, 0);
    // exception: usually 'this' is passed but instead its 'console' because console and log are host objects. Their behavior is implementation dependent, and to a large degree are not required to implement the semantics of ECMAScript.
    console.error.apply(console, argumentsArray);

    sendGAError.apply(this, arguments);
}

function sendGAError(action) {
    // google analytics
    var JS_ERRORS_CATEGORY = "JS Errors";
    if (typeof sendGA != "undefined") {
        // only action (no label) so let's use useridentifier
        var userIdentifier = getUserIdentifier();
        if (arguments.length == 1 && userIdentifier) {
            sendGA(JS_ERRORS_CATEGORY, action, userIdentifier);
        } else {
            // transpose these arguments to sendga (but replace the 1st arg url with category ie. js errors)
            // use slice (instead of sPlice) because i want to clone array
            var argumentsArray = [].slice.call(arguments, 0);
            // transpose these arguments to sendGA
            var sendGAargs = [JS_ERRORS_CATEGORY].concat(argumentsArray);
            sendGA.apply(this, sendGAargs);
        }
    }
    //return false; // false prevents default error handling.
}


//anonymized email by using only 3 letters instead to comply with policy
function getUserIdentifier() {
    //can expand this to other users, right now its just me
    return 'www'
}

//usage: sendGA('category', 'action', 'label');
//usage: sendGA('category', 'action', 'label', value);  // value is a number.
//usage: sendGA('category', 'action', {'nonInteraction': 1});
function sendGA(category, action, label, etc) {

    // Disables sending any analytics when using Firefox to comply with their policy
    if (DetectClient.isChrome()) {
        console.log("%csendGA: " + category + " " + action + " " + label, "font-size:0.6em");

        // patch: seems arguments isn't really an array so let's create one from it
        var argumentsArray = [].splice.call(arguments, 0);

        var gaArgs = ['send', 'event'];
        // append other arguments
        // noinspection JSUnusedAssignment
        gaArgs = gaArgs.concat(argumentsArray);

        // noinspection JSUnresolvedVariable
        if (window && window.ga) {
            //ga.apply(this, gaArgs);
        }
    }

}