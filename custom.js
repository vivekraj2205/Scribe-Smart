document.addEventListener('DOMContentLoaded', function() {

    // Clear local storage when the page is loaded
    localStorage.clear();

    let recognition; // Recognition object
    let mode = 'Idle'; // Mode of the editor


    let editMode = false;
    let editBox = -1;
    let replaceMode = false;
    let currentIndex = 0;

    // Function to read text aloud using text-to-speech
    function speakText(text) {
        const speechSynthesis = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
    }

    async function startRecording(index) {
        const response = await fetch('/starttrans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
    
        if (!response.ok) {
            throw new Error('Failed to start transcription');
        }
    
        const reader = response.body.getReader();
        let transcription = '';
    
        while (true) {
            const { value, done } = await reader.read();
            const text = new TextDecoder().decode(value);
    
            if (text.includes('stop over finish')) {
                console.log('Transcription stopped by user');
                const fullTranscription = document.getElementById(`ans-${index}`).textContent.trim();
                speakText(fullTranscription);
                break;
            }
    
            const cleanedText = text.replace('select question', '').trim();
            transcription += cleanedText + ' ';
    
            document.getElementById(`ans-${index}`).textContent += transcription;
            transcription = "";
    
            if (done) {
                mode = "Idle";
                document.getElementById(`status-ind`).innerHTML = "Status: " +  mode;
    
                console.log('Transcription stream ended');
                break;
            }
        }
    }

    function stopRecognition() {
        recognition.stop();
    }

    function listenForSpeech() {
        recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;

        recognition.onresult = function(event) {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();

            if (transcript.includes('select question')) {
                var questionNumber = transcript.split('select question ')[1];
                if (questionNumber == 'one.') {
                    questionNumber = 1;
                }
                const index = parseInt(questionNumber, 10) - 1;
                if (index >= 0 && index < questions.length) {
                    const ansBox = document.getElementById(`question-${index}`);
                    mode = 'Answering Question ' + (index + 1);
                    document.getElementById(`status-ind`).innerHTML = "Status: " +  mode;

                    ansBox.scrollIntoView();
                    startRecording(index);
                }
            }
            if (transcript.includes("edit question")) {
                currentIndex = 0;
                var questionNumber = transcript.split('edit question ')[1];
                if (questionNumber == 'one.') {
                    questionNumber = 1;
                }
                const index = parseInt(questionNumber, 10) - 1;
            
                const contentDiv = document.getElementById(`ans-${index}`);
                mode = 'Editing Question ' + (index + 1);
                document.getElementById(`status-ind`).innerHTML = "Status: " + mode;
            
                if (contentDiv) {
                    // Set focus on the contenteditable div
                    contentDiv.focus();
            
                    // Collapse the selection to the start of the contenteditable div
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(contentDiv);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
            
                    // Set the edit mode and edit box index
                    editMode = true;
                    editBox = index;
                } else {
                    console.error(`Contenteditable div with id 'ans-${index}' not found`);
                }
            }
            

            if (editMode) {
                if (transcript.includes("delete all")) {
                    const textarea = document.getElementById(`ans-${editBox}`);
                    textarea.innerHTML = "";
                    saveChangesAndExitEdit();
                }

                if (transcript.includes("select this sentence")) {
                    selectSentence();
                }

                if (transcript.includes("add text")) {
                    addText();
                }

                if (transcript.includes("delete sentence")) {
                    deleteSentence();
                }
               
                if (transcript.includes("highlight text")) {
                    highlight();
                }
                if (transcript.includes("save and exit")) {
                    saveChangesAndExitEdit();
                }
               
                if (transcript.includes("move cursor next")) {
                    moveCursorNext();
                }

                if (transcript.includes("move cursor back")) {
                    moveCursorBack();
                }
               
                if (transcript.includes("stop over finish")) {
                    stopRecognition();
                    console.log("Recording stopped.");
                }
            }
        }

        recognition.onend = function() {
            if (editMode) {
                recognition.start();
            }
        }

        recognition.start();
    }

    function selectSentence() {
        const div = document.getElementById(`ans-${editBox}`);
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(div);
    
        const startIndex = div.textContent.lastIndexOf('.', selection.anchorOffset) + 1;
        const endIndex = div.textContent.indexOf('.', selection.focusOffset) + 1;
    
        range.setStart(div.firstChild, startIndex);
        range.setEnd(div.firstChild, endIndex);
        selection.removeAllRanges();
        selection.addRange(range);
        div.focus();
    }
    
   async function addText() {
    const div = document.getElementById(`ans-${editBox}`);
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const cursorPosition = range.startOffset;

    const response = await fetch('/starttrans', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });

    if (!response.ok) {
        throw new Error('Failed to start transcription');
    }

    const reader = response.body.getReader();
    let transcription = '';

    while (true) {
        const { value, done } = await reader.read();
        const text = new TextDecoder().decode(value);

        if (text.includes('stop over finish')) {
            break;
        }

        const cleanedText = text.replace('select question', '').trim();
        transcription += cleanedText + ' ';

        // Insert the recognized text at the cursor position
        const textNode = document.createTextNode(transcription);
        range.deleteContents();
        range.insertNode(textNode);

        // Move the cursor to the end of the inserted text
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        transcription = "";

        if (done) {
            console.log('Transcription stream ended');
            mode = "Idle";
            document.getElementById(`status-ind`).innerHTML = "Status: " +  mode;
            break;
        }
    }
}

    
    // Function to set cursor position within a contenteditable div
    function setCaretPosition(element, position) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(element.firstChild, position);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        element.focus();
    }
    
    
    function deleteSentence() {
        const div = document.getElementById(`ans-${editBox}`);
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();
    }
    function saveChangesAndExitEdit() {
        const div = document.getElementById(`ans-${editBox}`);
        const editedResponse = div.textContent;
        localStorage.setItem(`response-${editBox}`, editedResponse);
        console.log("Changes saved.");
        editMode = false;
        editBox = -1;
    
        // Update the mode indicator text to "You can record now"
        const modeIndicator = document.getElementById(`mode-indicator-${editBox}`);
        if (modeIndicator) {
            modeIndicator.textContent = "You can record now";
        } else {
            console.error(`Mode indicator with id 'mode-indicator-${editBox}' not found`);
        }
    }
    
    

    function highlight() {
        const div = document.getElementById(`ans-${editBox}`);
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        const newNode = document.createElement('strong');
        newNode.textContent = selectedText;
        range.deleteContents();
        range.insertNode(newNode);
    }
    function moveCursorNext() {
        const div = document.getElementById(`ans-${editBox}`);
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const nextPeriodIndex = div.textContent.indexOf('.', range.endOffset);
    
        if (nextPeriodIndex !== -1) {
            const nextSentenceStart = nextPeriodIndex + 1;
            range.setStart(div.firstChild, nextSentenceStart);
            range.setEnd(div.firstChild, nextSentenceStart);
            selection.removeAllRanges();
            selection.addRange(range);
            div.focus();
        } else {
            console.log("No next sentence found.");
        }
    }
    
    function moveCursorBack() {
        const div = document.getElementById(`ans-${editBox}`);
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const prevPeriodIndex = div.textContent.lastIndexOf('.', range.startOffset);
    
        if (prevPeriodIndex !== -1) {
            const prevSentenceStart = div.textContent.lastIndexOf('.', prevPeriodIndex - 1) + 1;
            range.setStart(div.firstChild, prevSentenceStart);
            range.setEnd(div.firstChild, prevSentenceStart);
            selection.removeAllRanges();
            selection.addRange(range);
            div.focus();
        } else {
            console.log("No previous sentence found.");
        }
    }

    const questionsDiv = document.getElementById('questions');
    const urlParams = new URLSearchParams(window.location.search);
    const questions = JSON.parse(urlParams.get('file'));

    if (questions == null) {
        window.location.href = "login.html";
    }

    questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.classList.add('question');

        const questionHeading = document.createElement('h2');
        questionHeading.classList.add('question-heading');
        questionHeading.id = `question-${index}`;
        questionHeading.textContent = 'Question ' + (index + 1);
        questionElement.appendChild(questionHeading);

        const questionPara = document.createElement('p');
        questionPara.classList.add('question-text');
        questionPara.textContent = question.trim();
        questionElement.appendChild(questionPara);

        // Create a new container for buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('button-container');
        questionElement.appendChild(buttonContainer);

        const speakButton = document.createElement('button');
        speakButton.classList.add('speak-button');
        speakButton.innerHTML = '<i class="fas fa-volume-up"></i> Speak';
        buttonContainer.appendChild(speakButton);

        const readButton = document.createElement('button');
        readButton.classList.add('read-button');
        readButton.textContent = 'Read Text';
        buttonContainer.appendChild(readButton);


        // Add event listeners for both buttons
        speakButton.addEventListener('click', function() {
            const questionText = questionPara.textContent;
            speakText(questionText);
        });

        readButton.addEventListener('click', function() {
            const textToRead = document.getElementById(`ans-${index}`).textContent.trim();
            speakText(textToRead);
        });

        const recordingText = document.createElement('div');
        recordingText.id = `ans-${index}`;
        recordingText.contentEditable = true; // Make the div editable
        recordingText.classList.add('recording-text');
        recordingText.placeholder = 'Recording notes...';
        // Retrieve the previous response from localStorage, if available
        const previousResponse = localStorage.getItem(`response-${index}`);
        console.log(previousResponse);

        if (previousResponse) {
            recordingText.innerHTML = previousResponse; // Use innerHTML to set the content
        }
        questionElement.appendChild(recordingText);

        questionsDiv.appendChild(questionElement);

    });
    function downloadPDF() {
        const doc = new jsPDF();
        const questionsDiv = document.getElementById('questions');
        const questions = Array.from(questionsDiv.getElementsByClassName('question'));
    
        let yPos = 10; // Initialize y position for text
    
        questions.forEach((question, index) => {
            const questionHeading = question.querySelector('.question-heading').textContent;
            const questionText = question.querySelector('.question-text').textContent;
            const answerText = question.querySelector('.recording-text').textContent;
            var username = document.cookie.split('=')[1];
    
            doc.setFontSize(12);
            if (index === 0) { 
                const university = 'Amrita Vishwa Vidyapeetham';
                const department = 'Department of Computer Science Semester Exam';
                const pageWidth = doc.internal.pageSize.width;
    
                const universityTextWidth = doc.getStringUnitWidth(university) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                const departmentTextWidth = doc.getStringUnitWidth(department) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    
                const universityTextPosition = (pageWidth - universityTextWidth) / 2;
                const departmentTextPosition = (pageWidth - departmentTextWidth) / 2;
    
                doc.text(university, universityTextPosition, yPos);
                yPos += 10;
                doc.text(department, departmentTextPosition, yPos);
                yPos += 10;
                doc.text(username, 10, yPos);
                yPos += 10;
            }
    
            const content = `Question ${index + 1}\n${questionText}\n\nAnswer:\n${answerText}\n\n`;
            doc.text(content, 10, yPos);
    
            yPos += 80; 
    
            if (yPos >= doc.internal.pageSize.height) {
                doc.addPage(); // Add a new page
                yPos = 10; // Reset y position for the new page
            }
        });
    
        doc.save('questions_and_answers.pdf');
    }


    const submitButton = document.createElement('button');
    submitButton.classList.add('submit-button');
    submitButton.textContent = 'Submit';
    document.body.appendChild(submitButton);
    
    submitButton.addEventListener('click', downloadPDF);


    listenForSpeech();
});
