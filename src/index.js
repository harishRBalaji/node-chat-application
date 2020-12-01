const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } =require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)      // anyways happens behind the scenes in previous line, however we refactor express setup because of using socket.io
const io = socketio(server)                // now our server supports web sockets

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

// let count = 0

// server (emit) -> client (receive) - countUpdated
// client (emit) -> server (receive) - increment
io.on('connection', (socket) => {         //fires whenever socket.io server gets a new client connection
    console.log('New Websocket connection')   

     socket.on('join', ({ username, room  }, callback) => {
        const { error, user} = addUser({ id: socket.id, username, room }) // socket.id is the id for the connected socket
        if (error) {
            return callback(error)
        }


        socket.join(user.room)  // specific method for server to join a room

        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })     

        callback()
        // socket.emit, io.emit, socket.broadcast.emit
        // io.to.emit, socket.broadcast.to.emit  1. sends to all users in the room, 2. sends to all users except own self in the room

    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed')
        }
        const user = getUser(socket.id)
        // if (user === undefined) {
        //     alert()
        // }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('disconnect', () => {             //use socket.on() instead of io.on() as in listening for connection; to listen for disconnection
        const user = removeUser(socket.id)

        if (user) {                       // checks if valid user in a room even existed in the first place and only then send the disconnect message to room in which the client belonged to
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
        
    })
    
    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${location.latitude},${location.longitude}`) )
        callback()
    })

})  

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})

 // socket.emit('countUpdated', count)  // we use socket.emit() and NOT io.emit() because the latter would mean that we would send the event to ALL CLIENTS WHENEVER A NEW CLIENT JOINS, WHICH IS A WASTE

    // socket.on('increment', () => {
    //     count++
    //     // socket.emit('countUpdated', count)      socket.emit() emits the event to the particular connection (socket)
    //     io.emit('countUpdated', count)          // io.emit() emits the event to all the connections
    // })