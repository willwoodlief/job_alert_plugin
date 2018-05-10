// returns a subset of an object array with unique attributes, ex. [{type:"1"}, {type:"1"}, {type:"2"}}.unique(function(obj) {return obj.type}); // result: [1,2]
Array.prototype.uniqueAttr = function(getValueFunction) {
    var result = {};
    for(var i = 0; i < this.length; ++i) {
        var value = getValueFunction(this[i]);
        result[(typeof value) + ' ' + value] = value;
    }

    var retArray = [];

    for (let key in result) {
        if (result.hasOwnProperty(key)) {
            retArray.push(result[key]);
        }
    }

    return retArray;
};

Array.prototype.caseInsensitiveSort = function() {
    this.sort(function(a, b) {
        if (a.toLowerCase() < b.toLowerCase()) return -1;
        if (a.toLowerCase() > b.toLowerCase()) return 1;
        return 0;
    });
    return this;
};
Array.prototype.first = function() {
    return this[0];
};
Array.prototype.last = function() {
    return this[this.length-1];
};
Array.prototype.isEmpty = function() {
    return this.length == 0;
};
Array.prototype.swap = function (x,y) {
    var b = this[x];
    this[x] = this[y];
    this[y] = b;
    return this;
};

Array.prototype.addItem = function(key, value) {
    for (var i=0, l=this.length; i<l; ++i) {
        if (this[i].key == key) {
            // found key so update value
            this[i].value = value;
            return;
        }
    }
    this.push({key:key, value:value});
};

Array.prototype.getItem = function(key) {
    for (var i=0, l=this.length; i<l; ++i) {
        if (this[i].key == key) {
            return this[i].value;
        }
    }
};

// Convert associative javascript array to an object
Array.prototype.toObject = function() {
    var obj = {};
    for(var key in this){
        // exclude functions from object
        if (!$.isFunction(this[key])) {
            obj[key] = this[key];
        }
    }
    return obj;
};

String.prototype.parseUrl = function() {
    var a = document.createElement('a');
    a.href = this;
    return a;
};

String.prototype.replaceAll = function(find, replace) {
    var findEscaped = escapeRegExp(find);
    return this.replace(new RegExp(findEscaped, 'g'), replace);
};

function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}


var ONE_SECOND = 1000;
var ONE_MINUTE = 60000;
var ONE_HOUR = ONE_MINUTE * 60;
var ONE_DAY = ONE_HOUR * 24;

function seconds(seconds) {
    return seconds * ONE_SECOND;
}

function minutes(mins) {
    return mins * ONE_MINUTE;
}

function hours(hours) {
    return hours * ONE_HOUR;
}

function days(days) {
    return days * ONE_DAY;
}

Date.prototype.resetTime = function () {
    this.setHours(0);
    this.setMinutes(0);
    this.setSeconds(0, 0);
};

function today() {
    var date = new Date();
    date.resetTime();
    return date;
}

function yesterday() {
    var yest = new Date();
    yest.setDate(yest.getDate()-1);
    yest.resetTime();
    return yest;
}

function tomorrow() {
    var tom = new Date();
    tom.setDate(tom.getDate()+1);
    tom.resetTime();
    return tom;
}

function isToday(date) {
    var todayDate = today();
    return date.getFullYear() == todayDate.getFullYear() && date.getMonth() == todayDate.getMonth() && date.getDate() == todayDate.getDate();
}

function isTomorrow(date) {
    var tom = tomorrow();
    return date.getFullYear() == tom.getFullYear() && date.getMonth() == tom.getMonth() && date.getDate() == tom.getDate();
}

function isYesterday(date) {
    var yest = yesterday();
    return date.getFullYear() == yest.getFullYear() && date.getMonth() == yest.getMonth() && date.getDate() == yest.getDate();
}

function now() {
    return new Date();
}

Date.prototype.isToday = function () {
    return isToday(this);
};

Date.prototype.isTomorrow = function () {
    return isTomorrow(this);
};

Date.prototype.isYesterday = function () {
    return isYesterday(this);
};

Date.prototype.isSameDay = function (otherDay) {
    return this.getFullYear() == otherDay.getFullYear() && this.getMonth() == otherDay.getMonth() && this.getDate() == otherDay.getDate();
};

Date.prototype.isBefore = function(otherDate) {
    var paramDate;
    if (otherDate) {
        paramDate = new Date(otherDate);
    } else {
        paramDate = new Date();
    }
    var thisDate = new Date(this);
    return thisDate.getTime() < paramDate.getTime();
};

Date.prototype.isAfter = function(otherDate) {
    return !this.isBefore(otherDate);
};

Date.prototype.diffInSeconds = function(otherDate) {
    var d1;
    if (otherDate) {
        d1 = new Date(otherDate);
    } else {
        d1 = new Date();
    }
    var d2 = new Date(this);
    return (d2.getTime() - d1.getTime()) / ONE_SECOND;
};

Date.prototype.diffInMinutes = function(otherDate) {
    var d1;
    if (otherDate) {
        d1 = new Date(otherDate);
    } else {
        d1 = new Date();
    }
    var d2 = new Date(this);
    return (d2.getTime() - d1.getTime()) / ONE_MINUTE;
};

Date.prototype.diffInHours = function(otherDate) {
    var d1;
    if (otherDate) {
        d1 = new Date(otherDate);
    } else {
        d1 = new Date();
    }
    var d2 = new Date(this);
    return (d2.getTime() - d1.getTime()) / ONE_HOUR;
};

Date.prototype.diffInDays = function(otherDate) {
    var d1;
    if (otherDate) {
        d1 = new Date(otherDate);
    } else {
        d1 = new Date();
    }
    d1.setHours(1);
    d1.setMinutes(1);
    var d2 = new Date(this);
    d2.setHours(1);
    d2.setMinutes(1);
    return (d2.getTime() - d1.getTime()) / ONE_DAY;
};

Date.prototype.daysInThePast = function() {
    return this.diffInDays() * -1;
};

Date.prototype.addDays = function(days) {
    var newDate = new Date(this);
    newDate.setDate(newDate.getDate()+days);
    return newDate;
};

Date.prototype.subtractDays = function(days) {
    return this.addDays(days*-1);
};