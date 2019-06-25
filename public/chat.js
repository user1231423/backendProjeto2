$(function () {
    //make connection
    var socket = io.connect("http://localhost:3000");

    //buttons and inputs
    var message = $("#message");
    var send_message = $("#send_message");
    var chatroom = $("#chatroom");
    var userList = $("#userList");
    var changeName = $('#change_name');
    var userName = $('#new_name');
    var image = $('#image');
    var users = $('#users');
    var chat = $('#chat');

    //Emits connection
    socket.emit('connected');

    socket.on('reload', function () {
        location.reload();
    });

    //Handles connection
    socket.on('connected', function (data) {
        userList.empty();
        for (var i = 0; i < data.users.length; i++) {
            userList.append($('<tr>').append('<p id="userName" style="font-weight: bold" class="cursor-pointer">' + data.users[i] + "</p>"));
        }
    });

    //Emit message
    send_message.click(function () {
        if (message.val().length == 0) {
            alert("Empty message field!");
        } else {
            socket.emit('send_message', { message: message.val() })
        }
    });

    //Listen on new_message
    socket.on('broadcast_message', function (data) {
        if (data.importance == 1) {
            chatroom.append($('<tr bgcolor="#ff9999" class="cursor-pointer">').append('<p style="font-weight: bold">' + data.username + ": </p>" + '<p>' + data.message + '</p>'));
        } else if (data.importance == 2) {
            chatroom.append($('<tr bgcolor="#b3c6ff" class="cursor-pointer">').append('<p style="font-weight: bold">' + data.username + ": </p>" + '<p>' + data.message + '</p>'));
        } else if (data.importance == 3) {
            chatroom.append($('<tr bgcolor="#f2f2f2" class="cursor-pointer">').append('<p style="font-weight: bold">' + data.username + ": </p>" + '<p>' + data.message + '</p>'));
        }else if(data.importance == 4){
            chatroom.append($('<tr bgcolor="#80ffbf" class="cursor-pointer">').append('<p style="font-weight: bold">' + data.username + ": </p>" + '<p>' + data.message + '</p>'));
        } else {
            chatroom.append($('<tr scope="row" class="cursor-pointer">').append('<p style="font-weight: bold">' + data.username + ": </p>" + '<p>' + data.message + '</p>'));
        }
        message.val('');
    });

    //Emite name change
    changeName.click(function () {
        if (userName.val().length == 0) {
            alert("Name field empty!");
        } else {
            socket.emit('change_name', { newName: userName.val() })
        }
        userName.val('');
    });

    //Handle image uploads
    image.change(function (e) {
        e.preventDefault();
        var file = e.target.files[0];
        var formData = new FormData();
        formData.append('image', file);
        $.ajax({
            type: "POST",
            url: "/upload",
            data: formData,
            processData: false,
            contentType: false,
            success: function (res) {
                socket.emit('image_upload', { img: res.file })
            },
            error: function (res) {
                console.log(res.responseText);
                socket.emit('alert_message', { message: res.responseText })
            }
        });
    });

    //Alerts for user
    socket.on('alert', function (data) {
        alert(data.message);
    });

    //Listen on new_message
    socket.on('broadcast_image', function (data) {
        imgSrc = "./images/" + data.img;
        chatroom.append($('<tr scope="row" class="cursor-pointer">').append('<p style="font-weight: bold">' + data.username + ": </p>" + '<img style="max-height: 5rem; max-width: 5rem" src=' + imgSrc +'>'));
    });

    //Fill message input field scripts
    users.on("click", "tr", function(e) {
        message.val('@' + $(this).text() + ': ');
    });

    chat.on("click", "tr", function(e) {
        var splited = $(this).text().split(':');
        message.val('@' + splited[0] + ': ');
    });
});