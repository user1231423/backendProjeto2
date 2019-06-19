// require and instantiate express
var express = require('express');
var app = express();
var uuidv1 = require('uuid/v1');

app.set('view engine', 'ejs'); // set up ejs for templating

//middlewares
app.use(express.static('public'));

// express server
var server = app.listen(3000, function() {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port);
});

// route
app.get('/', function(req, res) {
    res.render('index.ejs');
});

var io = require('socket.io')(server);

//Array of connections to app
var connections = [];

//Register event Connection
io.on('connection', function(socket) {

    socket.on('connected', function() {
        console.log('A user connected');
        socket.username = "User + " + uuidv1();
        connections.push(socket.username);
        io.emit('connected', { users: connections });
        var message = "Has joined the chat!";
        io.sockets.emit('broadcast_message', { message: message, username: socket.username, importance: 2 });
        console.log("Users connected: ", connections.length);
    });

    //Broadcast the new message
    socket.on('send_message', (data) => {
        io.sockets.emit('broadcast_message', { message: data.message, username: socket.username, importance: 3 });
    });

    //Handle user disconect
    socket.on('disconnect', function() {
        console.log('User disconnected');
        var message = "Has left the chat!";
        io.sockets.emit('broadcast_message', { message: message, username: socket.username, importance: 1 });
        connections.splice(connections.indexOf(socket.username), 1);
        console.log("Users connected: ", connections.length);
        io.emit('connected', { users: connections });
    });

    //Handle change name
    socket.on('change_name', (data) => {
        var newName = data.newName;
        var splitedName = socket.username.split(' +');
        if (splitedName[0] == newName) {
            var message = "This is already your name!"
            io.emit('alert', { message: message });
        } else {
            for (var i = 0; i < connections.length; i++) {
                if (connections[i] == socket.username) {
                    var changeID = i;
                }
            }
            splitedName[0] = newName;
            var previousName = socket.username;
            socket.username = splitedName[0].concat(' + ', splitedName[1]);
            connections[changeID] = socket.username;
            var message = "Changed his username to " + socket.username;
            io.sockets.emit('broadcast_message', { message: message, username: previousName, importance: 1 });
            io.emit('connected', { users: connections, username: socket.username });
        }
    });
});