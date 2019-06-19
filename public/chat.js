$(function() {
    //make connection
    var socket = io.connect("http://localhost:3000");

    //buttons and inputs
    var message = $("#message");
    var send_message = $("#send_message");
    var chatroom = $("#chatroom");
    var userList = $("#userList");
    var changeName = $('#change_name');
    var userName = $('#new_name');

    //Emits connection
    socket.emit('connected');

    //Handles connection
    socket.on('connected', function(data) {
        userList.empty();
        for (var i = 0; i < data.users.length; i++) {
            userList.append($('<tr>').append('<p style="font-weight: bold">' + data.users[i] + ": </p>"));
        }
    });

    //Emit message
    send_message.click(function() {
        if (message.val().length == 0) {
            alert("Empty message field!");
        } else {
            socket.emit('send_message', { message: message.val() })
        }
    });

    //Listen on new_message
    socket.on('broadcast_message', function(data) {
        if (data.importance == 1) {
            chatroom.append($('<tr bgcolor="#ff9999">').append('<p style="font-weight: bold">' + data.username + ": </p>" + '<p>' + data.message + '</p>'));
        } else if (data.importance == 2) {
            chatroom.append($('<tr bgcolor="#b3c6ff">').append('<p style="font-weight: bold">' + data.username + ": </p>" + '<p>' + data.message + '</p>'));
        } else if (data.importance == 3) {
            chatroom.append($('<tr bgcolor="#f2f2f2">').append('<p style="font-weight: bold">' + data.username + ": </p>" + '<p>' + data.message + '</p>'));
        } else {
            chatroom.append($('<tr scope="row">').append('<p style="font-weight: bold">' + data.username + ": </p>" + '<p>' + data.message + '</p>'));
        }
        message.val('');
    });

    //Emite name change
    changeName.click(function() {
        if (userName.val().length == 0) {
            alert("Name field empty!");
        } else {
            socket.emit('change_name', { newName: userName.val() })
        }
        userName.val('');
    });

    socket.on('alert', function(data) {
        alert(data.message);
    });
});