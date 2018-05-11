/**
 * The data for the auth call
 * @typedef {Object} TokenResponse
 * @property {string} jwt - the token
 */

var server_talk = function () {


    this.refresh_token = async function () {

        let base_url = Settings.read("server_url");
        if (!base_url) {
            throw new Error("Server URL is not set in preferences")
        }
        let user_name = Settings.read("user_name");
        let user_password = Settings.read("user_password");
        if (!user_name || !user_password) {
            console.warn("user name and/or password not set", user_name, user_password);
            return false;
        }

        let data = {};
        data.auth = {email: user_name, password: user_password};
        let url = base_url + "/user_token";
        let run = await fetch(url, {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(data), // data can be `string` or {object}!
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        });

        if (await run.status !== 201) {
            console.error("Getting token resulted in a respose of not 201");
            let e = new Error('Auth Failed');
            e.submitted_auth_failed = true;
            throw e;
        } else {
            /**
             * @type {TokenResponse} server_response
             */
            let server_response = await run.json();

            let token = server_response.jwt;
            await Settings.store("_api_token",token);
            return token;
        }




    };



    this.talk_to_server = async function (url_fragment,method,data_in) {
        try {

            let base_url = Settings.read("server_url");
            if (!base_url) {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error("Server URL is not set in preferences")
            }

            var jwtoken = Settings.read("_api_token");
            if (!jwtoken) {
                jwtoken = await this.refresh_token();
            }

            let fetch_options = {
                method: method, // or 'PUT'
                // body: JSON.stringify(data), // data can be `string` or {object}!
                headers: new Headers({
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + jwtoken
                })
            };

            let url = base_url + "/" + url_fragment;

            if (data_in) {
                if (method !== 'GET') {
                    fetch_options.body = JSON.stringify(data_in);
                }
                else {
                    //https://medialize.github.io/URI.js/docs.html
                    let query = $.param(data_in);
                    url += '?' + query;
                }
            }


            let run = await fetch(url, fetch_options);
            let status = await run.status ;
            let ok = await run.ok;
            if (status == 401) {
                console.log("refreshing auth");
                await this.refresh_token();
                return await this.talk_to_server(url_fragment,method,data_in);
            } else if (!ok) {
                console.error("Server has error,");
                let error_text = await run.text().toString();
                // noinspection ExceptionCaughtLocallyJS
                throw new  Error("Server has issues: " + error_text);
            } else {
                return await run.json();
            }
        } catch (err) {
            console.log('fetch failed', err);
            throw err ;
        }
    };


};


// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
// for each call have the promise fail with a bad_token field set to true if server responds with a 401  or >=500
// for the auth, have the promise fail if 404 or >=500, user_name, user_password in settings, save in settings with _token
//save jobs to a _jobs key, so it will not get synced

//set listener on the db _jobs changes, to broadcast for new items not previously broadcast
//  same listener will look for edit history not broadcast (updates set extra edit info with ts)

//set listener for when the status field updates in the db, and notify other listeners

//https://developers.google.com/web/fundamentals/primers/async-functions  call each list and status and run this way


//for status, check status on timed loop of run_loop_time, and for each engine found add a _engine_flags {} with
//    last run time or null for each value
// after status, do the run , with the engines to run, then results of run are put into the _engine_flags
// any results found in status call goto any listeners


//events same frame custom events below
// https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events#Creating_custom_events

async function  do_stats_call() {
    try {
        let bg = chrome.extension.getBackgroundPage();

        let s = new server_talk();
        let  start_range_ts = Settings.read("_last_stats_time");
        if (!start_range_ts) {
            start_range_ts = Math.round((new Date()).getTime() / 1000);
        }
        let p = await s.talk_to_server('jobs/stats','GET',{stats: {start_range_ts:start_range_ts}});
        await Settings.store("_last_stats_time",start_range_ts);

        bg.ee.emitEvent('stats',[p]);
        return p;
    } catch (e) {
        console.error(e.message);
        throw e;
    }

}

async function  do_list_call(options) {
    try {
        let params = {list: {}};
        //is_read,start_ts,end_ts,page,per_page,star_symbol,star_color,comment_fragment,filter
        if ('is_read' in options) {params.list.is_read = options['is_read'];}
        if ('start_ts' in options) {params.list.start_ts = options['start_ts'];}
        if ('end_ts' in options) {params.list.end_ts = options['end_ts'];}
        if ('page' in options) {params.list.page = options['page'];}
        if ('per_page' in options) {params.list.per_page = options['per_page'];}
        if ('star_symbol' in options) {params.list.star_symbol = options['star_symbol'];}
        if ('star_color' in options) {params.list.star_color = options['star_color'];}
        if ('comment_fragment' in options) {params.list.comment_fragment = options['comment_fragment'];}
        if ('filter' in options) {params.list.filter = options['filter'];}
        let bg = chrome.extension.getBackgroundPage();

        let s = new server_talk();
        let  start_range_ts = Settings.read("_last_stats_time");
        if (!('start_ts' in params.list) && !('end_ts' in params.list)) {
            start_range_ts = Math.round((new Date()).getTime() / 1000);
            params.list.start_ts = start_range_ts;
        }

        let p = await s.talk_to_server('jobs/list','GET',params);
        await Settings.store("_last_stats_time",start_range_ts);

        bg.ee.emitEvent('listings',[p]);
        return p;
    } catch (e) {
        console.error(e.message);
        throw e;
    }

}

async function  do_run_call(engines) {
    try {
        if (!engines) {
            engines = [];
        }
        let params = {run: {engines: engines}};

        let bg = chrome.extension.getBackgroundPage();

        let s = new server_talk();


        let p = await s.talk_to_server('jobs/run','POST',params);

        bg.ee.emitEvent('runs',[p]);
        return p;
    } catch (e) {
        console.error(e.message);
        throw e;
    }

}

