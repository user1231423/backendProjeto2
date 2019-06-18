$(function () {
    //make connection
    var socket = io.connect("http://localhost:3000");

    //buttons and inputs
    var message = $("#message");
    var send_message = $("#send_message");
    var chatroom = $("#chatroom");
    var userList = $("#userList");

    //Emits connection
    socket.emit('connected');

    //Handles connection
    socket.on('connected', function (data) {
        console.log(data.users.length);
        userList.empty();
         for(var i = 0; i < data.users.length ; i++){
            userList.append($('<tr scope="row">').text(data.users[i]));
        } 
    })

    //Emit message
    send_message.click(function () {
        socket.emit('send_message', { message: message.val() })
    })

    //Listen on new_message
    socket.on('broadcast_message', function (data) {
        chatroom.append($('<tr scope="row">').text(data.username + ": " + data.message));
    })
});