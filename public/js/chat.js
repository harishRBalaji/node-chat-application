const socket = io() //connect to server (client side)

// ----------------------------------------------------------------------------------------------------------------------

// server (emit) -> client (receive) -- acknowledgment --> server
// client (emit) -> server (receive) -- acknowledgment --> client

// -----------------------------------------------------------------------------------------------------------------------

// Elements

const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

// Templates

const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sideBarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options

const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true }) // removes the question mark and has just the attributes

// auto scrolling function

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the new message = offset height + margin
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visible height
    const visibleHeight = $messages.offsetHeight // also the length of the scrollbar

    // Height of messages container (scrollable container height)
    const containerHeight = $messages.scrollHeight

    // how far have I scrolled?
    // scrollTop - distance scrolled from the top, so 0 at the very top and increases as we scroll down and down
    const scrollOffset = $messages.scrollTop + visibleHeight 

    // checks if we are at the bottom or not before the last message was added 
    if (containerHeight - newMessageHeight <= scrollOffset) {
        // at the bottom, so auto scroll
        $messages.scrollTop = $messages.scrollHeight // sets the scrollTop to the full scrollable height, pushing the scrollbar to the bottom
    }
}

socket.on('message', (message) => {
    console.log(message)
    // render messages
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('H:mm')
    })   // second argument - to set the data for Mustache to render
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('locationMessage', (message) => {
    // console.log(locationURL)

    //render maps url

    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('H:mm')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sideBarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()
    // const message = document.querySelector('#chatInput').value
    // disable
    $messageFormButton.setAttribute('disabled', 'disabled')
    const message = e.target.elements.message.value

    //last argument in emit() is for setting up the custom function for sending acknowledgments
    socket.emit('sendMessage', message, (error) => {
        // enable
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''    // clears input area
        $messageFormInput.focus() // brings focus back to the input area

        if (error) {
            return console.log(error)
        }
        console.log('Message Delivered!')
    })
})

$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser.')
    }
    $sendLocationButton.setAttribute('disabled', 'disabled') // disable
    navigator.geolocation.getCurrentPosition((position) => {        //actually an async function, but the api does not support promises as of now, so use old school callback function to get the position
        // console.log(position)
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        // console.log('latitude', latitude, 'longitude', longitude)
        socket.emit('sendLocation', {
            latitude,
            longitude
        }, () => {
            console.log('Location shared!')
            $sendLocationButton.removeAttribute('disabled')
        })
        
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/' // sends the user back to the root page to try again
    }
})

// socket.on('countUpdated', (count) => {
//     console.log('The count has been updated to', count)
// })

// document.querySelector('#increment').addEventListener('click', () => {
//     console.log('clicked!')
//     socket.emit('increment')
// })