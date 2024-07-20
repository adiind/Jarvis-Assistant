from flask import Flask, request, jsonify, render_template, send_file, session
from openai import OpenAI
from pathlib import Path
import os
import time
from io import BytesIO
import json

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Secure secret key

# Initialize OpenAI
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    raise ValueError("No OPENAI_API_KEY found in environment variables")
OpenAI.api_key = OPENAI_API_KEY
# Initialize OpenAI
client = OpenAI()

# Define assistants with corresponding voice models
assistants = {
    "alloy": {
        "id": None,  # Assistant ID will be generated dynamically
        "instructions": "You are Alloy, a helpful and informative AI assistant.",
        "voice": "alloy"
    },
    "echo": {
        "id": None,
        "instructions": "You are Echo, a concise and efficient AI assistant.",
        "voice": "echo"
    },
    "fable": {
        "id": None,
        "instructions": "You are Fable, a creative and imaginative AI assistant.",
        "voice": "fable"
    },
    "onyx": {
        "id": None,
        "instructions": "You are Onyx, a sophisticated and insightful AI assistant.",
        "voice": "onyx"
    },
    "nova": {
        "id": None,
        "instructions": "You are Nova, a friendly and approachable AI assistant.",
        "voice": "nova"
    },
    "shimmer": {
        "id": None,
        "instructions": "You are Shimmer, a cheerful and optimistic AI assistant.",
        "voice": "shimmer"
    }
}

# In-memory storage for conversation history (Simplified - not persistent)
conversation_history = {}

# Helper Functions
def get_assistant(assistant_name):
    assistant_info = assistants.get(assistant_name)
    if not assistant_info:
        raise ValueError(f"No assistant found with the name '{assistant_name}'")

    # Create assistant if it doesn't exist
    if assistant_info["id"] is None:
        assistant = client.beta.assistants.create(
            name=assistant_name.capitalize(),
            instructions=assistant_info["instructions"],
            model="gpt-4o-mini",
        )
        assistant_info["id"] = assistant.id

    return assistant_info

def wait_on_run(run, thread):
    while run.status == "queued" or run.status == "in_progress":
        run = client.beta.threads.runs.retrieve(
            thread_id=thread,
            run_id=run.id,
        )
        time.sleep(0.5)
    return run

# Routes
@app.route('/')
def index():
    return render_template('index.html')

def count_words(text):
    return len(text)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message')
    assistant_name = data.get('assistant', 'alloy')  # Default to Alloy

    # Get assistant and thread
    assistant_info = get_assistant(assistant_name)
    thread_id = session.get('thread_id')

    if not thread_id:
        thread = client.beta.threads.create()
        session['thread_id'] = thread.id
        conversation_history[thread.id] = []
        thread_id = thread.id
     # Start the timer
    start_time = time.time()
    # Add user message to history
    conversation_history[thread_id].append({"role": "user", "content": user_message})

    # Add user message to thread
    client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=user_message
    )

   

    # Create a run
    run = client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=assistant_info['id']
    )

    # Wait for run completion
    run = wait_on_run(run, thread_id)

    # End the timer
    end_time = time.time()


    # Calculate response time
    response_time = end_time - start_time

    # Get assistant's message
    messages = client.beta.threads.messages.list(thread_id=thread_id)
    assistant_message = next(
        block.text.value for msg in messages if msg.role == 'assistant'
        for block in msg.content if block.type == 'text'
    )

    # Add assistant message to history
    conversation_history[thread_id].append({"role": "assistant", "content": assistant_message})
    
    user_tokens = count_words(user_message)
    assistant_characters = count_words(assistant_message)
    backend_chars_per_second = assistant_characters / response_time

    # Generate and cache speech audio
    speech_file_path = generate_speech(assistant_message, assistant_info['voice'], thread_id)

    return jsonify({
        'message': assistant_message,
        'audio_path': speech_file_path,
        'assistant_characters': assistant_characters,
        'response_time': response_time,
        'backend_chars_per_second': backend_chars_per_second
    })
@app.route('/speech/<thread_id>/<filename>')
def get_speech(thread_id, filename):
    return send_file(f"speech_cache/{thread_id}/{filename}", mimetype="audio/mpeg")

@app.route('/clear_chat', methods=['POST'])
def clear_chat():
    session.pop('thread_id', None)
    return jsonify({'status': 'success'})

def generate_speech(text, voice, thread_id):
    speech_file_name = f"{hash(text)}.mp3"
    speech_file_path = Path(os.getcwd()) / "speech_cache" / thread_id / speech_file_name
    os.makedirs(speech_file_path.parent, exist_ok=True)

    if not speech_file_path.exists():
        response = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
        )
        response.stream_to_file(speech_file_path)
    return f"/speech/{thread_id}/{speech_file_name}"

if __name__ == "__main__":
    app.run(debug=True)