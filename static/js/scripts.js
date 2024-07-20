$(document).ready(function() {
    let selectedAssistant = "alloy";  // Default assistant

    $('#send-btn').click(function() {
        sendMessage();
    });

    $('#new-chat-btn').click(function() {
        clearChat();
    });

    $('#user-message').keypress(function(e) {
        if (e.which == 13) {  // Enter key pressed
            sendMessage();
        }
    });

    $('.character-btn').click(function() {
        $('.character-btn').removeClass('selected');
        selectedAssistant = $(this).data('assistant');
        $(this).addClass('selected');
    });

    function sendMessage() {
        var userMessage = $('#user-message').val();
        if (userMessage.trim() !== '') {
            appendMessage(userMessage, 'user');
            $('#user-message').val('');

            showTypingIndicator();

            $.ajax({
                url: '/chat',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ message: userMessage, assistant: selectedAssistant }),
                success: function(response) {
                    var aiMessage = response.message;
                    var audioPath = response.audio_path;
                    hideTypingIndicator();
                    appendMessage(aiMessage, 'ai', audioPath);
                    $('#chat-box').scrollTop($('#chat-box')[0].scrollHeight);
                },
                error: function() {
                    hideTypingIndicator();
                    appendMessage('Error: Unable to get response from AI.', 'ai');
                    $('#chat-box').scrollTop($('#chat-box')[0].scrollHeight);
                }
            });
        }
    }

    function appendMessage(message, sender, audioPath = null) {
        var messageElement = $('<div class="message card-panel"></div>').text(message);
        if (sender === 'user') {
            messageElement.addClass('user-message');
        } else {
            messageElement.addClass('ai-message');
            if (audioPath) {
                var speechButton = $('<button class="speaker-button"><i class="fas fa-volume-up"></i></button>');
                speechButton.click(function() {
                    playSpeech(audioPath);
                });
                messageElement.append(speechButton);
            }
        }
        $('#chat-box').append(messageElement);
        $('#chat-box').scrollTop($('#chat-box')[0].scrollHeight);
    }

    function showTypingIndicator() {
        var typingIndicator = $('<div class="typing-indicator card-panel grey lighten-2">Typing...</div>');
        $('#chat-box').append(typingIndicator);
        $('#chat-box').scrollTop($('#chat-box')[0].scrollHeight);
    }

    function hideTypingIndicator() {
        $('.typing-indicator').remove();
    }

    function playSpeech(audioPath) {
        var audio = new Audio(audioPath);
        audio.play();
    }

    function clearChat() {
        $.ajax({
            url: '/clear_chat',
            type: 'POST',
            success: function(response) {
                $('#chat-box').empty();
                M.toast({html: 'Chat cleared!', classes: 'rounded'});
            },
            error: function() {
                console.error('Error clearing chat.');
            }
        });
    }
});