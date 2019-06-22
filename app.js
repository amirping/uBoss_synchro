const http = require('http');
const trelloApi = require("./api/trelloApi").trelloApi
const express = require('express');
const socketIO = require('socket.io');
const CircularJSON = require('circular-json');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const port = process.env.PORT || 3001;
const bodyParser = require('body-parser');


// hooks for users
let hooksUsers = {};



app.use(express.static(__dirname));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))

// parse application/json
app.use(bodyParser.json())
/**
 * callback with 1 param = token  
 */
app.all('/hooks_fire/:token', function (req, res) {
    let token = req.param('token');
    // ignore the request if the user behinde this action 
    if (req.method === "HEAD") {
        console.log("CHECKING FROM TRELLO")
        res.status(200).send();
    } else {
        let isToIgnore = false;
        if (hooksUsers[token] != undefined || hooksUsers[token] != null) {
            console.log("PUSH some data to the user ->", token)
            // ignore card move from the connected user as it can drag into infinty relode
            let session = hooksUsers[token]
            if (session.idTrello === req.body.action.idMemberCreator) {
                if (req.body.action.type === "updateList") {
                    console.log("Ignore this update ")
                    isToIgnore = true;
                }
            }
            if (!isToIgnore) {
                hooksUsers[token].socket.emit("UPDATE_DATA", req.body.model);
            }
        }
        res.status(200).send();
    }
});
app.get("/showHeart", function (req, res) {
    let keys = Object.keys(hooksUsers);
    let output = {}
    keys.map(k => {
        let i = hooksUsers[k];
        i.client = null
        output[k] = i
    })
    res.json(output)
})
io.on('connection', (client) => {
    console.log('New user connected');

    client.on("START_SESSION", (data) => {
        console.log("NEW connection from", data.user)
        console.log("checking if have registred session")
        if (hooksUsers[data.user]) {
            console.log("already registred");
            console.log("UPDATING SOCKET")
            hooksUsers[data.user].socket_id = client.client.id;
            hooksUsers[data.user].socket = client;
        } else {
            // get user id -> we need to ignore any action by this user .
            trelloApi.getUser(data.user, data.app).then(res => {
                console.log("We get user Data ");
                let session = {
                    cards: [],
                    session_time: new Date(),
                    socket_id: client.client.id,
                    userToken: data.user,
                    appToken: data.app,
                    idTrello: res.idMember,
                    socket: client
                };
                hooksUsers[data.user] = session;
                console.log("STARTS SESSION for ", data.user)
                console.log(hooksUsers[data.user]);
            }).catch(err => {
                console.log(err)
            })
        }
    })

    client.on('START_WATCH', (data) => {
        console.log("START_WATCH");
        // whene we get start watch we need to stop all previous watch for this user that we dont have in the new data0
        console.log(data)
        if (hooksUsers[data.token]) {
            // clear no needed ids if we have  
            let cleared_ids = [];
            hooksUsers[data.token].cards.map(id => {
                if (!data.cards.includes(id)) {
                    trelloApi.removeHook(id, hooksUsers[data.token].userToken, hooksUsers[data.token].appToken).then(json => {
                        if (json.status === 200) {
                            cleared_ids.push(id)
                            console.log("one element added to clear list")
                        }
                    }).catch(err => {
                        console.log(err)
                    })
                }
            })
            cleared_ids.map(id => {
                hooksUsers[data.token].cards = hooksUsers[data.token].cards.splice(hooksUsers[data.token].cards.indexOf(id), 1);
            })
            // add new one
            data.cards.map(id => {
                if (!hooksUsers[data.token].cards.includes(id)) {
                    // create hook -> push to array of register
                    console.log("start hook for the id => ", id)
                    // reduce charge on the local server and give time for response
                    setTimeout(() => {
                        // remove old lisnter on same card
                        trelloApi.removeHook(id, hooksUsers[data.token].userToken, hooksUsers[data.token].appToken).then(json => {
                            trelloApi.createHook(id, data.token, hooksUsers[data.token].appToken).then(json => {
                                if (json.status === 200) {
                                    hooksUsers[data.token].cards.push(id)
                                    console.log("SUCCESS on -> ", id)
                                } else {
                                    console.log(json.status)
                                }
                            }).catch(err => {
                                console.log(err)
                            });
                        }).catch(err => {
                            console.log(err)
                        })
                    }, 1000);
                }
            })
        } else {
            console.log("BROKEN SESSION -> RESTART")
            client.emit('RESTART_SESSION')
        }
    });

    client.on('disconnect', () => {
        console.log('User disconnected')
    });
});

server.listen(port, () => {
    console.log(`Server is up and running on port ${port}`);
});