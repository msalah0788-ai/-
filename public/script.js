const socket = io();
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

let username = prompt('ما اسمك؟') || 'مجهول';

socket.on('connect', () => {
    addMessage('تم الاتصال', 'system');
});

socket.on('previous messages', (msgs) => {
    msgs.forEach(msg => {
        addMessage(`${msg.username}: ${msg.text}`, 'other');
    });
});

socket.on('new message', (msg) => {
    addMessage(`${msg.username}: ${msg.text}`, 'other');
});

function addMessage(text, type) {
    const msgElement = document.createElement('div');
    msgElement.textContent = text;
    msgElement.style.margin = '5px';
    msgElement.style.padding = '10px';
    msgElement.style.background = type === 'system' ? '#eee' : '#e0ffe0';
    msgElement.style.borderRadius = '5px';
    messagesDiv.appendChild(msgElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendMessage() {
    const text = messageInput.value;
    if (text) {
        socket.emit('send message', {
            username: username,
            text: text
        });
        addMessage(`أنت: ${text}`, 'me');
        messageInput.value = '';
    }
}

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
