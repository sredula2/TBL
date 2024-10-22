let questions = []; // Array to hold all questions
let responses = {}; // Object to hold previous responses by question
let currentQuestionIndex = 0; // Index of the current question
let loggedInUser = ""; // Variable to hold the logged-in user
let correctAnswer = ""; // Variable to hold the correct answer for the current question
const apiUrl = "https://script.google.com/macros/s/AKfycbxmILdxSsS6zlQZMjCQ0esneuMzzyR9Pt7TAAPj8W0isxFn_QcWOAfXTv84IpMFQR8CMQ/exec"; // Replace with your API URL

// Function to fetch activities and populate the dropdown
function fetchActivities() {
    fetch(apiUrl + "?action=getActivities")
        .then(response => response.json())
        .then(data => {
            console.log(data); // Log the response
            const activityDropdown = document.getElementById('activity');
            // Clear previous options
            activityDropdown.innerHTML = ''; 

            // Check if 'activities' exists in the response
            if (data.activities && Array.isArray(data.activities)) {
                // Populate the dropdown with activity options
                data.activities.forEach(activity => {
                    const option = document.createElement('option');
                    option.value = activity; // Set the value of the option
                    option.text = activity;  // Set the display text of the option
                    activityDropdown.add(option); // Add the option to the dropdown
                });
            } else {
                console.error('Activities not found in the response.');
            }
        })
        .catch(error => console.error('Error fetching activities:', error));
}


// Call fetchActivities on page load
window.onload = function() {
    fetchActivities();
};

// Function to handle login requests
function sendLoginRequest() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const activity = document.getElementById('activity').value; // Get selected activity

    fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password, activity })
    })
    .then(response => response.text())
    .then(data => {
        document.getElementById('loginResult').innerText = data;

        if (data.includes("successful")) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('loginResult').style.color = 'black';
            loggedInUser = username;

            sendGetRequest(username); // Fetch questions and responses for the logged-in user
        } else {
            document.getElementById('loginResult').style.color = 'red';
        }
    })
    .catch(error => console.error('Error:', error));
}

// Function to fetch questions and previous responses
// Function to fetch questions and previous responses
function sendGetRequest(username) {
    showLoading(); // Show loading indicator before fetching questions

    fetch(`${apiUrl}?username=${username}`)
    .then(response => response.json())
    .then(data => {
        questions = data.questions;
        responses = data.responses.reduce((acc, row) => {
            const questionNumber = row[1];
            if (!acc[questionNumber]) acc[questionNumber] = [];
            acc[questionNumber].push({ choice: row[2], points: row[3] });
            return acc;
        }, {});

        currentQuestionIndex = 0;
        document.getElementById('getResult').style.display = 'block';
        createTabs(); // Create tabs for each question
        displayCurrentQuestion(); // Display the first question
    })
    .catch(error => console.error('Error:', error))
    .finally(() => {
        hideLoading(); // Hide loading indicator once questions are loaded
    });
}


// Function to create tabs for each question
function createTabs() {
    const tabContainer = document.getElementById('tabContainer');
    tabContainer.innerHTML = ''; // Clear existing tabs

    questions.forEach((question, index) => {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.innerText = `Question ${index + 1}`;
        tab.onclick = () => {
            currentQuestionIndex = index;
            displayCurrentQuestion();
        };
        tabContainer.appendChild(tab);
    });

    // Activate the first tab
    if (tabContainer.firstChild) {
        tabContainer.firstChild.classList.add('active');
    }
}

// Function to show loading indicator
function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'flex';
}

// Function to hide loading indicator
function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

// Function to display the current question and apply previous response styles
function displayCurrentQuestion() {
    console.log(responses);
    showLoading(); // Show loading indicator
    
    setTimeout(() => { // Slight delay to simulate fetching data
        if (currentQuestionIndex >= 0 && currentQuestionIndex < questions.length) {
            const question = questions[currentQuestionIndex];
            correctAnswer = question[6];
            const questionNumber = currentQuestionIndex + 1;
            let output = `<div class="question">${question[0]}</div><div class="choices">`;

            let hasAnsweredCorrectly = responses[questionNumber]?.some(response => response.points === 1) || false;

            for (let i = 1; i <= 4; i++) {
                const choiceLetter = String.fromCharCode(64 + i);
                const choiceText = question[i];

                if (choiceText) {
                    let choiceClass = "";
                    let disabled = false;

                    const isCorrect = responses[questionNumber]?.some(response => response.choice === choiceLetter && response.points === 1);
                    const isIncorrect = responses[questionNumber]?.some(response => response.choice === choiceLetter && response.points === 0);

                    if (isCorrect) {
                        choiceClass = "correct";
                        disabled = true;
                    } else if (isIncorrect) {
                        choiceClass = "incorrect";
                        disabled = true;
                    }

                    output += ` 
                        <div>
                            <input type="radio" name="question" value="${choiceLetter}" id="choice${i}" ${disabled ? "disabled" : ""}>
                            <label for="choice${i}" class="${choiceClass}">${choiceText}</label>
                        </div>`;
                }
            }

            // Always apply btn-success class to the Submit Answer button
            output += `</div><button type="button" class="btn btn-success" id="submitBtn" onclick="submitResponse()" ${hasAnsweredCorrectly ? "disabled" : ""}>Submit Answer</button>`;
            document.getElementById('questionContainer').innerHTML = output;

            // Highlight the active tab
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach((tab, index) => {
                tab.classList.toggle('active', index === currentQuestionIndex);
            });

            // Disable the submit button initially
            document.getElementById('submitBtn').disabled = true;

            // Add event listeners to enable submit button when a choice is made
            document.querySelectorAll('input[name="question"]').forEach(input => {
                input.addEventListener('change', () => {
                    document.getElementById('submitBtn').disabled = false;
                });
            });

            hideLoading(); // Hide loading indicator once question is displayed
        } else {
            document.getElementById('questionContainer').innerText = "No questions available.";
            hideLoading();
        }
    }, 500); // Adjust delay as needed
}

// Function to submit the selected answer to the responses tab
function submitResponse() {
    const selectedChoice = document.querySelector('input[type="radio"]:checked');
    if (selectedChoice) {
        const response = selectedChoice.value;
        let points = 0;

        const questionNumber = currentQuestionIndex + 1;

        // Immediately disable the selected radio button and the submit button
        selectedChoice.disabled = true;
        document.getElementById('submitBtn').disabled = true;

        // Determine points and apply styles
        if (response === correctAnswer) {
            points = 1;
            selectedChoice.nextElementSibling.classList.add('correct');
            changeTabColorToGreen(); // Change tab color to green
        } else {
            selectedChoice.nextElementSibling.classList.add('incorrect');
        }

        const currentTime = new Date().toISOString(); // Get current time in ISO format

        // Show loading indicator
        showLoading();

        // Send response to the server
        fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ 
                username: loggedInUser, 
                question_number: questionNumber, 
                choice: response, 
                points,
                timestamp: currentTime // Include the current time
            })
        })
        .then(response => response.text())
        .then(data => {
            console.log("Response submitted:", data);
            if (!responses[questionNumber]) {
                responses[questionNumber] = [];
            }
            responses[questionNumber].push({ choice: response, points });

            // Disable the submit button after submission
            document.getElementById('submitBtn').disabled = true;

            // Immediately mark the answer before hiding the loading indicator
            if (response === correctAnswer) {
                selectedChoice.nextElementSibling.classList.add('correct');
            } else {
                selectedChoice.nextElementSibling.classList.add('incorrect');
            }
        })
        .catch(error => {
            console.error('Error submitting response:', error);
            alert("There was an error submitting your response. Please try again.");
        })
        .finally(() => {
            hideLoading(); // Hide loading indicator once submission is done
        });
    } else {
        alert("Please select an answer before submitting.");
    }
}



// Function to change the color of the tab to green once the question is answered correctly
function changeTabColorToGreen() {
    const tabs = document.querySelectorAll('.tab');
    tabs[currentQuestionIndex].style.backgroundColor = '#28a745'; // Bootstrap success color
    tabs[currentQuestionIndex].style.color = 'white'; // Change text color to white
}
