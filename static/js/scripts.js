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
            appendMessage(userMessage, 'user');  // Display user message without characters initially
            $('#user-message').val('');

            showTypingIndicator();

            var startTime = new Date().getTime();  // Start time measurement

            $.ajax({
                url: '/chat',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ message: userMessage, assistant: selectedAssistant }),
                success: function(response) {
                    var endTime = new Date().getTime();  // End time measurement
                    var totalTime = (endTime - startTime) / 1000;  // Total time in seconds

                    console.log("Response from server: ", response);  // Debugging step
                    var aiMessage = response.message;
                    var audioPath = response.audio_path;
                    var assistantCharacters = response.assistant_characters;
                    var serverResponseTime = response.response_time;
                    var backendCharsPerSecond = response.backend_chars_per_second;

                    // Calculate frontend characters per second
                    var frontendCharsPerSecond = assistantCharacters / totalTime;

                    hideTypingIndicator();
                    appendMessage(aiMessage, 'ai', audioPath, assistantCharacters, totalTime, frontendCharsPerSecond, backendCharsPerSecond);
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

    function appendMessage(message, sender, audioPath = null, characters = null, totalTime = null, frontendCharsPerSecond = null, backendCharsPerSecond = null) {
        var messageElement = $('<div class="message card-panel"></div>').text(message);
        if (characters !== null) {
            var characterElement = $('<div class="character-count" style="font-size: 0.8em; color: darkgrey;"></div>').text(`Characters: ${characters}`);
            messageElement.append(characterElement);
        }
        if (totalTime !== null) {
            var totalTimeElement = $('<div class="total-time" style="font-size: 0.8em; color: darkgrey;"></div>').text(`Total Time: ${totalTime.toFixed(2)}s`);
            messageElement.append(totalTimeElement);
        }
        if (frontendCharsPerSecond !== null) {
            var frontendCharsPerSecondElement = $('<div class="frontend-chars-per-second" style="font-size: 0.8em; color: darkgrey;"></div>').text(`Frontend Chars/Sec: ${frontendCharsPerSecond.toFixed(2)}`);
            messageElement.append(frontendCharsPerSecondElement);
        }
        if (backendCharsPerSecond !== null) {
            var backendCharsPerSecondElement = $('<div class="backend-chars-per-second" style="font-size: 0.8em; color: darkgrey;"></div>').text(`Backend Chars/Sec: ${backendCharsPerSecond.toFixed(2)}`);
            messageElement.append(backendCharsPerSecondElement);
        }

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
