/**
 * The data for the auth call
 * @typedef {Object} TokenResponse
 * @property {string} jwt - the token
 */

/**
 * the job data
 * @typedef {Object} Job
 * @property {string} internal_id - unique identifier
 * @property {boolean} is_read - unique identifier
 * @property {string} star_symbol - character this is flagged with
 * @property {string} star_color - css color this is flagged with
 * @property {string} link - http link
 * @property {string} price_hint - about the price
 * @property {string} created_at - when created in iso8601 format
 * @property {string} description - some description, may not be complete
 * @property {string} title - title of job
 * @property {string} comments - any notes added by us

 */


/**
 * the result meta (singular)
 * @typedef {Object} ResultMeta
 * @property {int|string} page - the page number of the current results
 * @property {int|string} total_pages - total number pages in the results
 * @property {int|string} per_page - number of results per page

 */


/**
 * the results meta
 * @typedef {Object.<string, ResultMeta>} ResultMetas
 *
 */


/**
 * The data for the list call
 * @typedef {Object} ListResponse
 * @property {Job[]} results - array of jobs
 * @property {ResultMetas} meta - hash of result_meta
 * @property {ListParams} options_used - the options passed in and processed
 */

/**
 * the params for the list call
 * @typedef {Object} ListParams
 * @property {boolean} is_read
 * @property {int} ts_start
 * @property {int} ts_end
 * @property {int} page
 * @property {int} per_page
 * @property {string} star_symbol
 * @property {string} star_color
 * @property {string} comment_fragment
 * @property {string} filter
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
        let  start_range_ts = Settings.read("_last_listing_poll");
        if (!start_range_ts) {
            start_range_ts = Math.round((new Date()).getTime() / 1000);
        }
        let p = await s.talk_to_server('jobs/stats','GET',{stats: {start_range_ts:start_range_ts}});
        await Settings.store("_last_listing_poll",start_range_ts);

        bg.ee.emitEvent('stats',[p]);
        return p;
    } catch (e) {
        console.error(e.message);
        throw e;
    }

}

async function  do_list_call(options) {
    try {
        console.debug("options for list call",options);
        let params = {list: {}};
        //is_read,ts_start,ts_end,page,per_page,star_symbol,star_color,comment_fragment,filter
        if (('is_read' in options) && (options['is_read'] !== null)) {params.list.is_read = options['is_read'];}
        if (('ts_start' in options)  && (options['ts_start'] !== null)){params.list.ts_start = options['ts_start'];}
        if (('ts_end' in options)  && (options['ts_end'] !== null)) {params.list.ts_end = options['ts_end'];}
        if (('page' in options)  && (options['page'] !== null)) {params.list.page = options['page'];}
        if (('per_page' in options)  && (options['per_page'] !== null)) {params.list.per_page = options['per_page'];}
        if (('star_symbol' in options)  && (options['star_symbol'] !== null)) {params.list.star_symbol = options['star_symbol'];}
        if (('star_color' in options)  && (options['star_color'] !== null)) {params.list.star_color = options['star_color'];}
        if (('comment_fragment' in options)  && (options['comment_fragment'] !== null)) {params.list.comment_fragment = options['comment_fragment'];}
        if (('filter' in options)  && (options['filter'] !== null)) {params.list.filter = options['filter'];}
        let bg = chrome.extension.getBackgroundPage();

        let s = new server_talk();
        let  last_start_range = Settings.read("_last_listing_poll");
        let  end_range_ts = null;
        let  start_range_ts = null;
        if (!last_start_range) {
            //now minus ten minutes ago if it was not set at all
            start_range_ts = Math.round((new Date()).getTime() / 1000) ;
            end_range_ts = Math.round((new Date()).getTime() / 1000) - (60*15);
        } else {
            end_range_ts = last_start_range;
            start_range_ts = Math.round((new Date()).getTime() / 1000);
        }


        //todo start and end range for defaults need improvement and testing
        // if a start range already exists then it needs to be the end range, and the new start range needs to be made  for now
        // if a start range does not exist, then the start should be now, and the end range should be 15 minutes ago

        if (!('ts_start' in params.list) && !('ts_end' in params.list)) {
            params.list.ts_start = start_range_ts;
            params.list.ts_end = end_range_ts;
            await Settings.store("_last_listing_poll",start_range_ts);
        }


        console.debug("params for list call",params);
        let p = await s.talk_to_server('jobs/list','GET',params);






        bg.ee.emitEvent('listings_from_server',[p]);
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

/**
 * @param  {ListParams=} params
 * @returns {ListParams}
 */
function get_list_options(params) {
    if (!params) {
        params = {};
    }


    let ret = /** @type {ListParams} */ ({
        is_read: 0,
        ts_start: null,
        ts_end: null,
        page: 1,
        per_page: 100,
        star_symbol: null,
        star_color: null,
        comment_fragment: null,
        filter: null
    });


    //overwrite any defaults
    Object.keys(ret).filter(key => key in params).forEach(key => {
        ret[key] = params[key];
    });

    return ret;
}

/**
 * @param {ListResponse} listings
 */
function process_listings_from_server(listings) {
    //return if no results
    if (listings.results.length === 0) {
        return;
    }
    //save listings

    let max_jobs = parseInt(Settings.read("limit_of_jobs_stored"));

    /**
     * @type {Job[]} jobs
     */
    let jobs = Settings.read("_jobs_array");
    if (jobs === null) { jobs = [];}

    var old_id_hash = {};
    for(let i = 0; i < jobs.length; i++) {
        let node = jobs[i];
        old_id_hash[node.internal_id] = node;
        old_id_hash[node.internal_id].index = i;
    }

    let new_jobs = [];
    //go though and see how many things are not in the jobs array
    for(let i = 0; i < listings.results.length; i++) {
        let node = jobs[i];
        if (!old_id_hash.hasOwnProperty(node.internal_id)) {
            new_jobs.push(node);
        }
    }



    let number_to_trim = jobs.length + new_jobs.length  - max_jobs ;
    if (number_to_trim <= 0) {number_to_trim = 0}
    if (number_to_trim > 0) {
        /**
         * @type {Job[]} new_jobs_array
         */
        let new_jobs_array = [];
        //add in all the starred
        for(let i = 0; i < jobs.length; i++) {
            let node = jobs[i];
            if (node.star_symbol || node.star_color) {
                new_jobs_array.push(node);
            }
        }

        let count_remaining = number_to_trim;
        //add in rest of most recent, the hard limit does not count for starred and assume they are in order from oldest to newest
        for(let i = 0; i < jobs.length; i++) {
            let node = jobs[i];
            if (!(node.star_symbol) && !(node.star_color) ) {
                new_jobs_array.push(node);
            }
            count_remaining--;
            if (count_remaining <= 0) {break;}
        }
        jobs = new_jobs_array;
    }

    //add new jobs in
    //first update
    for(let i = 0; i < listings.results.length; i++) {
        let node = jobs[i];
        if (old_id_hash.hasOwnProperty(node.internal_id)) {
            let old = old_id_hash[node.internal_id];
            let index = old.index;
            jobs[index] = node;
        }
    }

    //then concat the rest onto the end


    jobs = jobs.concat(new_jobs);

    //how sort via created_at

    jobs.sort(function(a, b) {
        return Date.parse(a.created_at) -  Date.parse(b.created_at);
    });

    //get meta and see if there is any pages remaining, if so call to get them
    let meta = listings.meta;
    let next_page = null;

    //all the engine meta will return the same page, but not necessarily the same number of pages remaining
    for( var key in meta) {
        if (meta.hasOwnProperty(key)) {
            let node = meta[key];
            let current_page = parseInt(node.page);
            let total_pages = parseInt(node.total_pages);
            if (current_page < total_pages) {
                next_page =current_page + 1;
            }
        }
    }

    //if there is a next page, get it
    if (next_page) {
        let options = listings.options_used;
        options.page = next_page;

        do_list_call(options).
        /**
         * @param {ListResponse} msg
         */
        then(msg => {console.log("called list ok from process listings",new Date(), msg.results.length) }).
        catch(e=> console.warn("list failed from process listings",e));
    }

    Settings.store('_jobs_array',jobs);
    bg.ee.emitEvent('jobs_updated',[{all:jobs,current: listings.results,jobs_new: new_jobs}]);
}

