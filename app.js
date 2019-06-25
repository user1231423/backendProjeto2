// require and instantiate express
var express = require('express');
var app = express();
var uuidv1 = require('uuid/v1');
var fs = require('fs');
var multer = require('multer');
var bodyParsrer = require('body-parser');
var rimraf = require("rimraf");
var base64Img = require('base64-img');


//Multer config
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/images')
    },
    filename: (req, file, cb) => {
        //Allow only jpeg or png
        if ((file.mimetype == 'image/png') || (file.mimetype == 'image/jpeg')) {
            var type = file.mimetype.split('/');
            var fileType = type[1];
            cb(null, file.fieldname + '-' + uuidv1() + '.' + fileType); //image name is always generated with given field name + random id
        } else {
            return cb('Only png or jpeg are allowed!');
        }
    }
});
var upload = multer({ storage: storage }).single('image');

// set up ejs for templating
app.set('view engine', 'ejs');

//middlewares
app.use(express.static('public'));
app.use(bodyParsrer.json());

// express server
var server = app.listen(3000, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port);
});

//Require socket.io
var io = require('socket.io')(server);

//Routes
app.get('/', function (req, res) {
    res.render('index.ejs');
});

//Image upload route
app.post('/upload', function (req, res) {
    upload(req, res, function (err) {
        if (err) {
            res.status(406).send(err);
        } else {
            res.json({ file: req.file.filename });
        }
    })
})

//Array of connections to app
var connections = [];

//Array of users connected to the app
var users = [];

//Path to file with chat history
var historyDir = './history/';
var imgDir = './public/images'
var logDir = './log'
var logFile = './log/file.log'

//Streams
var writeHistoryStream;
var writeLogStream;

function checkFiles() {
    //Get today date
    var today = new Date();
    var todayDate = today.getDay() + '-' + today.getMonth() + '-' + today.getFullYear();
    //Get current date
    var date = new Date();
    var dateName = date.getDay() + '-' + date.getMonth() + '-' + date.getFullYear();

    //Name the history file after the current date
    var historyFile = historyDir + 'history-' + dateName + '.log';

    //Check if file and dir exists if not then we will create it
    if (fs.existsSync(historyDir)) {
        if (dateName != todayDate) {
            if (!fs.existsSync(historyFile)) {
                fs.writeFileSync(historyFile, '');
            }
        }
    } else {
        fs.mkdirSync(historyDir);
        if (dateName != todayDate) {
            if (!fs.existsSync(historyFile)) {
                fs.writeFileSync(historyFile, '');
            }
        }
    }

    //Check if log and dir exists if not then we will create it
    if (fs.existsSync(logDir)) {
        if (!fs.existsSync(logFile)) {
            fs.writeFileSync(logFile, '');
        }
    } else {
        fs.mkdirSync(logDir);
    }

    //Check if image dir exists
    if (!fs.existsSync(imgDir)) {
        fs.mkdirSync(imgDir);
    }

    //Create history stream
    writeHistoryStream = fs.createWriteStream(historyFile, { 'flags': 'a' });

    //Create log stream
    writeLogStream = fs.createWriteStream(logFile, { 'flags': 'a' });
}

//Register event Connection
io.on('connection', function (socket) {
    //Call checkFiles function
    checkFiles();

    //On user connection
    socket.on('connected', function () {
        socket.username = "User + " + uuidv1();
        var user = {
            name: socket.username,
            id: socket.id
        }
        //push user object into users array
        users.push(user);
        //push username into connections array
        connections.push(socket.username);
        //Emit that a user has connected sending the connections array
        io.emit('connected', { users: connections });

        //Welcome the user to the chat
        var message = "Welcome to the chat!";
        socket.emit('broadcast_message', { username: socket.username, message: message, importance: 2 });

        //Let all other users know he has joined
        var message = "Has joined the chat!";
        socket.broadcast.emit('broadcast_message', { message: message, username: socket.username, importance: 2 });

        //Write history with streams
        writeMessage = socket.username + " " + message + "\n";
        writeHistoryStream.write(writeMessage);

        //Write Log with streams
        var dayHours = new Date()
        var data = dayHours.getDate() + "/" + dayHours.getMonth() + "/" + dayHours.getFullYear() + " on " + dayHours.getHours() + ":" + dayHours.getMinutes() + ":" + dayHours.getSeconds();
        writeMessageLog = socket.username + " " + message + " at " + data + "\n";
        writeLogStream.write(writeMessageLog);
    });

    //Broadcast the new message
    socket.on('send_message', (data) => {
        //If it's not possible to get socket username we will refresh the page so he can get a new one
        if (socket.username != undefined) {
            if (data.message.length == 0) {
                var message = "Empty message!";
                socket.emit('alert', { message: message });
            } else {
                if (data.message[0] == '@') {//This checks if it is a private message
                    for (var i = 0; i < data.message.length; i++) {
                        if (data.message[i] == ':') {//Check if there is ':' so that we know it is a message
                            var valid = true;
                            break;
                        } else {
                            valid = false;
                        }
                    }
                    if (!valid) {
                        var message = "Please use ':' to send the message!";
                        socket.emit('alert', { message: message });
                    } else {
                        //Split the message to get the message it self and the user name to send to
                        var splited = data.message.split(':');
                        var message = splited[1];
                        if (message.length == 0 || message == ' ') {
                            var message = "Empty message!";
                            socket.emit('alert', { message: message });
                        } else {
                            var toSplit = splited[0];
                            var splitAgain = toSplit.split('@');
                            var sendTo = splitAgain[1];
                            if (sendTo == socket.username) {
                                var message = "You are sending a message to yourself!";
                                socket.emit('alert', { message: message });
                            } else {
                                var found = null;
                                for (var i = 0; i < users.length; i++) {
                                    if (users[i].name == sendTo) {
                                        found = i;
                                        break;
                                    }
                                }
                                if (found == null) {
                                    var message = "No user with that name!";
                                    socket.emit('alert', { message: message });
                                } else {
                                    //Emit that message to the socket of the given username
                                    socket.emit('broadcast_message', { message: message, username: socket.username, importance: 4 });
                                    socket.to(users[found].id).emit('broadcast_message', { message: message, username: socket.username, importance: 4 });

                                    //Write history
                                    writeMessage = socket.username + " sent a private message to " + sendTo + ": " + message + "\n";
                                    writeHistoryStream.write(writeMessage);
                                }
                            }
                        }
                    }
                } else {
                    //If it is not a private message send normal message to all users
                    io.sockets.emit('broadcast_message', { message: data.message, username: socket.username, importance: 3 });
                    //Write history
                    writeMessage = socket.username + ": " + data.message + "\n";
                    writeHistoryStream.write(writeMessage);
                }
            }
        } else {
            socket.emit('reload');
        }
    });

    //Handle user disconect
    socket.on('disconnect', function () {
        //If it's not possible to get socket username we will refresh the page so he can get a new one
        if (socket.username != undefined) {
            //Let all users know someone has left the chat
            var message = "Has left the chat!";
            io.sockets.emit('broadcast_message', { message: message, username: socket.username, importance: 1 });
            //Remove that user from the users and connections array
            users.splice(connections.indexOf(socket.username), 1);
            connections.splice(connections.indexOf(socket.username), 1);
            //If the ammount of users on the chat is 0 we will delete all the images
            if (connections.length == 0) {
                rimraf.sync(imgDir + '/*');
            }
            //Emit connected to 'refresh' the current user list
            io.emit('connected', { users: connections });
            //History
            writeMessage = socket.username + " " + message + "\n";
            writeHistoryStream.write(writeMessage);
            //Log
            var dayHours = new Date()
            var data = dayHours.getDate() + "/" + dayHours.getMonth() + "/" + dayHours.getFullYear() + " on " + dayHours.getHours() + ":" + dayHours.getMinutes() + ":" + dayHours.getSeconds();
            writeMessageLog = socket.username + " " + message + " at " + data + "\n";
            writeLogStream.write(writeMessageLog);
        } else {
            socket.emit('reload');
        }
    });

    //Handle change name
    socket.on('change_name', (data) => {
        //If it's not possible to get socket username we will refresh the page so he can get a new one
        if (socket.username != undefined) {
            //Get the new name and split the string to get new name and uuid
            var newName = data.newName;
            var splitedName = socket.username.split('+');//Split on '+'
            //If the new name is the same alert the user
            if (splitedName[0] == newName) {
                var message = "This is already your name!"
                socket.emit('alert', { message: message });
            } else {
                //Loop users array to find a user with the current socket name
                for (var x = 0; x < users.length; x++) {
                    if (users[x].name == socket.username) {
                        var changeName = x;
                    }
                }
                //Change the name on the arrays
                splitedName[0] = newName;
                var previousName = socket.username;
                socket.username = splitedName[0].concat(' +', splitedName[1]);
                connections[changeName] = socket.username;

                //Alert current user of name change
                users[changeName].name = socket.username;
                var message = "You changed you name to: " + socket.username;
                socket.emit('broadcast_message', { message: message, username: socket.username, importance: 1 });

                //Alert other users of name change
                var message = "Changed his username to " + socket.username;
                socket.broadcast.emit('broadcast_message', { message: message, username: previousName, importance: 1 });
                io.emit('connected', { users: connections, username: socket.username });

                //Write history
                writeMessage = previousName + " " + message + "\n";
                writeHistoryStream.write(writeMessage);
            }
        } else {
            socket.emit('reload');
        }
    });

    //Broadcast image
    socket.on('image_upload', (data) => {
        if (socket.username != undefined) {
            io.emit('broadcast_image', { img: data.img, username: socket.username });
            //Image to base64 to store as string
            var img64 = base64Img.base64Sync('./public/images/' + data.img);
            //Write history
            writeMessage = socket.username + " sent the image: " + img64 + "\n";
            writeHistoryStream.write(writeMessage);
        } else {
            //If the username is undefined and if multer does upload image we will delete it because there is no point in having her on server
            if (fs.existsSync('./public/images/' + data.img)) {
                fs.unlinkSync('./public/images/' + data.img);
            }
            socket.emit('reload');
        }
    });

    //Handle alert message event
    socket.on('alert_message', (data) => {
        socket.emit('alert', { message: data.message });
    });

});