// require and instantiate express
var express = require('express');
var app = express();
var uuidv1 = require('uuid/v1');

app.set('view engine', 'ejs'); // set up ejs for templating

//middlewares
app.use(express.static('public'));

// express server
var server = app.listen(3000, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port);
});

// route
app.get('/', function (req, res) {
    res.render('index.ejs');
});

var io = require('socket.io')(server);

var connections = [];

// Registar o evento Connection
io.on('connection', function (socket) {

    socket.on('connected', function(){
        console.log('A user connected');
        socket.username = "User - " + uuidv1();
        connections.push(socket.username);
        io.emit('connected', { users: connections });
        console.log("Users connected: ", connections.length);
        console.log(connections);
    });
    
    //Broadcast the new message
    socket.on('send_message', (data) => {
        io.sockets.emit('broadcast_message', { message: data.message, username: socket.username });
    });

    socket.on('disconnect', function () {
        console.log('User disconnected');
        connections.splice(connections.indexOf(socket), 1);
        console.log("Users connected: ", connections.length);
        io.emit('connected',{users: connections});
    });
});


