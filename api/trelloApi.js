const fetch = require('node-fetch');

API_URL = "https://api.trello.com/1/webhooks/";
API_CALLBACK_URL = "http://71788959.ngrok.io/hooks_fire/"
USER_API_URL = "https://api.trello.com/1/tokens/"
var TrelloApi = {
    getUser: function (userToken, applicationToken) {
        return fetch(USER_API_URL + userToken + "?token=" + userToken + "&key=" + applicationToken, {
            method: 'get',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(res => {
            if (res.ok)
                return res.json()
            return res
        })
    },
    createHook: function (modelID, userToken, appToken) {
        return fetch(API_URL + "/?callbackURL=" + API_CALLBACK_URL + "" + userToken + "&idModel=" + modelID + "&key=" + appToken + "&token=" + userToken, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
        }).then(res => {
            if (res.ok)
                return res.json()
            return res
        })
    },
    removeHook: function (modelID, userToken, appToken) {
        return fetch(API_URL + "", {
            method: 'delete',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(res => {
            if (res.ok)
                return res.json()
            return res
        })

    }
}
module.exports.trelloApi = TrelloApi