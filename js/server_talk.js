var server_talk = function(url_target) {
  this.ping = function() {
      var jwtoken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE1MjYzNzQ0NzksInN1YiI6MX0.WlCcZG4yaK-EWqpuJpqb4W68SbWMs_N_9rc6cGFNy2o";
      var xhr = new XMLHttpRequest();

      xhr.open("GET", url_target + "/auth", true);
      xhr.setRequestHeader('Authorization', 'Bearer ' + jwtoken);
      xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
              var resp = JSON.parse(xhr.responseText);
              console.log(resp);
          }
      };
      xhr.send();
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